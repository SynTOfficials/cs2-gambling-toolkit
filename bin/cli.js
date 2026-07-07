#!/usr/bin/env node
/**
 * cs2-toolkit - CLI for the CS2 gambling toolkit.
 *
 *   cs2-toolkit verify   --server-seed <seed> --client-seed <seed> --nonce <n>
 *                        [--hash <published-sha256>] [--crash-edge <pct>]
 *   cs2-toolkit hash     --server-seed <seed>
 *   cs2-toolkit ev       --price <n> --items "value:prob,value:prob,..."
 *   cs2-toolkit wagering --bonus <n> --multiplier <n> --edge <pct>
 *                        [--deposit <n>] [--applies-to bonus|deposit+bonus]
 */

import { sha256Hex, verifyRoll } from '../src/fair.js';
import { caseEv } from '../src/ev.js';
import { bonusCost } from '../src/wagering.js';

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            args[argv[i].slice(2)] = argv[i + 1];
            i++;
        }
    }
    return args;
}

function fail(message) {
    console.error('Error: ' + message);
    process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

switch (command) {
    case 'verify': {
        if (!args['server-seed'] || !args['client-seed'] || args['nonce'] === undefined) {
            fail('verify requires --server-seed, --client-seed and --nonce');
        }
        const result = await verifyRoll({
            serverSeed: args['server-seed'],
            serverSeedHash: args['hash'],
            clientSeed: args['client-seed'],
            nonce: args['nonce'],
            crashEdgePercent: args['crash-edge'] !== undefined ? Number(args['crash-edge']) : 1,
        });
        if (result.hashValid === false) {
            console.log('Seed commitment: MISMATCH - the revealed seed does NOT match the published hash.');
        } else if (result.hashValid === true) {
            console.log('Seed commitment: OK (SHA-256 of the revealed seed matches the published hash)');
        } else {
            console.log('Seed commitment: not checked (no --hash supplied)');
        }
        console.log('HMAC-SHA256:     ' + result.hmac);
        console.log('Roulette (0-14): ' + result.outcomes.roulette.roll + ' (' + result.outcomes.roulette.color + ')');
        console.log('Percent roll:    ' + result.outcomes.percentRoll.toFixed(2));
        console.log('Crash:           ' + result.outcomes.crash.toFixed(2) + 'x');
        if (result.hashValid === false) process.exit(2);
        break;
    }

    case 'hash': {
        if (!args['server-seed']) fail('hash requires --server-seed');
        console.log(await sha256Hex(args['server-seed']));
        break;
    }

    case 'ev': {
        if (!args['price'] || !args['items']) fail('ev requires --price and --items "value:prob,..."');
        const items = args['items'].split(',').map((pair) => {
            const [value, probability] = pair.split(':').map(Number);
            return { value, probability };
        });
        const result = caseEv({ price: Number(args['price']), items });
        console.log('Total probability: ' + result.totalProbability + '%' + (result.probabilityOk ? '' : '  (WARNING: does not sum to 100%)'));
        console.log('Expected value:    ' + result.ev + ' (' + result.evPercent + '% of price)');
        console.log('House edge:        ' + result.houseEdgePercent + '%');
        console.log('Expected loss:     ' + result.expectedLossPerOpen + ' per open');
        break;
    }

    case 'wagering': {
        if (!args['bonus'] || !args['multiplier'] || args['edge'] === undefined) {
            fail('wagering requires --bonus, --multiplier and --edge');
        }
        const result = bonusCost({
            bonus: Number(args['bonus']),
            multiplier: Number(args['multiplier']),
            edgePercent: Number(args['edge']),
            deposit: args['deposit'] !== undefined ? Number(args['deposit']) : 0,
            appliesTo: args['applies-to'] || 'bonus',
        });
        console.log('Total wagering required: ' + result.totalWagering);
        console.log('Expected clearing cost:  ' + result.expectedClearingCost);
        console.log('Net bonus value:         ' + result.netBonusValue);
        console.log('Effective value:         ' + result.effectiveValuePercent + '% of the headline bonus');
        break;
    }

    default:
        console.log(`cs2-gambling-toolkit - https://github.com/SynTOfficials/cs2-gambling-toolkit
Hosted versions of these tools: https://www.syntskins.com/tools

Commands:
  verify    Verify a provably-fair roll
            --server-seed <seed> --client-seed <seed> --nonce <n> [--hash <sha256>] [--crash-edge <pct>]
  hash      SHA-256 a server seed (check a commitment)
            --server-seed <seed>
  ev        Case-opening expected value
            --price <n> --items "value:prob,value:prob,..."
  wagering  Expected cost of clearing a bonus
            --bonus <n> --multiplier <n> --edge <pct> [--deposit <n>] [--applies-to bonus|deposit+bonus]`);
        if (command !== undefined && command !== 'help' && command !== '--help') process.exit(1);
}
