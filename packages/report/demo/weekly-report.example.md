---
title: "Weekly Report - Platform Team"
authors: ["Your Name"]
lang: en
---

# Overview

This week the focus was on stabilizing the document pipeline and shipping the
new export flow. Overall latency is down 18% and there were no Sev-1 incidents.

## Key results

- Shipped the export flow to 100% of workspaces
- Cut average render time from 4.1s to 3.3s
- Rolled out the new template gallery

## In numbers

| Metric | Last week | This week |
| --- | ---: | ---: |
| Render time (p50) | 4.1s | 3.3s |
| Error rate | 0.42% | 0.21% |
| Active workspaces | 1,204 | 1,377 |

## Blockers and asks

1. Waiting on billing API quota increase (ticket OPS-442)
2. Need one design review slot for the mobile reader

## Next week

- Finish the mobile reader spike
- Draft the Q4 capacity plan with the platform leads

# Appendix: notes

> "The report we send now is just what the team types, but it looks like a
document a publisher would ship." - team feedback, Friday sync
