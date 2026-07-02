import { TextOperation, transform } from '../../shared/ot';

export interface Collaborator {
  id: string;
  username: string;
  color: string;
  cursor: number | null;
  selectionEnd: number | null;
  lastActive: number;
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

export class DocumentState {
  text: string;
  version: number;
  history: TextOperation[];
  collaborators: Map<string, Collaborator>;
  language: string;

  constructor(initialText: string = '', language: string = 'javascript') {
    this.text = initialText;
    this.version = 0;
    this.history = [];
    this.collaborators = new Map();
    this.language = language;
  }

  applyOperation(op: TextOperation, clientVersion: number): TextOperation {
    if (clientVersion < 0 || clientVersion > this.version) {
      throw new Error(`Invalid client version: ${clientVersion}, current server version: ${this.version}`);
    }

    let transformedOp = op.clone();

    // Transform against all history operations from clientVersion to current version
    for (let i = clientVersion; i < this.version; i++) {
      const historyOp = this.history[i];
      const [clientOpPrime] = transform(transformedOp, historyOp, 'right');
      transformedOp = clientOpPrime;
    }

    // Apply transformed operation to the text
    this.text = transformedOp.apply(this.text);

    // Save to history
    this.history.push(transformedOp);
    this.version++;

    // Adjust existing cursors of other collaborators
    for (const [id, collab] of this.collaborators.entries()) {
      if (collab.cursor !== null) {
        collab.cursor = transformPosition(collab.cursor, transformedOp);
      }
      if (collab.selectionEnd !== null) {
        collab.selectionEnd = transformPosition(collab.selectionEnd, transformedOp);
      }
    }

    return transformedOp;
  }

  updateCursor(id: string, cursor: number | null, selectionEnd: number | null) {
    const collab = this.collaborators.get(id);
    if (collab) {
      collab.cursor = cursor;
      collab.selectionEnd = selectionEnd;
      collab.lastActive = Date.now();
    }
  }

  addCollaborator(id: string, username: string, color: string): Collaborator {
    const collab: Collaborator = {
      id,
      username,
      color,
      cursor: null,
      selectionEnd: null,
      lastActive: Date.now()
    };
    this.collaborators.set(id, collab);
    return collab;
  }

  removeCollaborator(id: string) {
    this.collaborators.delete(id);
  }

  getCollaboratorsList(): Collaborator[] {
    return Array.from(this.collaborators.values());
  }
}
