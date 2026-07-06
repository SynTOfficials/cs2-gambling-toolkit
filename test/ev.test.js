import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caseEv } from '../src/ev.js';

test('caseEv computes the worked example from the syntskins case-odds guide', () => {
    const result = caseEv({
        price: 10,
        items: [
            { value: 400, probability: 0.5 },
            { value: 45, probability: 8 },
            { value: 8, probability: 25 },
            { value: 1.8, probability: 66.5 },
        ],
    });
    assert.equal(result.totalProbability, 100);
    assert.equal(result.probabilityOk, true);
    assert.equal(result.ev, 8.8);
    assert.equal(result.evPercent, 87.97);
    assert.equal(result.houseEdgePercent, 12.03);
    assert.equal(result.expectedLossPerOpen, 1.2);
});

test('caseEv flags probabilities that do not sum to 100', () => {
    const result = caseEv({ price: 5, items: [{ value: 10, probability: 40 }] });
    assert.equal(result.probabilityOk, false);
    assert.equal(result.totalProbability, 40);
});

test('caseEv validates input', () => {
    assert.throws(() => caseEv({ price: 0, items: [{ value: 1, probability: 100 }] }));
    assert.throws(() => caseEv({ price: 10, items: [] }));
    assert.throws(() => caseEv({ price: 10, items: [{ value: -1, probability: 100 }] }));
});
