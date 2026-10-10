# Presentation Package

Evaluation-ready deliverables (generated from `generate-presentation.cjs`):

| File | What it is |
|---|---|
| `PROJECT_DOCUMENTATION.pdf` | Full written documentation (20 pages, A4) - beginner-complete: features, tech justifications, agent logic, data model, API reference, setup/deployment, security, testing, troubleshooting, glossary |
| `PROJECT_PRESENTATION.pdf` | Presentation deck (31 slides, A4 landscape) - tech maps (why this / why not that), per-agent logic slides with code + file paths, live demo script, code walkthrough plan, evaluator Q&A cheat-sheet |
| `generate-presentation.cjs` | Generator script - edit content and re-run |

## Regenerate

```bash
node presentation/generate-presentation.cjs
```

Content is maintained inside the script (documentation chapters first, then slides),
so the deck and the documentation can never drift apart.
