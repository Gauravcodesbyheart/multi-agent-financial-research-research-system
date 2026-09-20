# FinResearch AI

### Multi-Agent AI Financial Research & Business Insights Platform

FinResearch AI is a full-stack **multi-agent AI system for financial research and business analysis**.

It helps finance students, MBA candidates, researchers, and early-career analysts analyze financial documents such as annual reports, 10-K filings, earnings transcripts, investor presentations, and other business documents.

Instead of manually extracting financial metrics, searching through lengthy reports, identifying risks, comparing companies, and preparing research reports, FinResearch AI combines **document processing, specialized AI agents, structured financial data, risk analysis, benchmarking, and evidence-based research** in one platform.

> **Disclaimer:** FinResearch AI is an educational and research tool. Its output is informational and should not be considered investment, legal, accounting, or tax advice. Important financial values should always be verified against the original source document.

---

## 🚀 Key Features

### 📄 Intelligent Document Analysis

Upload and analyze:

* PDF
* DOCX
* TXT

The document processing pipeline extracts readable text, cleans and normalizes it, identifies sections, creates searchable chunks, and stores the resulting evidence for downstream analysis.

> Scanned or image-only PDFs may require OCR before reliable text extraction.

### 🤖 Multi-Agent AI Pipeline

FinResearch AI uses five specialized agents:

| Agent                | Responsibility                                            |
| -------------------- | --------------------------------------------------------- |
| **Document Agent**   | Extracts, cleans, sections, chunks, and indexes documents |
| **Extraction Agent** | Extracts structured financial metrics                     |
| **Risk Agent**       | Identifies financial and business risks                   |
| **Benchmark Agent**  | Compares companies using metrics and risk profiles        |
| **Research Agent**   | Answers questions using retrieved evidence and citations  |

### 📊 Financial Metrics

The platform works with metrics such as:

* Revenue
* Revenue Growth
* Gross Profit
* Gross Margin
* Operating Income
* Operating Margin
* Net Income
* Net Margin
* EBITDA
* EBITDA Margin
* Total Assets
* Total Liabilities
* Equity
* Cash
* Debt
* Current Ratio
* Quick Ratio
* Debt-to-Equity
* ROE
* ROA
* EPS
* P/E Ratio
* Operating Cash Flow
* Capital Expenditures
* Free Cash Flow

### ⚠️ Risk Analysis

The Risk Agent analyzes documents for risks including:

* Liquidity Risk
* Debt Risk
* Regulatory Risk
* Market Risk
* Concentration Risk
* Operational Risk
* Revenue Risk
* Margin Risk
* Competition Risk
* Going Concern Risk

Risk records can contain:

* Risk type
* Severity
* Title
* Description
* Supporting source text
* Page reference when available
* Recommendation

### 🏢 Company Benchmarking

Compare companies across:

* Financial metrics
* Margins
* Ratios
* Cash flow
* Debt
* Risk indicators

The system presents structured comparisons to support financial research and analysis.

### 📑 AI-Generated Reports

Generate structured reports containing:

* Executive Summary
* Key Findings
* Metric Comparisons
* Risk Summary
* Recommendations
* Full Report Content

### 💬 Research Agent

Ask natural-language questions about your financial documents.

Example:

```text
What is the revenue trend?

What is the operating margin?

What risks are mentioned in the Risk Factors section?

Compare cash flow and debt-to-equity across two companies.

What evidence supports the concentration risk?
```

The Research Agent retrieves relevant document chunks, stored financial metrics, risk information, and source evidence before generating a response.

### 🔄 Local Fallback Mode

Gemini is the preferred AI provider, but the application includes fallback behavior for supported workflows.

When AI services or quota are unavailable, the system can continue providing stored:

* Financial metrics
* Risk indicators
* Relevant document excerpts
* Document citations
* Local research results

This helps keep core document indexing and retrieval useful even when the external AI provider is unavailable.

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │      User Browser    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Next.js 16      │
                         │      React 19        │
                         │      App Router      │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
       ┌─────────────┐      ┌──────────────┐      ┌──────────────┐
       │  NextAuth   │      │  API Routes  │      │  Dashboard   │
       │Authentication│      │              │      │     UI       │
       └─────────────┘      └──────┬───────┘      └──────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Multi-Agent Layer  │
                         └──────────┬───────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
 ┌────────────────┐       ┌────────────────┐       ┌────────────────┐
 │ Document Agent │       │Extraction Agent│       │   Risk Agent   │
 └────────────────┘       └────────────────┘       └────────────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                       ┌────────────┴────────────┐
                       │                         │
                       ▼                         ▼
              ┌────────────────┐       ┌──────────────────┐
              │Benchmark Agent │       │ Research Agent   │
              └────────────────┘       └────────┬─────────┘
                                                 │
                         ┌───────────────────────┼──────────────────────┐
                         │                       │                      │
                         ▼                       ▼                      ▼
                 ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
                 │ PostgreSQL   │       │ Google Gemini│       │   Document   │
                 │ + Drizzle ORM│       │     API      │       │  Processing  │
                 └──────────────┘       └──────────────┘       └──────────────┘
```

---
