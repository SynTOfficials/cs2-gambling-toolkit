import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateBankroll } from '../src/bankroll.js';

/** Deterministic RNG (mulberry32) so the Monte Carlo tests never flake. */
function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

test('simulateBankroll derives the win probability from multiplier and edge', () => {
    const result = simulateBankroll({
        bankroll: 100, bet: 1, multiplier: 2, edgePercent: 1, bets: 1,
        runs: 10, random: () => 0.99,
    });
    // (100 - 1) / (2 * 100) = 49.5%
    assert.equal(result.winProbabilityPercent, 49.5);
});

test('simulateBankroll when every bet wins', () => {
    const result = simulateBankroll({
        bankroll: 100, bet: 10, multiplier: 2, edgePercent: 1, bets: 20,
        runs: 50, random: () => 0, // always below winProbability
    });
    assert.equal(result.bustPercent, 0);
    assert.equal(result.profitPercent, 100);
    // 20 wins of bet * (mult - 1) = 10 each on top of 100
    assert.equal(result.medianEndingBankroll, 300);
    assert.equal(result.meanEndingBankroll, 300);
});

test('simulateBankroll when every bet loses busts every run', () => {
    const result = simulateBankroll({
        bankroll: 100, bet: 10, multiplier: 2, edgePercent: 1, bets: 50,
        runs: 50, random: () => 0.999999, // always above winProbability
    });
    assert.equal(result.bustPercent, 100);
    assert.equal(result.profitPercent, 0);
    assert.equal(result.medianEndingBankroll, 0);
    assert.equal(result.meanEndingBankroll, 0);
});

test('simulateBankroll matches expectation on a seeded fair coin-flip', () => {
    // edge 0 at 2.00x is a fair game: mean ending bankroll ~ starting bankroll
    const result = simulateBankroll({
        bankroll: 100, bet: 1, multiplier: 2, edgePercent: 0, bets: 100,
        runs: 5000, random: mulberry32(42),
    });
    assert.equal(result.winProbabilityPercent, 50);
    assert.equal(result.bustPercent, 0); // 100 flat 1-unit bets cannot bust a 100 bankroll at 2.00x
    assert.ok(Math.abs(result.meanEndingBankroll - 100) < 1, 'mean ~ 100, got ' + result.meanEndingBankroll);
    assert.ok(result.profitPercent > 40 && result.profitPercent < 60, 'profit% ~ 50, got ' + result.profitPercent);
});

test('simulateBankroll validates input', () => {
    assert.throws(() => simulateBankroll({ bankroll: 0, bet: 1, multiplier: 2, edgePercent: 1, bets: 10 }));
    assert.throws(() => simulateBankroll({ bankroll: 100, bet: 0, multiplier: 2, edgePercent: 1, bets: 10 }));
    assert.throws(() => simulateBankroll({ bankroll: 100, bet: 1, multiplier: 1, edgePercent: 1, bets: 10 }));
    assert.throws(() => simulateBankroll({ bankroll: 100, bet: 1, multiplier: 2, edgePercent: 100, bets: 10 }));
    assert.throws(() => simulateBankroll({ bankroll: 100, bet: 1, multiplier: 2, edgePercent: 1, bets: 0 }));
});
