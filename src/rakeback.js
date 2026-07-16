/**
 * Rakeback & lossback value.
 *
 * Sites increasingly compete on ongoing rewards rather than one-off
 * bonuses: rakeback returns a percentage of everything you wager,
 * lossback returns a percentage of your net losses. Both reduce the
 * effective house edge you actually pay:
 *
 *   effectiveEdge = edge * (1 - lossback) - rakeback
 *
 * The lossback term is the optimistic simplification - it assumes
 * lossback pays on your expected net loss, while real programs pay on
 * realised losses over fixed windows and usually credit the return as
 * bonus balance with its own wagering rules. If the effective edge
 * comes out at or below zero, a cap, game weighting or expiry in the
 * terms is doing the real work - sustained negative-edge rewards do
 * not exist.
 */

/**
 * @param {object} params
 * @param {number} params.edgePercent - house edge of the games played,
 *   in percent (e.g. 3 for 3%).
 * @param {number} params.monthlyWager - total amount wagered per month.
 * @param {number} [params.rakebackPercent=0] - rakeback as a percent of
 *   total wager (e.g. 0.5 for 0.5%).
 * @param {number} [params.lossbackPercent=0] - lossback as a percent of
 *   net losses (e.g. 15 for 15%).
 * @returns {{
 *   grossMonthlyCost: number,
 *   rakebackReturn: number,
 *   lossbackReturn: number,
 *   netMonthlyCost: number,
 *   effectiveEdgePercent: number
 * }}
 */
export function rakebackValue({ edgePercent, monthlyWager, rakebackPercent = 0, lossbackPercent = 0 }) {
    if (!(edgePercent >= 0)) throw new Error('edgePercent must be >= 0');
    if (!(monthlyWager >= 0)) throw new Error('monthlyWager must be >= 0');
    if (!(rakebackPercent >= 0)) throw new Error('rakebackPercent must be >= 0');
    if (!(lossbackPercent >= 0)) throw new Error('lossbackPercent must be >= 0');

    const grossMonthlyCost = monthlyWager * (edgePercent / 100);
    const rakebackReturn = monthlyWager * (rakebackPercent / 100);
    const lossbackReturn = grossMonthlyCost * (lossbackPercent / 100);
    const netMonthlyCost = grossMonthlyCost - rakebackReturn - lossbackReturn;
    const effectiveEdge = (edgePercent / 100) * (1 - lossbackPercent / 100) - rakebackPercent / 100;

    return {
        grossMonthlyCost: round2(grossMonthlyCost),
        rakebackReturn: round2(rakebackReturn),
        lossbackReturn: round2(lossbackReturn),
        netMonthlyCost: round2(netMonthlyCost),
        effectiveEdgePercent: round2(effectiveEdge * 100),
    };
}

function round2(n) {
    return Math.round(n * 100) / 100;
}
