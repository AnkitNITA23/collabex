import { DocumentState } from './document';
import { TextOperation } from '../../shared/ot';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function runDocumentTests() {
  console.log('--- Running DocumentState concurrent edit tests ---');

  const doc = new DocumentState('');

  // Client A inserts "a"
  const opA = new TextOperation().insert('a');
  // Client B inserts "b"
  const opB = new TextOperation().insert('b');
  // Client C inserts "c"
  const opC = new TextOperation().insert('c');

  console.log('Applying Client A op...');
  doc.applyOperation(opA, 0);
  console.log('Doc text after A:', JSON.stringify(doc.text));

  console.log('Applying Client B op...');
  doc.applyOperation(opB, 0);
  console.log('Doc text after B:', JSON.stringify(doc.text));

  console.log('Applying Client C op...');
  doc.applyOperation(opC, 0);
  console.log('Doc text after C:', JSON.stringify(doc.text));

  assert(doc.text.length === 3, 'Document length should be 3');
  assert(doc.text.includes('a') && doc.text.includes('b') && doc.text.includes('c'), 'All inserted characters must be present');
  console.log('✓ Concurrent three-client edits passed!');
}

runDocumentTests();
