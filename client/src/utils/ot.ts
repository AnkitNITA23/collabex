export type OpComponent =
  | { type: 'retain'; len: number }
  | { type: 'insert'; text: string }
  | { type: 'delete'; len: number };

export class TextOperation {
  components: OpComponent[];

  constructor(components: OpComponent[] = []) {
    this.components = components;
  }

  retain(len: number): this {
    if (len <= 0) return this;
    const last = this.components[this.components.length - 1];
    if (last && last.type === 'retain') {
      last.len += len;
    } else {
      this.components.push({ type: 'retain', len });
    }
    return this;
  }

  insert(text: string): this {
    if (!text) return this;
    const last = this.components[this.components.length - 1];
    if (last && last.type === 'insert') {
      last.text += text;
    } else {
      this.components.push({ type: 'insert', text });
    }
    return this;
  }

  delete(len: number): this {
    if (len <= 0) return this;
    const last = this.components[this.components.length - 1];
    if (last && last.type === 'delete') {
      last.len += len;
    } else {
      this.components.push({ type: 'delete', len });
    }
    return this;
  }

  normalize(): this {
    const normal: OpComponent[] = [];
    for (const c of this.components) {
      if (c.type === 'retain' && c.len === 0) continue;
      if (c.type === 'insert' && c.text === '') continue;
      if (c.type === 'delete' && c.len === 0) continue;

      const last = normal[normal.length - 1];
      if (last && last.type === c.type) {
        if (last.type === 'retain' && c.type === 'retain') {
          last.len += c.len;
        } else if (last.type === 'insert' && c.type === 'insert') {
          last.text += c.text;
        } else if (last.type === 'delete' && c.type === 'delete') {
          last.len += c.len;
        }
      } else {
        if (c.type === 'insert') {
          normal.push({ type: 'insert', text: c.text });
        } else {
          normal.push({ type: c.type, len: c.len });
        }
      }
    }
    this.components = normal;
    return this;
  }

  apply(text: string): string {
    let result = '';
    let textIdx = 0;
    for (const c of this.components) {
      if (c.type === 'retain') {
        if (textIdx + c.len > text.length) {
          throw new Error(`Operation retain exceeds text length: ${textIdx + c.len} vs ${text.length}`);
        }
        result += text.slice(textIdx, textIdx + c.len);
        textIdx += c.len;
      } else if (c.type === 'insert') {
        result += c.text;
      } else if (c.type === 'delete') {
        if (textIdx + c.len > text.length) {
          throw new Error(`Operation delete exceeds text length: ${textIdx + c.len} vs ${text.length}`);
        }
        textIdx += c.len;
      }
    }
    if (textIdx < text.length) {
      result += text.slice(textIdx);
    }
    return result;
  }

  toJSON(): OpComponent[] {
    return this.components;
  }

  static fromJSON(json: OpComponent[]): TextOperation {
    return new TextOperation(json);
  }

  clone(): TextOperation {
    return new TextOperation(
      this.components.map(c => (c.type === 'insert' ? { type: 'insert', text: c.text } : { type: c.type, len: c.len }))
    );
  }
}

export function transform(opA: TextOperation, opB: TextOperation, side: 'left' | 'right' = 'left'): [TextOperation, TextOperation] {
  const opAPrime = new TextOperation();
  const opBPrime = new TextOperation();

  const compsA = opA.components;
  const compsB = opB.components;
  let idxA = 0;
  let idxB = 0;
  let compA: OpComponent | null = compsA[0] || null;
  let compB: OpComponent | null = compsB[0] || null;
  let offsetA = 0;
  let offsetB = 0;

  const nextA = () => {
    idxA++;
    compA = compsA[idxA] || null;
    offsetA = 0;
  };
  const nextB = () => {
    idxB++;
    compB = compsB[idxB] || null;
    offsetB = 0;
  };

  while (compA !== null || compB !== null) {
    if (compA && compA.type === 'insert') {
      const textA = compA.text.slice(offsetA);
      if (compB && compB.type === 'insert' && offsetA === 0 && offsetB === 0) {
        const textB = compB.text;
        if (side === 'left') {
          opAPrime.insert(textA);
          opBPrime.retain(textA.length);
          nextA();
        } else {
          opBPrime.insert(textB);
          opAPrime.retain(textB.length);
          nextB();
        }
        continue;
      }
      opAPrime.insert(textA);
      opBPrime.retain(textA.length);
      nextA();
      continue;
    }

    if (compB && compB.type === 'insert') {
      const textB = compB.text.slice(offsetB);
      opBPrime.insert(textB);
      opAPrime.retain(textB.length);
      nextB();
      continue;
    }

    if (compA === null || compB === null) {
      throw new Error(`Operations lengths mismatch! compA: ${JSON.stringify(compA)}, compB: ${JSON.stringify(compB)}`);
    }

    if (compA.type === 'retain' && compB.type === 'retain') {
      const lenA = compA.len - offsetA;
      const lenB = compB.len - offsetB;
      const minLen = Math.min(lenA, lenB);

      opAPrime.retain(minLen);
      opBPrime.retain(minLen);

      offsetA += minLen;
      offsetB += minLen;
      if (offsetA === compA.len) nextA();
      if (offsetB === compB.len) nextB();
      continue;
    }

    if (compA.type === 'delete' && compB.type === 'delete') {
      const lenA = compA.len - offsetA;
      const lenB = compB.len - offsetB;
      const minLen = Math.min(lenA, lenB);

      offsetA += minLen;
      offsetB += minLen;
      if (offsetA === compA.len) nextA();
      if (offsetB === compB.len) nextB();
      continue;
    }

    if (compA.type === 'retain' && compB.type === 'delete') {
      const lenA = compA.len - offsetA;
      const lenB = compB.len - offsetB;
      const minLen = Math.min(lenA, lenB);

      opBPrime.delete(minLen);

      offsetA += minLen;
      offsetB += minLen;
      if (offsetA === compA.len) nextA();
      if (offsetB === compB.len) nextB();
      continue;
    }

    if (compA.type === 'delete' && compB.type === 'retain') {
      const lenA = compA.len - offsetA;
      const lenB = compB.len - offsetB;
      const minLen = Math.min(lenA, lenB);

      opAPrime.delete(minLen);

      offsetA += minLen;
      offsetB += minLen;
      if (offsetA === compA.len) nextA();
      if (offsetB === compB.len) nextB();
      continue;
    }
  }

  return [opAPrime.normalize(), opBPrime.normalize()];
}

