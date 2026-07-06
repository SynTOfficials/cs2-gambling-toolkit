import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bonusCost } from '../src/wagering.js';

test('bonusCost shows a typical 35x bonus is worth less than nothing', () => {
    const result = bonusCost({ bonus: 50, multiplier: 35, edgePercent: 5 });
    assert.equal(result.wagerBase, 50);
    assert.equal(result.totalWagering, 1750);
    assert.equal(result.expectedClearingCost, 87.5);
    assert.equal(result.netBonusValue, -37.5);
    assert.equal(result.effectiveValuePercent, -75);
});

test('bonusCost with deposit+bonus wagering base', () => {
    const result = bonusCost({
        bonus: 50,
        deposit: 50,
        multiplier: 10,
        edgePercent: 2,
        appliesTo: 'deposit+bonus',
    });
    assert.equal(result.wagerBase, 100);
    assert.equal(result.totalWagering, 1000);
    assert.equal(result.expectedClearingCost, 20);
    assert.equal(result.netBonusValue, 30);
    assert.equal(result.effectiveValuePercent, 60);
});

test('bonusCost with no wagering keeps the full bonus', () => {
    const result = bonusCost({ bonus: 25, multiplier: 0, edgePercent: 5 });
    assert.equal(result.netBonusValue, 25);
    assert.equal(result.effectiveValuePercent, 100);
});

test('bonusCost validates input', () => {
    assert.throws(() => bonusCost({ bonus: 0, multiplier: 35, edgePercent: 5 }));
    assert.throws(() => bonusCost({ bonus: 50, multiplier: 35, edgePercent: 5, appliesTo: 'nope' }));
});
