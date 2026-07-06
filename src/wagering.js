/**
 * Bonus wagering cost.
 *
 * A wagering (rollover) requirement of Nx means you must place bets
 * totalling N times the wager base before bonus-derived funds unlock.
 * The expected cost of that volume is totalWagering * houseEdge, so:
 *
 *   netBonusValue = bonus - (wagerBase * multiplier * edge)
 *
 * A "100% up to $1000" banner with 35x wagering at a 5% average edge is
 * usually worth less than nothing; this makes that arithmetic visible.
 */

/**
 * @param {object} params
 * @param {number} params.bonus - bonus amount granted.
 * @param {number} params.multiplier - wagering requirement (e.g. 35 for 35x).
 * @param {number} params.edgePercent - average house edge of the games used
 *   to clear it, in percent (e.g. 5 for 5%).
 * @param {number} [params.deposit=0] - deposit amount; only needed when the
 *   wagering applies to deposit + bonus.
 * @param {'bonus'|'deposit+bonus'} [params.appliesTo='bonus']
 * @returns {{
 *   wagerBase: number,
 *   totalWagering: number,
 *   expectedClearingCost: number,
 *   netBonusValue: number,
 *   effectiveValuePercent: number
 * }}
 */
export function bonusCost({ bonus, multiplier, edgePercent, deposit = 0, appliesTo = 'bonus' }) {
    if (!(bonus > 0)) throw new Error('bonus must be > 0');
    if (!(multiplier >= 0)) throw new Error('multiplier must be >= 0');
    if (!(edgePercent >= 0)) throw new Error('edgePercent must be >= 0');
    if (appliesTo !== 'bonus' && appliesTo !== 'deposit+bonus') {
        throw new Error("appliesTo must be 'bonus' or 'deposit+bonus'");
    }

    const wagerBase = appliesTo === 'deposit+bonus' ? deposit + bonus : bonus;
    const totalWagering = wagerBase * multiplier;
    const expectedClearingCost = totalWagering * (edgePercent / 100);
    const netBonusValue = bonus - expectedClearingCost;

    return {
        wagerBase: round2(wagerBase),
        totalWagering: round2(totalWagering),
        expectedClearingCost: round2(expectedClearingCost),
        netBonusValue: round2(netBonusValue),
        effectiveValuePercent: round2((netBonusValue / bonus) * 100),
    };
}

function round2(n) {
    return Math.round(n * 100) / 100;
}