export function compose(op1: TextOperation, op2: TextOperation): TextOperation {
  const result = new TextOperation();
  const comps1 = op1.components;
  const comps2 = op2.components;
  let idx1 = 0;
  let idx2 = 0;
  let comp1: OpComponent | null = comps1[0] || null;
  let comp2: OpComponent | null = comps2[0] || null;
  let offset1 = 0;
  let offset2 = 0;

  const next1 = () => {
    idx1++;
    comp1 = comps1[idx1] || null;
    offset1 = 0;
  };
  const next2 = () => {
    idx2++;
    comp2 = comps2[idx2] || null;
    offset2 = 0;
  };

  while (comp1 !== null || comp2 !== null) {
    if (comp1 && comp1.type === 'insert') {
      const text1 = comp1.text.slice(offset1);
      if (comp2 === null) {
        result.insert(text1);
        next1();
        continue;
      }
      if (comp2.type === 'retain') {
        const len2 = comp2.len - offset2;
        const minLen = Math.min(text1.length, len2);
        result.insert(text1.slice(0, minLen));
        offset1 += minLen;
        offset2 += minLen;
        if (offset1 === comp1.text.length) next1();
        if (offset2 === comp2.len) next2();
        continue;
      }
      if (comp2.type === 'delete') {
        const len2 = comp2.len - offset2;
        const minLen = Math.min(text1.length, len2);
        offset1 += minLen;
        offset2 += minLen;
        if (offset1 === comp1.text.length) next1();
        if (offset2 === comp2.len) next2();
        continue;
      }
      if (comp2.type === 'insert') {
        result.insert(comp2.text.slice(offset2));
        next2();
        continue;
      }
    }

    if (comp2 && comp2.type === 'insert') {
      result.insert(comp2.text.slice(offset2));
      next2();
      continue;
    }

    if (comp1 === null) {
      throw new Error('compose: op1 is shorter than op2 is expecting');
    }
    if (comp2 === null) {
      if (comp1.type === 'delete') {
        result.delete(comp1.len - offset1);
        next1();
        continue;
      }
      throw new Error('compose: op1 is longer than op2 is expecting');
    }

    if (comp1.type === 'retain' && comp2.type === 'retain') {
      const len1 = comp1.len - offset1;
      const len2 = comp2.len - offset2;
      const minLen = Math.min(len1, len2);
      result.retain(minLen);
      offset1 += minLen;
      offset2 += minLen;
      if (offset1 === comp1.len) next1();
      if (offset2 === comp2.len) next2();
      continue;
    }

    if (comp1.type === 'delete') {
      result.delete(comp1.len - offset1);
      next1();
      continue;
    }

    if (comp1.type === 'retain' && comp2.type === 'delete') {
      const len1 = comp1.len - offset1;
      const len2 = comp2.len - offset2;
      const minLen = Math.min(len1, len2);
      result.delete(minLen);
      offset1 += minLen;
      offset2 += minLen;
      if (offset1 === comp1.len) next1();
      if (offset2 === comp2.len) next2();
      continue;
    }
  }

  return result.normalize();
}

export function transformPosition(pos: number, op: TextOperation): number {
  let newPos = pos;
  let currentPos = 0;

  for (const c of op.components) {
    if (c.type === 'retain') {
      currentPos += c.len;
    } else if (c.type === 'insert') {
      if (currentPos <= pos) {
        newPos += c.text.length;
      }
    } else if (c.type === 'delete') {
      if (currentPos < pos) {
        const overlap = Math.min(c.len, pos - currentPos);
        newPos -= overlap;
      }
      currentPos += c.len;
    }
  }
  return newPos;
}
