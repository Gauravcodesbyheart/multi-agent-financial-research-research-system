# FinResearch AI

### Multi-Agent AI Analysis System for Financial Research & Business Insights

FinResearch AI is a full-stack financial research workspace designed for finance students, MBA candidates, researchers, and early-career analysts.

The system transforms financial documents such as annual reports, 10-K filings, earnings transcripts, investor presentations, PDF files, DOCX files, and TXT files into searchable evidence, structured financial metrics, risk indicators, company comparisons, reports, and research answers.

The platform uses multiple specialized AI agents that work together to process documents, extract financial information, identify risks, compare companies, and answer research questions using document evidence and citations.

> **Disclaimer:** FinResearch AI is an educational and research tool. Its financial analysis is informational only and should not be considered investment, legal, accounting, or tax advice. Important financial values should always be verified against the original source document.

---

## ✨ Features

### 🔐 Authentication

* User registration
* Credential-based login
* Password hashing using bcryptjs
* NextAuth-based authentication
* Protected dashboard APIs
* Session-based access control

### 📚 Research Sessions

Create dedicated research workspaces containing:

* Session name
* Description
* Tags
* Uploaded documents
* Chat messages
* Generated reports
* Agent activity

### 📄 Document Analysis

Supported document formats:

* PDF
* DOCX
* TXT

The document processing pipeline:

```text
Upload Document
      ↓
Extract Text
      ↓
Create Document Record
      ↓
Clean & Split Content
      ↓
Create Searchable Chunks
      ↓
Financial Metric Extraction
      ↓
Risk Analysis
      ↓
Store Results
      ↓
Mark Document Completed
```

> Scanned or image-only PDFs require OCR before they can be reliably analyzed.

### 📊 Financial Metrics

The system can work with financial metrics including:

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
* Shareholders' Equity
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

The Risk Agent identifies and stores financial risk information such as:

* Liquidity risk
* Debt risk
* Regulatory risk
* Market risk
* Concentration risk
* Operational risk

Each risk can contain:

* Risk type
* Severity
* Title
* Description
* Source text
* Page reference
* Recommendation

### 🏢 Company Benchmarking

Compare two or more companies using stored:

* Financial metrics
* Ratios
* Margins
* Cash flow information
* Risk indicators

### 📑 AI Reports

Generate research reports containing:

* Executive Summary
* Key Findings
* Metric Comparisons
* Risk Summary
* Recommendations
* Full Report Content

### 💬 Research Agent

Ask questions about uploaded financial documents.

Example questions:

```text
What is the revenue trend?

What is the operating margin?

What risks are mentioned in the Risk Factors section?

Compare cash flow and debt-to-equity across two companies.

What evidence supports the concentration risk?
```

The Research Agent uses document chunks, stored metrics, stored risks, and source citations.

### 🔄 Local Fallback Mode

Gemini is the preferred AI provider, but the application is designed to remain useful when Gemini is unavailable.

Fallback functionality can provide:

* Stored financial metrics
* Stored risk indicators
* Relevant document excerpts
* Document citations
* Local research results

This allows core document indexing and retrieval to continue even when AI quota or availability is limited.

---

# 🤖 Multi-Agent Architecture

FinResearch AI uses five specialized agents:

```text
                         ┌─────────────────────┐
                         │   Financial File    │
                         │   PDF / DOCX / TXT  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Document Agent    │
                         │ Extract / Clean /   │
                         │ Section / Chunk     │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
          ┌──────────────────┐            ┌──────────────────┐
          │ Extraction Agent │            │    Risk Agent    │
          │ Financial Metrics│            │ Risk Detection   │
          └────────┬─────────┘            └────────┬─────────┘
                   │                               │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │  Benchm
```
