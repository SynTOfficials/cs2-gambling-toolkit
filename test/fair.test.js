import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import { sha256Hex, hmacSha256Hex, verifySeedCommitment, outcomesFromHmac, verifyRoll } from '../src/fair.js';

test('sha256Hex matches the well-known digest of "test"', async () => {
    assert.equal(
        await sha256Hex('test'),
        '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    );
});

test('hmacSha256Hex matches RFC 4231 test case 2', async () => {
    assert.equal(
        await hmacSha256Hex('Jefe', 'what do ya want for nothing?'),
        '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
});

test('WebCrypto implementation agrees with node:crypto', async () => {
    const pairs = [
        ['a-server-seed-1f2e3d', 'my-client-seed:0'],
        ['6f5902ac237024bdd0c176cb93063dc4', 'x:12345'],
        ['seed with spaces and únicode ✓', 'client:999'],
    ];
    for (const [key, msg] of pairs) {
        const expected = createHmac('sha256', key).update(msg).digest('hex');
        assert.equal(await hmacSha256Hex(key, msg), expected);
        const expectedHash = createHash('sha256').update(key).digest('hex');
        assert.equal(await sha256Hex(key), expectedHash);
    }
});

test('verifySeedCommitment accepts matching hash (case-insensitive) and rejects others', async () => {
    const seed = 'reveal-me';
    const hash = createHash('sha256').update(seed).digest('hex');
    assert.equal(await verifySeedCommitment(seed, hash), true);
    assert.equal(await verifySeedCommitment(seed, hash.toUpperCase()), true);
    assert.equal(await verifySeedCommitment(seed, 'f'.repeat(64)), false);
    assert.equal(await verifySeedCommitment('different-seed', hash), false);
});

test('outcomesFromHmac derives deterministic outcomes', () => {
    const zeros = '0'.repeat(64);
    const o = outcomesFromHmac(zeros);
    assert.deepEqual(o.roulette, { roll: 0, color: 'green' });
    assert.equal(o.percentRoll, 0);
    // X = 0 -> floor(99/1)/100 = 0.99 -> clamped to the 1.00x minimum
    assert.equal(o.crash, 1);

    // n32 = 0x00000010 = 16 -> roulette 16 % 15 = 1 (red), percent 16 % 10001 / 100
    const sixteen = '00000010' + '0'.repeat(56);
    const o2 = outcomesFromHmac(sixteen);
    assert.deepEqual(o2.roulette, { roll: 1, color: 'red' });
    assert.equal(o2.percentRoll, 0.16);

    // Colour boundaries of the common 15-pocket layout
    assert.equal(outcomesFromHmac('00000007' + '0'.repeat(56)).roulette.color, 'red');
    assert.equal(outcomesFromHmac('00000008' + '0'.repeat(56)).roulette.color, 'black');
});

test('outcomesFromHmac rejects malformed input', () => {
    assert.throws(() => outcomesFromHmac('not-hex'));
    assert.throws(() => outcomesFromHmac('abc123'));
});

test('verifyRoll end to end', async () => {
    const serverSeed = 'e2e-server-seed';
    const hash = createHash('sha256').update(serverSeed).digest('hex');
    const result = await verifyRoll({ serverSeed, serverSeedHash: hash, clientSeed: 'me', nonce: 7 });
    assert.equal(result.hashValid, true);
    assert.equal(result.hmac, createHmac('sha256', serverSeed).update('me:7').digest('hex'));
    assert.ok(result.outcomes.roulette.roll >= 0 && result.outcomes.roulette.roll <= 14);
    assert.ok(result.outcomes.crash >= 1);

    const unchecked = await verifyRoll({ serverSeed, clientSeed: 'me', nonce: 7 });
    assert.equal(unchecked.hashValid, null);
});
