// Risk Agent — scans for red flags, anomalies, and risk indicators
import { db } from "@/db";
import { riskFlags, agentLogs } from "@/db/schema";
import { generateJSON } from "./gemini";

interface RiskItem {
  risk_type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  source_text?: string;
  page_reference?: string;
  recommendation?: string;
}

const RISK_SYSTEM = `You are an expert financial risk analyst AI specialized in identifying red flags,
anomalies, and material risks in financial documents including 10-K filings, annual reports,
and earnings transcripts. You identify: liquidity risks, debt risks, revenue concentration risks,
margin deterioration, going concern issues, regulatory risks, management risk, and market risks.
Return only valid JSON — no markdown, no explanation.`;

function findLocalRisks(content: string): RiskItem[] {
  const checks: Array<{ pattern: RegExp; type: string; title: string; recommendation: string }> = [
    { pattern: /risk factor|risk factors|uncertaint/i, type: "Market Risk", title: "Documented business risks", recommendation: "Review the cited risk disclosures and monitor changes in exposure." },
    { pattern: /debt|borrowings|interest expense|leverage/i, type: "Debt Risk", title: "Debt and leverage exposure", recommendation: "Monitor leverage, refinancing needs, and interest coverage." },
    { pattern: /liquidity|cash flow shortage|working capital/i, type: "Liquidity Risk", title: "Liquidity exposure", recommendation: "Review cash balances, operating cash flow, and near-term obligations." },
    { pattern: /regulatory|compliance|litigation|legal proceedings/i, type: "Regulatory Risk", title: "Regulatory or legal exposure", recommendation: "Review regulatory disclosures and pending legal matters." },
    { pattern: /supply chain|supplier concentration|geopolitical/i, type: "Operational Risk", title: "Operational disruption exposure", recommendation: "Assess supplier concentration and business continuity plans." },
  ];
  return checks.filter(({ pattern }) => pattern.test(content)).map(({ type, title, recommendation }) => ({
    risk_type: type,
    severity: "medium",
    title,
    description: "This risk indicator was identified locally because Gemini AI was unavailable. Review the source document for the detailed disclosure.",
    source_text: content.match(new RegExp(`.{0,80}${checks.find((check) => check.title === title)?.pattern.source}.{0,180}`, "i"))?.[0],
    recommendation,
  }));
}

export async function scanForRisks(
  documentId: string,
  content: string,
  companyId?: string
): Promise<void> {
  const start = Date.now();

  await db.insert(agentLogs).values({
    documentId,
    agentName: "Risk Agent",
    action: "Starting risk scan",
    status: "running",
    details: "Scanning document for red flags and anomalies...",
  });

  try {
    const excerpt = content.slice(0, 10000);

    const prompt = `Analyze this financial document for risks, red flags, and anomalies:

${excerpt}

Return a JSON array of risk items found. Each item must follow this structure:
{
  "risk_type": <one of: "Liquidity Risk", "Debt Risk", "Revenue Risk", "Margin Risk", "Regulatory Risk", "Management Risk", "Market Risk", "Going Concern", "Concentration Risk", "Operational Risk">,
  "severity": <"critical" | "high" | "medium" | "low">,
  "title": <short title of the risk, max 100 chars>,
  "description": <detailed description of the risk, 2-4 sentences>,
  "source_text": <exact quote from the document supporting this risk>,
  "recommendation": <actionable recommendation for addressing this risk>
}

Return between 3-8 risk items as a JSON array: []`;

    const risks = await generateJSON<RiskItem[]>(prompt, RISK_SYSTEM);

    if (Array.isArray(risks) && risks.length > 0) {
      const riskValues = risks.map((risk) => ({
        documentId,
        companyId: companyId || null,
        riskType: risk.risk_type || "Unknown",
        severity: risk.severity || "medium",
        title: risk.title || "Unknown Risk",
        description: risk.description || "",
        sourceText: risk.source_text || null,
        pageReference: risk.page_reference || null,
        recommendation: risk.recommendation || null,
      }));

      await db.insert(riskFlags).values(riskValues);
    }

    await db.insert(agentLogs).values({
      documentId,
      agentName: "Risk Agent",
      action: "Risk scan complete",
      status: "completed",
      details: `Identified ${Array.isArray(risks) ? risks.length : 0} risk factors`,
      duration: Date.now() - start,
    });
  } catch (error) {
    const fallbackRisks = findLocalRisks(content);
    if (fallbackRisks.length > 0) {
      await db.insert(riskFlags).values(fallbackRisks.map((risk) => ({
        documentId,
        companyId: companyId || null,
        riskType: risk.risk_type,
        severity: risk.severity,
        title: risk.title,
        description: risk.description,
        sourceText: risk.source_text || null,
        recommendation: risk.recommendation || null,
      })));
    }
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Risk Agent",
      action: "Risk scan completed with local fallback",
      status: "completed",
      details: `Gemini unavailable; identified ${fallbackRisks.length} local risk indicators`,
      duration: Date.now() - start,
    });
  }
}
