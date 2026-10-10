# Demo Test Data Pack — FinResearch AI

**28 sample annual-report PDFs** engineered to demonstrate every feature of the platform.

> ⚠️ All figures are **illustrative sample data for product demonstration only** (also stated inside every PDF). They are approximations, not authoritative filings.

## 📁 Contents

```
demo-test-data/
├── Apple/                     Apple_Annual_Report_FY2023.pdf … FY2026.pdf
├── Microsoft/                 Microsoft_Annual_Report_FY2023.pdf … FY2026.pdf
├── Tesla/                     Tesla_Annual_Report_FY2023.pdf … FY2026.pdf      ← stress story
├── Amazon/                    Amazon_Annual_Report_FY2023.pdf … FY2026.pdf
├── Reliance-Industries/       Reliance-Industries_Annual_Report_FY2023.pdf … FY2026.pdf ← rising-debt story
├── Infosys/                   Infosys_Annual_Report_FY2023.pdf … FY2026.pdf
└── TCS/                       TCS_Annual_Report_FY2023.pdf … FY2026.pdf
```

Each PDF contains the sections the Document Agent indexes
(`BUSINESS OVERVIEW`, `RESULTS OF OPERATIONS`, `FINANCIAL STATEMENTS`, `RISK FACTORS`,
`LIQUIDITY AND CAPITAL RESOURCES`, `NOTES TO FINANCIAL STATEMENTS`) and the exact metric
label grammar the Extraction Agent parses (verified: **26/26 metrics extracted per document**).

## 📤 How to upload (important!)

On **Documents → Upload**, fill:

| Field | Value |
|---|---|
| File | the PDF |
| Company name | `Apple` / `Microsoft` / `Tesla` / `Amazon` / `Reliance Industries` / `Infosys` / `TCS` |
| Ticker | `AAPL` / `MSFT` / `TSLA` / `AMZN` / `RELIANCE` / `INFY` / `TCS` |
| Document type | `Annual Report` |
| Fiscal year | 2023 / 2024 / 2025 / 2026 (match the file name) |

> 🔑 Use the **same company name and ticker for all four years** of a company — this is what
> makes cross-period trend detection and benchmarking work. Upload **earlier years first**
> (FY2023 → FY2026) so each new upload can compare against the previous period.

## 🎬 Demo script (15 minutes, shows everything)

1. **Document pipeline + metric extraction** — upload `Apple_Annual_Report_FY2023.pdf`.
   Processing runs Document → Extraction → Red-Flag → (Embedding: "unavailable" is normal
   without an embeddings provider). Open the document: **26 extracted metrics**, chunk count > 0,
   agent activity complete.
2. **Clean risk profile** — Apple FY2023 shows **0 risk flags** (the agent correctly stays quiet).
3. **Red-flag detection (deterministic + AI)** — upload `Tesla_Annual_Report_FY2026.pdf`.
   Expect 4+ findings with exact source quotes:
   - Auditor Qualification (critical) — "qualified audit opinion"
   - Going Concern (critical) — "substantial doubt about the company's ability to continue as a going concern"
   - Accounting Control Risk (high) — "material weakness in internal control over financial reporting"
   - Liquidity Risk (high) — "breach of a debt covenant"
4. **Cross-period trend risks** — upload in order: Tesla FY2024 → FY2025 → FY2026 (same company).
   The Red Flag Agent adds trend findings backed by both periods' evidence:
   declining margins, falling revenue, rising debt, negative free cash flow.
   Then do the same with `Reliance-Industries` FY2023 → FY2026 (steady **debt increase** 42B → 61B).
5. **Benchmarking** — Benchmark page → select Apple, Microsoft, Tesla, Amazon → compare
   margins, ratios, cash flow, debt, and risk counts (Tesla shows the risk spike).
6. **Research Agent** — in a session with the uploaded docs, try:
   - `What was Tesla's total revenue in fiscal year 2026 and quote the supporting source text?`
   - `What evidence supports the going concern risk?`
   - `1. What is Apple's free cash flow in fiscal 2023?` / `2. What is Microsoft's operating margin in fiscal 2024?`
   - `Compare the operating margin of Apple and Microsoft and quote each figure from its source document.`
   Expect answers with `[S1]…` citations and exact quotes.
7. **Report generation** — Reports → generate for Apple + Microsoft + Tesla:
   Key Financials table is filled from stored metrics; the disclaimer reflects the AI status
   (Groq wording, never GEMINI).
8. **Company/metrics/risks pages** — all read models populate; metrics tables show fiscal periods.

## 🎭 The two story-arcs built into the data

| Story | Companies | What you'll see |
|---|---|---|
| **Healthy growth** | Apple, Microsoft, Amazon, Infosys, TCS | Clean risk pages, strong margins, upward trends |
| **Deterioration / stress** | Tesla (FY25–FY26), Reliance (debt creep) | Deterministic + cross-period red flags, negative FCF, margin compression |

## 🧪 Regenerating / verifying

```bash
node demo-test-data/generate-demo-pdfs.cjs   # regenerate all 28 PDFs
node --import tsx demo-test-data/verify-demo.mjs   # verify with the app's own extractors
```

`verify-demo.mjs` runs the real `extractMetricsLocally` and `detectTextualRedFlags` against the
generated PDFs (parses them with the same `pdf-parse` the upload route uses).

## Notes

- PDFs contain selectable text (required — scanned/image PDFs are rejected by design).
- The extraction is validated end-to-end: each metric line also serves as its own evidence quote,
  so Research/Report citation validation passes.
- "Embedding status: unavailable" is expected unless you configure `EMBEDDING_*` — keyword
  retrieval covers the Research Agent demos.
