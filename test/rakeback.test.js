import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rakebackValue } from '../src/rakeback.js';

test('rakebackValue on a typical stacked offer (0.5% rakeback + 15% lossback)', () => {
    const result = rakebackValue({
        edgePercent: 3,
        monthlyWager: 1000,
        rakebackPercent: 0.5,
        lossbackPercent: 15,
    });
    assert.equal(result.grossMonthlyCost, 30);
    assert.equal(result.rakebackReturn, 5);
    assert.equal(result.lossbackReturn, 4.5);
    assert.equal(result.netMonthlyCost, 20.5);
    // 3 * (1 - 0.15) - 0.5 = 2.05
    assert.equal(result.effectiveEdgePercent, 2.05);
});

test('rakebackValue with no rewards leaves the edge untouched', () => {
    const result = rakebackValue({ edgePercent: 5, monthlyWager: 200 });
    assert.equal(result.grossMonthlyCost, 10);
    assert.equal(result.rakebackReturn, 0);
    assert.equal(result.lossbackReturn, 0);
    assert.equal(result.netMonthlyCost, 10);
    assert.equal(result.effectiveEdgePercent, 5);
});

test('rakebackValue flags impossible negative-edge offers', () => {
    const result = rakebackValue({
        edgePercent: 1,
        monthlyWager: 1000,
        rakebackPercent: 2,
    });
    assert.equal(result.effectiveEdgePercent, -1);
    assert.equal(result.netMonthlyCost, -10);
});

test('rakebackValue validates input', () => {
    assert.throws(() => rakebackValue({ edgePercent: -1, monthlyWager: 100 }));
    assert.throws(() => rakebackValue({ edgePercent: 3, monthlyWager: -5 }));
    assert.throws(() => rakebackValue({ edgePercent: 3, monthlyWager: 100, rakebackPercent: -0.5 }));
    assert.throws(() => rakebackValue({ edgePercent: 3, monthlyWager: 100, lossbackPercent: -15 }));
});
