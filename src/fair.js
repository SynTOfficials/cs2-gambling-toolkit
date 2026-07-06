/**
 * Provably-fair verification primitives.
 *
 * Implements the commit-reveal scheme used (with minor variations) by most
 * CS2 gambling platforms:
 *
 *   1. The site publishes SHA-256(serverSeed) BEFORE you bet (the commitment).
 *   2. Each result is derived from HMAC-SHA256(key = serverSeed,
 *      message = `${clientSeed}:${nonce}`).
 *   3. When the seed is rotated, the site reveals serverSeed and you can
 *      check the commitment and recompute every roll.
 *
 * Steps 1 and 2 are universal. The mapping from HMAC output to a game
 * outcome varies by site; `outcomesFromHmac` implements the most common
 * derivations (15-pocket roulette, 0-100.00 percent roll, bustabit-style
 * crash). Always compare against the formula documented on the site you
 * are verifying.
 *
 * Uses WebCrypto (globalThis.crypto.subtle), so the same code runs in
 * Node.js >= 20 and in every modern browser.
 */

const encoder = new TextEncoder();

function bytesToHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/** SHA-256 of a UTF-8 string, as lowercase hex. */
export async function sha256Hex(input) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(input));
    return bytesToHex(digest);
}

/** HMAC-SHA256(key, message) of UTF-8 strings, as lowercase hex. */
export async function hmacSha256Hex(key, message) {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sig = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
    return bytesToHex(sig);
}

/**
 * Check a server-seed commitment: SHA-256(serverSeed) === publishedHash.
 * Comparison is case-insensitive. Returns a boolean.
 */
export async function verifySeedCommitment(serverSeed, publishedHash) {
    const actual = await sha256Hex(serverSeed);
    return actual === String(publishedHash).trim().toLowerCase();
}

/**
 * Derive common game outcomes from an HMAC hex digest.
 *
 * - roulette: parseInt(first 8 hex chars, 16) % 15, with the common
 *   15-pocket colour layout (0 = green, 1-7 = red, 8-14 = black).
 * - percentRoll: parseInt(first 8 hex chars, 16) % 10001 / 100,
 *   a 0.00-100.00 roll used by dice/wheel-style games.
 * - crash: bustabit-style. X = parseInt(first 13 hex chars, 16) / 2^52,
 *   multiplier = max(1.00, floor((100 - edge%) / (1 - X)) / 100).
 *
 * @param {string} hmacHex - 64-char hex digest from hmacSha256Hex().
 * @param {{crashEdgePercent?: number}} [options]
 */
export function outcomesFromHmac(hmacHex, { crashEdgePercent = 1 } = {}) {
    const hex = String(hmacHex).trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hex)) {
        throw new Error('hmacHex must be a 64-character hex string');
    }

    const n32 = parseInt(hex.slice(0, 8), 16);

    const roulette = n32 % 15;
    const rouletteColor = roulette === 0 ? 'green' : roulette <= 7 ? 'red' : 'black';

    const percentRoll = (n32 % 10001) / 100;

    const r52 = parseInt(hex.slice(0, 13), 16);
    const X = r52 / 2 ** 52;
    const crash = Math.max(1, Math.floor((100 - crashEdgePercent) / (1 - X)) / 100);

    return {
        roulette: { roll: roulette, color: rouletteColor },
        percentRoll,
        crash,
    };
}

/**
 * Full verification of a single bet.
 *
 * @param {object} params
 * @param {string} params.serverSeed - revealed server seed.
 * @param {string} [params.serverSeedHash] - published SHA-256 commitment (optional).
 * @param {string} params.clientSeed
 * @param {number|string} params.nonce
 * @param {number} [params.crashEdgePercent]
 * @returns {Promise<{hashValid: boolean|null, hmac: string, outcomes: object}>}
 *   hashValid is null when no commitment hash was supplied.
 */
export async function verifyRoll({ serverSeed, serverSeedHash, clientSeed, nonce, crashEdgePercent = 1 }) {
    const hashValid = serverSeedHash
        ? await verifySeedCommitment(serverSeed, serverSeedHash)
        : null;
    const hmac = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}`);
    return { hashValid, hmac, outcomes: outcomesFromHmac(hmac, { crashEdgePercent }) };
}
