# CO-SARATHI-UX-002 — Natural Conversation Experience

## Goal

SARATHI should feel like a consultant reading, thinking, then responding — not an instant template dump.

## Implemented (experience layer only)

| Capability | Behaviour |
|------------|-----------|
| Thinking state | “SARATHI is thinking…” / progressive labels + animated dots |
| Adaptive timing | Soft floors scale by greeting → simple → standard → complex → recommendation (jittered, capped) |
| Progressive thinking | Configurable labels for standard/complex/recommendation |
| No fixed pre-delay | Platform turn starts immediately; floor only fills remainder if work finished early |
| Presentation streaming | When provider streaming is unavailable, facing text reveals progressively |
| Anti-template | Acknowledgements + Tone Library soft openers rotate; slogans stay blocked |
| Customer flow | Optimistic user bubble appears instantly; composer pauses only while busy |

## Unchanged

Enterprise AI Platform engines · Policy Gate · Planner architecture · FDI · Tool Bus
