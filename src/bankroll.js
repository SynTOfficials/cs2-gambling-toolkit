/**
 * Bankroll survival simulator.
 *
 * Expected value tells you the average; variance decides whether your
 * bankroll survives long enough to see it. This plays out a session of
 * flat bets many times (Monte Carlo) with the exact odds implied by the
 * inputs and reports what actually happens to bankrolls like yours.
 *
 * The win probability is derived from the payout multiplier and house
 * edge the same way crash/dice sites do it:
 *
 *   winProbability = (100 - edge) / (multiplier * 100)
 *
 * so a 2.00x target at a 1% edge wins 49.5% of the time. A run "busts"
 * when the balance can no longer cover the flat bet.
 */

/**
 * @param {object} params
 * @param {number} params.bankroll - starting bankroll.
 * @param {number} params.bet - flat bet size, staked every round.
 * @param {number} params.multiplier - payout multiplier per win
 *   (e.g. 2 for 2.00x). Must be > 1.
 * @param {number} params.edgePercent - house edge in percent
 *   (e.g. 1 for 1%). Must be >= 0 and < 100.
 * @param {number} params.bets - number of bets in the session.
 * @param {number} [params.runs=5000] - Monte Carlo runs.
 * @param {() => number} [params.random=Math.random] - RNG returning
 *   [0, 1); injectable for deterministic tests.
 * @returns {{
 *   winProbabilityPercent: number,
 *   bustPercent: number,
 *   profitPercent: number,
 *   medianEndingBankroll: number,
 *   meanEndingBankroll: number,
 *   runs: number
 * }}
 */
export function simulateBankroll({ bankroll, bet, multiplier, edgePercent, bets, runs = 5000, random = Math.random }) {
    if (!(bankroll > 0)) throw new Error('bankroll must be > 0');
    if (!(bet > 0)) throw new Error('bet must be > 0');
    if (!(multiplier > 1)) throw new Error('multiplier must be > 1');
    if (!(edgePercent >= 0 && edgePercent < 100)) throw new Error('edgePercent must be >= 0 and < 100');
    const betCount = Math.floor(bets);
    if (!(betCount >= 1)) throw new Error('bets must be >= 1');
    if (!(runs >= 1)) throw new Error('runs must be >= 1');

    const winProbability = (100 - edgePercent) / (multiplier * 100);
    const profitPerWin = bet * (multiplier - 1);

    const finals = new Array(runs);
    let busts = 0;
    let profits = 0;
    let sum = 0;

    for (let r = 0; r < runs; r++) {
        let balance = bankroll;
        for (let i = 0; i < betCount; i++) {
            if (balance < bet) break; // can no longer place the bet
            balance += random() < winProbability ? profitPerWin : -bet;
        }
        if (balance < bet) busts++;
        if (balance > bankroll) profits++;
        finals[r] = balance;
        sum += balance;
    }

    finals.sort((a, b) => a - b);

    return {
        winProbabilityPercent: round2(winProbability * 100),
        bustPercent: round2((busts / runs) * 100),
        profitPercent: round2((profits / runs) * 100),
        medianEndingBankroll: round2(finals[Math.floor(runs / 2)]),
        meanEndingBankroll: round2(sum / runs),
        runs,
    };
}

function round2(n) {
    return Math.round(n * 100) / 100;
}
