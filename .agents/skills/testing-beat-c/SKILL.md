---
name: testing-beat-c
description: Test Beat C (Dispatcher) game end-to-end. Use when verifying Beat C UI, game flow, scoring, or UX changes.
---

# Testing Beat C (Dispatcher)

## Setup

1. `npm install && npm run dev` — starts Vite dev server (default port 5173, may use 5174+ if occupied)
2. Navigate to `http://localhost:<port>/beat-c` in Chrome

## Game Flow

Beat C is a time-pressure triage board with 3 phases: **briefing → playing → results**.

### Briefing Phase
- Shows mission context, key intel, scoring overview
- Two start buttons: "START (Guided)" and "START (Open)"
- Guided mode shows hints per permit; Open mode is unassisted
- Clock does NOT tick during briefing

### Playing Phase
- Sim clock runs at 10x real speed, starting at 23:41:07
- 4 permits to triage: C014, P-220, P-118, R-090
- P-220 has a GF same-day window countdown (expires at midnight sim time = ~1m 53s real time from start)
- **Important:** P-220's window expires quickly. Test it first if you need to verify amend flow, or accept it will auto-resolve with 0 points.

### Key Permits & Correct Actions
| Permit | Correct Action | Key Detail |
|--------|---------------|------------|
| C014 | Partial Refund (Specific) | G1 paid, short shipment 100 BOT, overpaid SGD 2,187.08 |
| P-220 | Amend (within GF window) | GF + non-dutiable + not utilised + same day |
| P-118 | Monitor (no action) | UTILISED at 15:22, locked |
| R-090 | Monitor (no action) | AWAITING CA APPROVAL |

### Results Phase
- Shows grade (EXCELLENT/GOOD/FAIR/NEEDS WORK), score out of 300
- Per-permit breakdown with correct action labels and explanations
- Error ledger with error codes
- Session log replay
- RETURN button at bottom

## Test Strategy

1. **Briefing screen** — verify it gates gameplay (no clock ticking)
2. **P-220 first** if testing amend flow (window closes fast)
3. **Wrong action feedback** — try CANCEL on C014 to verify red error banner
4. **C014 refund flow** — select REFUND → Partial (Specific) → enter 1100 quantity → check surveyor → CONFIRM REFUND
5. **P-118 monitor** — verify locked permit hint, first attempt shows warning
6. **R-090 monitor** — verify CA approval hint
7. **Results screen** — verify grade, breakdown, error ledger, session log

## Common Issues

- P-220 GF window expiry may generate duplicate action log entries — this is a known minor bug
- P-118 first MONITOR attempt shows a warning (teaching moment) — second attempt resolves it. Score may be 0/40 due to the warning mechanic.
- Port 5173 might be in use; check terminal output for actual port number
- The sim clock runs at 10x speed, so ~2 minutes real time = ~20 minutes sim time

## Build & Lint

```bash
npm run build   # tsc -b && vite build
npm run lint     # oxlint
```

## Devin Secrets Needed

None — this is a frontend-only Vite app with no backend or authentication.
