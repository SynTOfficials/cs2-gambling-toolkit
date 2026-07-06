# cs2-gambling-toolkit

Open-source verifier and calculators for CS2 (Counter-Strike 2) gambling. Zero dependencies, MIT licensed, runs in Node.js ≥ 20 and every modern browser (WebCrypto).

**Hosted versions** (no install needed): **[syntskins.com/tools](https://www.syntskins.com/tools)**

| Tool | What it does | Hosted |
|---|---|---|
| Provably-fair verifier | Checks a site's server-seed commitment (SHA-256) and recomputes rolls from `HMAC-SHA256(serverSeed, clientSeed:nonce)` | [syntskins.com/tools/provably-fair-verifier](https://www.syntskins.com/tools/provably-fair-verifier) |
| Case EV calculator | Expected value and house edge of a case from its published drop rates | [syntskins.com/tools/case-ev-calculator](https://www.syntskins.com/tools/case-ev-calculator) |
| Wagering calculator | The real expected cost of clearing a bonus wagering requirement | [syntskins.com/tools/wagering-calculator](https://www.syntskins.com/tools/wagering-calculator) |

Built and maintained by [SynTSkins](https://www.syntskins.com), an independent CS2 gambling site directory. The maths here is the same maths behind our published reviews.

## Why this exists

"Provably fair" badges are everywhere in skin gambling; independent verification is not. This toolkit lets you check, with standard cryptography and no trust in anyone's website (including ours):

1. **that a site committed to its randomness before you bet** — `SHA-256(serverSeed)` must equal the hash the site published in advance;
2. **that each roll follows from the seeds** — outcomes derive from `HMAC-SHA256(key = serverSeed, message = clientSeed:nonce)`;
3. **what a case or bonus is actually worth** — expected value is arithmetic, not marketing.

## CLI usage

```bash
npx cs2-gambling-toolkit help          # or: node bin/cli.js

# Verify a roll after the site reveals its server seed
cs2-toolkit verify --server-seed "revealed-seed" --client-seed "your-seed" --nonce 42 \
                   --hash "published-sha256-commitment"

# Check a seed commitment on its own
cs2-toolkit hash --server-seed "revealed-seed"

# Expected value of a $10 case (item value : drop probability in %)
cs2-toolkit ev --price 10 --items "400:0.5,45:8,8:25,1.8:66.5"

# Expected cost of clearing a $50 bonus at 35x wagering on 5%-edge games
cs2-toolkit wagering --bonus 50 --multiplier 35 --edge 5
```

## Library usage

```js
import { verifyRoll, caseEv, bonusCost } from 'cs2-gambling-toolkit';

const { hashValid, hmac, outcomes } = await verifyRoll({
  serverSeed: 'revealed-seed',
  serverSeedHash: 'published-commitment',
  clientSeed: 'your-seed',
  nonce: 42,
});
// outcomes.roulette -> { roll: 0-14, color: 'green'|'red'|'black' }
// outcomes.percentRoll -> 0.00-100.00
// outcomes.crash -> multiplier >= 1.00
```

## The formulas (and their limits)

- **Commitment**: `SHA-256(serverSeed) === publishedHash`. Universal across sites.
- **Roll digest**: `HMAC-SHA256(key = serverSeed, message = clientSeed + ":" + nonce)`. Used by the large majority of platforms; a few concatenate differently — check the site's fairness page.
- **Roulette (0–14)**: `parseInt(hmac[0..8], 16) % 15`, colours `0 = green, 1–7 = red, 8–14 = black`.
- **Percent roll (0–100.00)**: `parseInt(hmac[0..8], 16) % 10001 / 100`.
- **Crash**: bustabit-style, `X = parseInt(hmac[0..13], 16) / 2^52`, `multiplier = max(1.00, floor((100 − edge%) / (1 − X)) / 100)`.

Two honest caveats. First, outcome derivations **vary by site** — the digest step is standard, the mapping to a game result is not, so always compare against the formula the site documents. Second, provably fair proves the roll wasn't manipulated; it does **not** prove the odds are good, the item pricing is honest, or that you'll get paid. See our guides: [what provably fair actually means](https://www.syntskins.com/guides/provably-fair-explained) and [case odds & expected value](https://www.syntskins.com/guides/cs2-case-opening-odds).

## Development

```bash
npm test   # node --test, 14 tests, no dependencies
```

## Disclaimer

For education and verification. Gambling involves risk and is age-restricted (18+, 21+ in some jurisdictions). If gambling has stopped being entertainment, start here instead: [responsible gambling resources](https://www.syntskins.com/guides/responsible-gambling-cs2).

## License

[MIT](LICENSE) © 2026 [SynTSkins](https://www.syntskins.com)
