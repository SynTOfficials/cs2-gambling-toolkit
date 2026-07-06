/**
 * Case-opening expected value.
 *
 * EV = sum(itemValue * probability). House edge = 1 - EV / casePrice.
 * Probabilities are expressed in percent (so 0.5 means 0.5%).
 */

/**
 * @param {object} params
 * @param {number} params.price - case price.
 * @param {Array<{value: number, probability: number}>} params.items
 *   probability in percent; all items should sum to ~100.
 * @returns {{
 *   totalProbability: number,
 *   probabilityOk: boolean,
 *   ev: number,
 *   evPercent: number,
 *   houseEdgePercent: number,
 *   expectedLossPerOpen: number
 * }}
 */
export function caseEv({ price, items }) {
    if (!(price > 0)) throw new Error('price must be > 0');
    if (!Array.isArray(items) || items.length === 0) throw new Error('items must be a non-empty array');

    let totalProbability = 0;
    let ev = 0;
    for (const { value, probability } of items) {
        if (!(value >= 0) || !(probability >= 0)) {
            throw new Error('item value and probability must be non-negative numbers');
        }
        totalProbability += probability;
        ev += value * (probability / 100);
    }

    const evPercent = (ev / price) * 100;
    return {
        totalProbability: round2(totalProbability),
        probabilityOk: Math.abs(totalProbability - 100) < 0.01,
        ev: round2(ev),
        evPercent: round2(evPercent),
        houseEdgePercent: round2(100 - evPercent),
        expectedLossPerOpen: round2(price - ev),
    };
}

function round2(n) {
    return Math.round(n * 100) / 100;
}
