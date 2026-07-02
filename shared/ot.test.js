"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ot_1 = require("./ot");
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion Failed: ${message}`);
    }
}
function runTests() {
    console.log('--- Running Operational Transformation Engine Tests ---');
    // Test Case 1: Simple insert convergence (same position insert)
    {
        const initialText = 'hello';
        // opA: insert 'A' at start -> 'Ahello'
        const opA = new ot_1.TextOperation().insert('A').retain(5);
        // opB: insert 'B' at start -> 'Bhello'
        const opB = new ot_1.TextOperation().insert('B').retain(5);
        const [opAPrime, opBPrime] = (0, ot_1.transform)(opA, opB, 'left');
        // Applying opA then opBPrime
        const textA_BPrime = opBPrime.apply(opA.apply(initialText));
        // Applying opB then opAPrime
        const textB_APrime = opAPrime.apply(opB.apply(initialText));
        assert(textA_BPrime === textB_APrime, 'Insert convergence failed');
        assert(textA_BPrime === 'ABhello', 'Expected content "ABhello"');
        console.log('✓ Test Case 1: Insert convergence passed');
    }
    // Test Case 2: Concurrent non-overlapping deletes
    {
        const initialText = 'abcdef';
        // opA: delete 'b' (index 1) -> 'acdef'
        const opA = new ot_1.TextOperation().retain(1).delete(1).retain(4);
        // opB: delete 'e' (index 4) -> 'abcdf'
        const opB = new ot_1.TextOperation().retain(4).delete(1).retain(1);
        const [opAPrime, opBPrime] = (0, ot_1.transform)(opA, opB, 'left');
        const textA_BPrime = opBPrime.apply(opA.apply(initialText));
        const textB_APrime = opAPrime.apply(opB.apply(initialText));
        assert(textA_BPrime === textB_APrime, 'Delete convergence failed');
        assert(textA_BPrime === 'acdf', 'Expected content "acdf"');
        console.log('✓ Test Case 2: Concurrent deletes convergence passed');
    }
    // Test Case 3: Overlapping retain vs delete
    {
        const initialText = 'abcdef';
        // opA: delete 'bc' (index 1-3) -> 'adef'
        const opA = new ot_1.TextOperation().retain(1).delete(2).retain(3);
        // opB: retain 6 (no changes) -> 'abcdef'
        const opB = new ot_1.TextOperation().retain(6);
        const [opAPrime, opBPrime] = (0, ot_1.transform)(opA, opB, 'left');
        const textA_BPrime = opBPrime.apply(opA.apply(initialText));
        const textB_APrime = opAPrime.apply(opB.apply(initialText));
        assert(textA_BPrime === textB_APrime, 'Retain vs Delete convergence failed');
        assert(textA_BPrime === 'adef', 'Expected content "adef"');
        console.log('✓ Test Case 3: Retain vs Delete convergence passed');
    }
    // Test Case 4: Operation composition
    {
        const initialText = 'hello';
        // op1: insert 'world ' at start -> 'world hello'
        const op1 = new ot_1.TextOperation().insert('world ').retain(5);
        // op2: retain 6 ('world '), delete 5 ('hello') -> 'world '
        const op2 = new ot_1.TextOperation().retain(6).delete(5);
        const composedOp = (0, ot_1.compose)(op1, op2);
        const resultText = composedOp.apply(initialText);
        assert(resultText === 'world ', `Composition failed, got: "${resultText}"`);
        console.log('✓ Test Case 4: Composition passed');
    }
    console.log('All tests passed successfully!');
}
runTests();
