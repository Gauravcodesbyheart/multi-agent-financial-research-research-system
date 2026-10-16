/**
 * Demo/test document generator for FinResearch AI.
 *
 * Produces sample annual-report-style PDFs for 7 companies x FY2023..FY2026 whose text
 * matches the extraction label grammar (src/lib/agents/extractionUtils.ts) and the
 * deterministic red-flag patterns (src/lib/agents/analysisUtils.ts), so every product
 * feature can be demonstrated end to end.
 *
 * Run from the repository root:  node demo-test-data/generate-demo-pdfs.cjs
 * All figures are illustrative sample data for product demonstration only.
 */
const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const DISCLAIMER =
  "SAMPLE DOCUMENT - Illustrative figures prepared for product demonstration. " +
  "Values are approximate and must not be used for investment decisions.";

const M = (label, value) => `${label}: ${value}`;
const money = (v) => M("", `$${v.toLocaleString("en-US")} million`).replace(": $", ": $"); // unused helper guard

function metricsBlock(m) {
  return [
    M("Total revenue", `$${m.revenue.toLocaleString("en-US")} million`),
    M("Revenue growth (year-over-year)", `${m.growth}%`),
    M("Gross profit", `$${m.grossProfit.toLocaleString("en-US")} million`),
    M("Gross margin", `${m.grossMargin}%`),
    M("Operating income", `$${m.operatingIncome.toLocaleString("en-US")} million`),
    M("Operating margin", `${m.operatingMargin}%`),
    M("Net income", `$${m.netIncome.toLocaleString("en-US")} million`),
    M("Net margin", `${m.netMargin}%`),
    M("EBITDA", `$${m.ebitda.toLocaleString("en-US")} million`),
    M("EBITDA margin", `${m.ebitdaMargin}%`),
    M("Earnings per share (basic)", `$${m.eps.toFixed(2)}`),
  ];
}

function balanceBlock(m) {
  return [
    M("Total assets", `$${m.totalAssets.toLocaleString("en-US")} million`),
    M("Total liabilities", `$${m.totalLiabilities.toLocaleString("en-US")} million`),
    M("Total equity", `$${m.totalEquity.toLocaleString("en-US")} million`),
    M("Cash and equivalents", `$${m.cash.toLocaleString("en-US")} million`),
    M("Total debt", `$${m.totalDebt.toLocaleString("en-US")} million`),
  ];
}

function ratioBlock(m) {
  return [
    M("Current ratio", m.currentRatio.toFixed(2)),
    M("Quick ratio", m.quickRatio.toFixed(2)),
    M("Debt-to-equity", m.debtToEquity.toFixed(2)),
    M("Return on equity", `${m.roe}%`),
    M("Return on assets", `${m.roa}%`),
    M("Price-to-earnings ratio", m.pe.toFixed(1)),
  ];
}

function cashFlowBlock(m) {
  return [
    M("Operating cash flow", `$${m.ocf.toLocaleString("en-US")} million`),
    M("Capital expenditures", `$${m.capex.toLocaleString("en-US")} million`),
    M("Free cash flow", `$${m.fcf.toLocaleString("en-US")} million`),
  ];
}

/** Company + year content. `flags` inserts the deterministic red-flag phrases on purpose. */
const COMPANIES = [
  {
    folder: "Apple", name: "Apple Inc.", ticker: "AAPL", fyEnd: "the fiscal year ended in September",
    segments: "iPhone, Mac, iPad, Wearables/Home/Accessories, and Services",
    overview: (fy) => `Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories, and sells a variety of related services. In fiscal year ${fy} the company operated across the following reportable segments: iPhone, Mac, iPad, Wearables/Home/Accessories, and Services. The company sells through its retail and online stores, direct sales force, and indirect resellers worldwide, and employs a global supply chain centered on contract manufacturing partners in Asia.`,
    years: {
      2023: { revenue: 383285, growth: "-2.8", grossProfit: 169148, grossMargin: "44.1", operatingIncome: 114301, operatingMargin: "29.8", netIncome: 96995, netMargin: "25.3", ebitda: 125820, ebitdaMargin: "32.8", totalAssets: 352583, totalLiabilities: 290437, totalEquity: 62146, cash: 61555, totalDebt: 111088, currentRatio: 0.99, quickRatio: 0.94, debtToEquity: 1.79, roe: "156.0", roa: "27.5", eps: 6.13, pe: 28.4, ocf: 110543, capex: 10959, fcf: 99584 },
      2024: { revenue: 391035, growth: "2.0", grossProfit: 180682, grossMargin: "46.2", operatingIncome: 123216, operatingMargin: "31.5", netIncome: 93736, netMargin: "24.0", ebitda: 134661, ebitdaMargin: "34.4", totalAssets: 364980, totalLiabilities: 308030, totalEquity: 56950, cash: 65171, totalDebt: 106629, currentRatio: 0.87, quickRatio: 0.83, debtToEquity: 1.87, roe: "164.6", roa: "25.7", eps: 6.08, pe: 34.1, ocf: 118254, capex: 9447, fcf: 108807 },
      2025: { revenue: 408000, growth: "4.3", grossProfit: 191760, grossMargin: "47.0", operatingIncome: 130152, operatingMargin: "31.9", netIncome: 102824, netMargin: "25.2", ebitda: 141680, ebitdaMargin: "34.7", totalAssets: 380000, totalLiabilities: 316000, totalEquity: 64000, cash: 68000, totalDebt: 101000, currentRatio: 0.92, quickRatio: 0.88, debtToEquity: 1.58, roe: "160.7", roa: "27.1", eps: 6.85, pe: 32.0, ocf: 125000, capex: 11200, fcf: 113800 },
      2026: { revenue: 425000, growth: "4.2", grossProfit: 200600, grossMargin: "47.2", operatingIncome: 136425, operatingMargin: "32.1", netIncome: 107100, netMargin: "25.2", ebitda: 148300, ebitdaMargin: "34.9", totalAssets: 398000, totalLiabilities: 327000, totalEquity: 71000, cash: 72000, totalDebt: 97000, currentRatio: 0.95, quickRatio: 0.91, debtToEquity: 1.37, roe: "150.8", roa: "26.9", eps: 7.15, pe: 30.5, ocf: 131000, capex: 12000, fcf: 119000 },
    },
  },
  {
    folder: "Microsoft", name: "Microsoft Corporation", ticker: "MSFT", fyEnd: "the fiscal year ended June 30",
    segments: "Productivity and Business Processes, Intelligent Cloud, and More Personal Computing",
    overview: (fy) => `Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide. In fiscal year ${fy} the company operated across three reportable segments: Productivity and Business Processes, Intelligent Cloud, and More Personal Computing. Its offerings include Office 365, Windows, Azure cloud services, LinkedIn, and Xbox. The company serves consumers, small and mid-sized businesses, large enterprises, and public-sector customers through direct and partner channels.`,
    years: {
      2023: { revenue: 211915, growth: "6.9", grossProfit: 146052, grossMargin: "68.9", operatingIncome: 88523, operatingMargin: "41.8", netIncome: 72361, netMargin: "34.1", ebitda: 97304, ebitdaMargin: "45.9", totalAssets: 411976, totalLiabilities: 205753, totalEquity: 206223, cash: 111262, totalDebt: 79548, currentRatio: 1.77, quickRatio: 1.74, debtToEquity: 0.39, roe: "35.1", roa: "17.6", eps: 9.68, pe: 33.8, ocf: 87582, capex: 28107, fcf: 59475 },
      2024: { revenue: 245122, growth: "15.7", grossProfit: 171008, grossMargin: "69.8", operatingIncome: 109433, operatingMargin: "44.6", netIncome: 88136, netMargin: "36.0", ebitda: 122582, ebitdaMargin: "50.0", totalAssets: 512163, totalLiabilities: 243686, totalEquity: 268477, cash: 75543, totalDebt: 67127, currentRatio: 1.27, quickRatio: 1.24, debtToEquity: 0.25, roe: "32.8", roa: "17.2", eps: 11.8, pe: 36.5, ocf: 118548, capex: 44477, fcf: 74071 },
      2025: { revenue: 281724, growth: "14.9", grossProfit: 195571, grossMargin: "69.4", operatingIncome: 128002, operatingMargin: "45.4", netIncome: 101804, netMargin: "36.1", ebitda: 145760, ebitdaMargin: "51.7", totalAssets: 619000, totalLiabilities: 285000, totalEquity: 334000, cash: 95000, totalDebt: 60000, currentRatio: 1.3, quickRatio: 1.27, debtToEquity: 0.18, roe: "30.5", roa: "16.4", eps: 13.62, pe: 34.2, ocf: 136000, capex: 64000, fcf: 72000 },
      2026: { revenue: 319500, growth: "13.4", grossProfit: 223650, grossMargin: "70.0", operatingIncome: 148500, operatingMargin: "46.5", netIncome: 116500, netMargin: "36.5", ebitda: 172000, ebitdaMargin: "53.8", totalAssets: 700000, totalLiabilities: 320000, totalEquity: 380000, cash: 105000, totalDebt: 56000, currentRatio: 1.32, quickRatio: 1.29, debtToEquity: 0.15, roe: "30.7", roa: "16.6", eps: 15.6, pe: 31.8, ocf: 158000, capex: 78000, fcf: 80000 },
    },
  },
  {
    folder: "Tesla", name: "Tesla, Inc.", ticker: "TSLA", fyEnd: "the fiscal year ended December 31",
    segments: "Automotive, Energy Generation and Storage, and Services and Other",
    overview: (fy) => `Tesla, Inc. designs, develops, manufactures, and sells electric vehicles and energy generation and storage systems. In fiscal year ${fy} the company operated across the following reportable segments: Automotive, Energy Generation and Storage, and Services and Other. The company also offers vehicle service, insurance, and charging network access. Products are sold worldwide through a direct customer interface and company-owned stores.`,
    years: {
      2023: { revenue: 96773, growth: "18.8", grossProfit: 17660, grossMargin: "18.2", operatingIncome: 8891, operatingMargin: "9.2", netIncome: 14997, netMargin: "15.5", ebitda: 16600, ebitdaMargin: "17.2", totalAssets: 106618, totalLiabilities: 43009, totalEquity: 63609, cash: 29094, totalDebt: 5570, currentRatio: 1.73, quickRatio: 1.42, debtToEquity: 0.09, roe: "23.6", roa: "14.1", eps: 4.3, pe: 78.2, ocf: 13256, capex: 8893, fcf: 4363 },
      2024: { revenue: 97690, growth: "0.9", grossProfit: 17450, grossMargin: "17.9", operatingIncome: 7150, operatingMargin: "7.3", netIncome: 7091, netMargin: "7.3", ebitda: 14900, ebitdaMargin: "15.3", totalAssets: 122070, totalLiabilities: 48600, totalEquity: 73470, cash: 33650, totalDebt: 6800, currentRatio: 2.06, quickRatio: 1.79, debtToEquity: 0.09, roe: "9.6", roa: "5.8", eps: 2.04, pe: 112.0, ocf: 14923, capex: 11358, fcf: 3565 },
      2025: { revenue: 92000, growth: "-5.8", grossProfit: 13616, grossMargin: "14.8", operatingIncome: 3588, operatingMargin: "3.9", netIncome: 2760, netMargin: "3.0", ebitda: 11000, ebitdaMargin: "12.0", totalAssets: 118000, totalLiabilities: 57000, totalEquity: 61000, cash: 21000, totalDebt: 12500, currentRatio: 1.2, quickRatio: 0.92, debtToEquity: 0.2, roe: "4.5", roa: "2.3", eps: 0.8, pe: 165.0, ocf: 6500, capex: 11000, fcf: -4500 },
      2026: { revenue: 88000, growth: "-4.3", grossProfit: 12144, grossMargin: "13.8", operatingIncome: 880, operatingMargin: "1.0", netIncome: 528, netMargin: "0.6", ebitda: 9200, ebitdaMargin: "10.5", totalAssets: 112000, totalLiabilities: 62000, totalEquity: 50000, cash: 14000, totalDebt: 18000, currentRatio: 0.95, quickRatio: 0.68, debtToEquity: 0.36, roe: "1.1", roa: "0.5", eps: 0.15, pe: 420.0, ocf: 4800, capex: 9500, fcf: -4700 },
    },
  },
  {
    folder: "Amazon", name: "Amazon.com, Inc.", ticker: "AMZN", fyEnd: "the fiscal year ended December 31",
    segments: "North America, International, and Amazon Web Services",
    overview: (fy) => `Amazon.com, Inc. engages in the retail sale of consumer products, advertising, and subscription services worldwide, and provides cloud infrastructure services through Amazon Web Services. In fiscal year ${fy} the company operated across the following reportable segments: North America, International, and Amazon Web Services. The company also offers marketplace fulfillment, logistics, and device products including Kindle and Echo.`,
    years: {
      2023: { revenue: 574785, growth: "11.8", grossProfit: 270041, grossMargin: "47.0", operatingIncome: 36852, operatingMargin: "6.4", netIncome: 30425, netMargin: "5.3", ebitda: 84500, ebitdaMargin: "14.7", totalAssets: 527854, totalLiabilities: 325205, totalEquity: 202649, cash: 73385, totalDebt: 132000, currentRatio: 1.05, quickRatio: 0.87, debtToEquity: 0.65, roe: "15.0", roa: "5.8", eps: 2.9, pe: 72.4, ocf: 84946, capex: 48389, fcf: 36557 },
      2024: { revenue: 637959, growth: "11.0", grossProfit: 301200, grossMargin: "47.2", operatingIncome: 68593, operatingMargin: "10.8", netIncome: 59248, netMargin: "9.3", ebitda: 123000, ebitdaMargin: "19.3", totalAssets: 624894, totalLiabilities: 338000, totalEquity: 286894, cash: 89000, totalDebt: 128000, currentRatio: 1.06, quickRatio: 0.88, debtToEquity: 0.45, roe: "20.6", roa: "9.5", eps: 5.53, pe: 38.2, ocf: 115800, capex: 77000, fcf: 38800 },
      2025: { revenue: 705000, growth: "10.5", grossProfit: 334000, grossMargin: "47.4", operatingIncome: 78500, operatingMargin: "11.1", netIncome: 66000, netMargin: "9.4", ebitda: 138000, ebitdaMargin: "19.6", totalAssets: 700000, totalLiabilities: 365000, totalEquity: 335000, cash: 95000, totalDebt: 122000, currentRatio: 1.07, quickRatio: 0.89, debtToEquity: 0.36, roe: "19.7", roa: "9.4", eps: 6.1, pe: 34.0, ocf: 130000, capex: 88000, fcf: 42000 },
      2026: { revenue: 780000, growth: "10.6", grossProfit: 372000, grossMargin: "47.7", operatingIncome: 90500, operatingMargin: "11.6", netIncome: 76500, netMargin: "9.8", ebitda: 157000, ebitdaMargin: "20.1", totalAssets: 785000, totalLiabilities: 400000, totalEquity: 385000, cash: 102000, totalDebt: 118000, currentRatio: 1.08, quickRatio: 0.9, debtToEquity: 0.31, roe: "19.9", roa: "9.7", eps: 7.05, pe: 31.5, ocf: 148000, capex: 98000, fcf: 50000 },
    },
  },
  {
    folder: "Reliance-Industries", name: "Reliance Industries Limited", ticker: "RELIANCE", fyEnd: "the fiscal year ended March 31 (figures translated to USD millions)",
    segments: "Oil to Chemicals, Digital Services (Jio), and Retail",
    overview: (fy) => `Reliance Industries Limited is an Indian diversified conglomerate with activities spanning energy, petrochemicals, retail, and digital services. In fiscal year ${fy} the company operated across the following reportable segments: Oil to Chemicals, Digital Services, and Retail. The company operates one of the world's largest refining complexes, a nationwide telecommunications network, and one of India's largest retail store networks. Monetary amounts in this sample are presented in millions of US dollars for demonstration.`,
    years: {
      2023: { revenue: 108000, growth: "12.5", grossProfit: 34560, grossMargin: "32.0", operatingIncome: 16520, operatingMargin: "15.3", netIncome: 9100, netMargin: "8.4", ebitda: 22700, ebitdaMargin: "21.0", totalAssets: 215000, totalLiabilities: 118000, totalEquity: 97000, cash: 22000, totalDebt: 42000, currentRatio: 1.15, quickRatio: 0.82, debtToEquity: 0.43, roe: "9.4", roa: "4.2", eps: 6.7, pe: 28.0, ocf: 18500, capex: 12000, fcf: 6500 },
      2024: { revenue: 116000, growth: "7.4", grossProfit: 37120, grossMargin: "32.0", operatingIncome: 17200, operatingMargin: "14.8", netIncome: 9700, netMargin: "8.4", ebitda: 24000, ebitdaMargin: "20.7", totalAssets: 228000, totalLiabilities: 131000, totalEquity: 97000, cash: 20000, totalDebt: 48000, currentRatio: 1.1, quickRatio: 0.78, debtToEquity: 0.49, roe: "10.0", roa: "4.3", eps: 7.15, pe: 26.5, ocf: 19000, capex: 13500, fcf: 5500 },
      2025: { revenue: 122000, growth: "5.2", grossProfit: 38552, grossMargin: "31.6", operatingIncome: 17300, operatingMargin: "14.2", netIncome: 9900, netMargin: "8.1", ebitda: 24600, ebitdaMargin: "20.2", totalAssets: 242000, totalLiabilities: 146000, totalEquity: 96000, cash: 18000, totalDebt: 54000, currentRatio: 1.05, quickRatio: 0.74, debtToEquity: 0.56, roe: "10.3", roa: "4.1", eps: 7.3, pe: 27.2, ocf: 19500, capex: 14500, fcf: 5000 },
      2026: { revenue: 128000, growth: "4.9", grossProfit: 40064, grossMargin: "31.3", operatingIncome: 17400, operatingMargin: "13.6", netIncome: 10100, netMargin: "7.9", ebitda: 25300, ebitdaMargin: "19.8", totalAssets: 258000, totalLiabilities: 162000, totalEquity: 96000, cash: 16500, totalDebt: 61000, currentRatio: 1.0, quickRatio: 0.7, debtToEquity: 0.64, roe: "10.5", roa: "3.9", eps: 7.45, pe: 28.1, ocf: 20000, capex: 15500, fcf: 4500 },
    },
  },
  {
    folder: "Infosys", name: "Infosys Limited", ticker: "INFY", fyEnd: "the fiscal year ended March 31 (figures translated to USD millions)",
    segments: "Financial Services, Retail, Energy, Communication, Hi-Tech, Manufacturing, and Life Sciences",
    overview: (fy) => `Infosys Limited provides consulting, technology, outsourcing, and next-generation digital services worldwide. In fiscal year ${fy} the company served clients across the following industry segments: Financial Services, Retail, Energy, Communication, Hi-Tech, Manufacturing, and Life Sciences. The company's service portfolio includes application development and maintenance, cloud transformation, data analytics, and enterprise application services delivered through global delivery centers.`,
    years: {
      2023: { revenue: 18212, growth: "8.7", grossProfit: 5828, grossMargin: "32.0", operatingIncome: 4043, operatingMargin: "22.2", netIncome: 2977, netMargin: "16.3", ebitda: 4553, ebitdaMargin: "25.0", totalAssets: 17420, totalLiabilities: 6220, totalEquity: 11200, cash: 2560, totalDebt: 900, currentRatio: 2.4, quickRatio: 2.4, debtToEquity: 0.08, roe: "29.8", roa: "17.1", eps: 0.71, pe: 24.5, ocf: 3750, capex: 620, fcf: 3130 },
      2024: { revenue: 18588, growth: "2.1", grossProfit: 5950, grossMargin: "32.0", operatingIncome: 4120, operatingMargin: "22.2", netIncome: 3100, netMargin: "16.7", ebitda: 4680, ebitdaMargin: "25.2", totalAssets: 18200, totalLiabilities: 6350, totalEquity: 11850, cash: 2700, totalDebt: 850, currentRatio: 2.35, quickRatio: 2.35, debtToEquity: 0.07, roe: "27.2", roa: "17.0", eps: 0.75, pe: 22.8, ocf: 3900, capex: 650, fcf: 3250 },
      2025: { revenue: 19200, growth: "3.3", grossProfit: 6100, grossMargin: "31.8", operatingIncome: 4180, operatingMargin: "21.8", netIncome: 3180, netMargin: "16.6", ebitda: 4800, ebitdaMargin: "25.0", totalAssets: 19100, totalLiabilities: 6500, totalEquity: 12600, cash: 2850, totalDebt: 800, currentRatio: 2.3, quickRatio: 2.3, debtToEquity: 0.06, roe: "26.0", roa: "16.6", eps: 0.77, pe: 21.5, ocf: 4050, capex: 700, fcf: 3350 },
      2026: { revenue: 20100, growth: "4.7", grossProfit: 6430, grossMargin: "32.0", operatingIncome: 4380, operatingMargin: "21.8", netIncome: 3350, netMargin: "16.7", ebitda: 5050, ebitdaMargin: "25.1", totalAssets: 20100, totalLiabilities: 6700, totalEquity: 13400, cash: 3050, totalDebt: 750, currentRatio: 2.25, quickRatio: 2.25, debtToEquity: 0.06, roe: "25.5", roa: "16.7", eps: 0.81, pe: 21.0, ocf: 4250, capex: 750, fcf: 3500 },
    },
  },
  {
    folder: "TCS", name: "Tata Consultancy Services Limited", ticker: "TCS", fyEnd: "the fiscal year ended March 31 (figures translated to USD millions)",
    segments: "Banking and Financial Services, Retail and CPG, Communication Media and Technology, and Manufacturing",
    overview: (fy) => `Tata Consultancy Services Limited provides information technology services, consulting, and business solutions worldwide. In fiscal year ${fy} the company served clients across the following industry segments: Banking and Financial Services, Retail and CPG, Communication Media and Technology, and Manufacturing. The company delivers application development, cloud migration, cognitive business operations, and enterprise platform services through its global network of delivery centers.`,
    years: {
      2023: { revenue: 27927, growth: "9.4", grossProfit: 8270, grossMargin: "29.6", operatingIncome: 6470, operatingMargin: "23.2", netIncome: 6163, netMargin: "22.1", ebitda: 7050, ebitdaMargin: "25.2", totalAssets: 19800, totalLiabilities: 5900, totalEquity: 13900, cash: 2100, totalDebt: 600, currentRatio: 2.15, quickRatio: 2.15, debtToEquity: 0.04, roe: "47.0", roa: "31.1", eps: 1.7, pe: 27.5, ocf: 6600, capex: 750, fcf: 5850 },
      2024: { revenue: 29080, growth: "4.1", grossProfit: 8680, grossMargin: "29.8", operatingIncome: 6780, operatingMargin: "23.3", netIncome: 6480, netMargin: "22.3", ebitda: 7450, ebitdaMargin: "25.6", totalAssets: 21000, totalLiabilities: 6100, totalEquity: 14900, cash: 2250, totalDebt: 550, currentRatio: 2.2, quickRatio: 2.2, debtToEquity: 0.04, roe: "46.0", roa: "30.9", eps: 1.79, pe: 26.8, ocf: 6950, capex: 780, fcf: 6170 },
      2025: { revenue: 30100, growth: "3.5", grossProfit: 9000, grossMargin: "29.9", operatingIncome: 7030, operatingMargin: "23.4", netIncome: 6720, netMargin: "22.3", ebitda: 7750, ebitdaMargin: "25.7", totalAssets: 22100, totalLiabilities: 6300, totalEquity: 15800, cash: 2400, totalDebt: 500, currentRatio: 2.25, quickRatio: 2.25, debtToEquity: 0.03, roe: "45.0", roa: "30.4", eps: 1.86, pe: 25.5, ocf: 7250, capex: 800, fcf: 6450 },
      2026: { revenue: 31400, growth: "4.3", grossProfit: 9420, grossMargin: "30.0", operatingIncome: 7390, operatingMargin: "23.5", netIncome: 7050, netMargin: "22.5", ebitda: 8160, ebitdaMargin: "26.0", totalAssets: 23300, totalLiabilities: 6500, totalEquity: 16800, cash: 2600, totalDebt: 450, currentRatio: 2.3, quickRatio: 2.3, debtToEquity: 0.03, roe: "44.5", roa: "30.3", eps: 1.95, pe: 24.8, ocf: 7600, capex: 850, fcf: 6750 },
    },
  },
];

/** Deterministic red-flag phrases (only in Tesla FY2026 on purpose). */
function riskSection(company, fy) {
  const common = `The company's business, operating results, and financial condition are subject to the following risks, among others. Competitive intensity in ${company.segments.split(",")[0].toLowerCase()} could pressure pricing and market share. Fluctuations in foreign currency exchange rates may materially affect reported results. Regulatory changes, including data privacy, environmental, and trade regulations, could increase compliance costs. The company depends on a limited number of key suppliers and contract manufacturers; disruption could delay product shipments. Cybersecurity incidents or service outages could harm customers and reputation. Litigation and regulatory investigations, including class action lawsuits relating to product and commercial matters, could result in significant costs and adverse outcomes. Customer concentration in certain segments may amplify the effect of demand changes.`;
  if (company.folder === "Tesla" && fy === 2026) {
    return (
      common +
      "\n\nDuring fiscal year 2026 the company identified a material weakness in internal control over financial reporting related to the review of certain accounting estimates. Management's remediation plan is described in the notes to the financial statements. " +
      "As a result of recurring operating losses and negative free cash flow, there is substantial doubt about the company's ability to continue as a going concern, and the independent auditors issued a qualified audit opinion with respect to these matters. " +
      "The company is currently in breach of a debt covenant under its revolving credit facility and is negotiating amendments with its lenders. If the company is unable to meet its obligations as they fall due, it may need to restructure its indebtedness or raise additional capital on unfavorable terms."
    );
  }
  if (company.folder === "Tesla" && fy === 2025) {
    return (
      common +
      "\n\nThe company's deliveries declined during fiscal year 2025 and average selling prices were reduced in several markets. Sustained pricing pressure together with elevated capital expenditures at existing factories has materially reduced operating cash available for discretionary investment. A decline in demand for the company's vehicles, or an inability to achieve planned cost reductions, could further adversely affect results of operations and liquidity."
    );
  }
  return common;
}

function mdnaSection(company, fy, m) {
  const dir = m.growth.startsWith("-") ? "decreased" : "increased";
  return (
    `Management's discussion and analysis of financial condition and results of operations is based on the company's consolidated financial statements for fiscal year ${fy}. ` +
    `The top line ${dir} during the year as reflected in the consolidated statements of operations. Operating performance was supported by the company's ${company.segments} portfolio, while operating expenses reflected continued investment in research and development, go-to-market capacity, and infrastructure. ` +
    `Within the results of operations, cost of revenue and operating expenses are presented by natural classification in the accompanying statements. ` +
    `Selling, general and administrative expenses remained broadly stable as a share of the top line, and the company continued its share repurchase and dividend programs where applicable. ` +
    `Management believes that cash on hand together with cash generated from operations is sufficient to fund operations, capital expenditures, and financing activities for at least the next twelve months.`
  );
}

function liquiditySection(m) {
  return (
    `LIQUIDITY AND CAPITAL RESOURCES\n` +
    `Cash and equivalents were $${m.cash.toLocaleString("en-US")} million at the end of fiscal year, and total debt stood at $${m.totalDebt.toLocaleString("en-US")} million. ` +
    `Cash provided by operating activities was $${m.ocf.toLocaleString("en-US")} million. Capital expenditures were $${m.capex.toLocaleString("en-US")} million, and free cash flow was $${m.fcf.toLocaleString("en-US")} million. ` +
    `The company's liquidity position is supported by committed and uncommitted credit facilities with major financial institutions, together with access to commercial paper markets where applicable. Contractual obligations include operating lease commitments, purchase obligations for inventory and manufacturing services, and debt maturities.`
  );
}

function notesSection(company, fy) {
  const clean =
    `Note 1 - Basis of presentation: The consolidated financial statements have been prepared in accordance with accounting principles generally accepted in the United States of America (or, where applicable, local GAAP) and include the accounts of the company and its wholly owned subsidiaries. ` +
    `Note 2 - Summary of significant accounting policies: Revenue is recognized when control of promised goods or services is transferred to customers. The company's independent registered public accounting firm audited the consolidated financial statements and issued an unqualified audit opinion stating that the statements present fairly, in all material respects, the financial position of the company. ` +
    `Note 3 - Revenue by segment: Segment information for ${company.segments} is presented in Note 12. Note 4 - Inventories. Note 5 - Property, plant and equipment. Note 6 - Long-term debt. Note 7 - Leases. Note 8 - Income taxes. Note 9 - Commitments and contingencies, including certain litigation matters and regulatory investigations disclosed in the risk factors section. Note 10 - Stockholders' equity. Note 11 - Earnings per share. Note 12 - Segment information.`;
  return clean;
}

function buildDocument(company, fy, m) {
  const lines = [];
  lines.push(`${company.name.toUpperCase()} (${company.ticker})`);
  lines.push(`ANNUAL REPORT - FISCAL YEAR ${fy}`);
  lines.push(`For ${company.fyEnd}`);
  lines.push("Fiscal period: Annual");
  lines.push(`Fiscal year: ${fy}`);
  lines.push(DISCLAIMER);
  lines.push("");
  lines.push("BUSINESS OVERVIEW");
  lines.push(company.overview(fy));
  lines.push(
    `Principal executive offices are maintained in the company's home market, and operations are conducted through subsidiaries and branches in major regions worldwide. The consolidated financial statements presented in this annual report cover the results of operations, financial position, and cash flows for fiscal year ${fy} and, where presented for comparison, the prior fiscal year.`
  );
  lines.push("");
  lines.push("RESULTS OF OPERATIONS");
  lines.push(`Key financial metrics for fiscal year ${fy} (amounts in millions of US dollars, ratios and margins as stated):`);
  lines.push(...metricsBlock(m));
  lines.push("");
  lines.push("Consolidated balance sheet data:");
  lines.push(...balanceBlock(m));
  lines.push("");
  lines.push("Key ratios:");
  lines.push(...ratioBlock(m));
  lines.push("");
  lines.push("Cash flow data:");
  lines.push(...cashFlowBlock(m));
  lines.push("");
  lines.push("Management commentary on results of operations:");
  lines.push(mdnaSection(company, fy, m));
  lines.push("");
  lines.push("FINANCIAL STATEMENTS");
  lines.push(
    `Consolidated Statements of Operations - Fiscal Year ${fy}\n` +
      `Total revenue: $${m.revenue.toLocaleString("en-US")} million\n` +
      `Cost of revenue: $${(m.revenue - m.grossProfit).toLocaleString("en-US")} million\n` +
      `Gross profit: $${m.grossProfit.toLocaleString("en-US")} million\n` +
      `Operating expenses: $${(m.grossProfit - m.operatingIncome).toLocaleString("en-US")} million\n` +
      `Operating income: $${m.operatingIncome.toLocaleString("en-US")} million\n` +
      `Net income: $${m.netIncome.toLocaleString("en-US")} million\n` +
      `Earnings per share (basic): $${m.eps.toFixed(2)}`
  );
  lines.push("");
  lines.push(
    `Consolidated Balance Sheets - End of Fiscal Year ${fy}\n` +
      `Total assets: $${m.totalAssets.toLocaleString("en-US")} million\n` +
      `Total liabilities: $${m.totalLiabilities.toLocaleString("en-US")} million\n` +
      `Total equity: $${m.totalEquity.toLocaleString("en-US")} million\n` +
      `Cash and equivalents: $${m.cash.toLocaleString("en-US")} million\n` +
      `Total debt: $${m.totalDebt.toLocaleString("en-US")} million`
  );
  lines.push("");
  lines.push(
    `Consolidated Statements of Cash Flows - Fiscal Year ${fy}\n` +
      `Operating cash flow: $${m.ocf.toLocaleString("en-US")} million\n` +
      `Capital expenditures: $${m.capex.toLocaleString("en-US")} million\n` +
      `Free cash flow: $${m.fcf.toLocaleString("en-US")} million`
  );
  lines.push("");
  lines.push("RISK FACTORS");
  lines.push(riskSection(company, fy));
  lines.push("");
  lines.push(liquiditySection(m));
  lines.push("");
  lines.push("NOTES TO FINANCIAL STATEMENTS");
  lines.push(notesSection(company, fy));
  lines.push("");
  lines.push(DISCLAIMER);
  return lines.join("\n");
}

function renderPdf(title, text) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const rawLines = text.split("\n");
  for (const raw of rawLines) {
    const isHeading = /^[A-Z][A-Z \-]{4,}$/.test(raw.trim()) && raw.trim().length < 60;
    const isTitle = raw === title || /^\S.*ANNUAL REPORT - FISCAL YEAR/.test(raw) || raw.includes("(AAPL)") || /\((MSFT|TSLA|AMZN|RELIANCE|INFY|TCS)\)/.test(raw);
    if (isTitle) doc.setFont("helvetica", "bold");
    else if (isHeading) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    const size = isTitle ? 14 : isHeading ? 12 : 10;
    doc.setFontSize(size);
    const lineHeight = size + 4;

    const wrapped = raw.trim() === "" ? [""] : doc.splitTextToSize(raw, maxWidth);
    for (const line of wrapped) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    if (raw.trim() === "") y += 4;
  }
  return Buffer.from(doc.output("arraybuffer"));
}

// ─── Generate ────────────────────────────────────────────────────────────────
const outRoot = __dirname;
let count = 0;
const manifest = [];
for (const company of COMPANIES) {
  const dir = path.join(outRoot, company.folder);
  fs.mkdirSync(dir, { recursive: true });
  for (const fy of [2023, 2024, 2025, 2026]) {
    const m = company.years[fy];
    const text = buildDocument(company, fy, m);
    const fileName = `${company.folder}_Annual_Report_FY${fy}.pdf`;
    const title = `${company.name.toUpperCase()} (${company.ticker})`;
    const pdf = renderPdf(title, text);
    fs.writeFileSync(path.join(dir, fileName), pdf);
    manifest.push({ company: company.name, ticker: company.ticker, fy, file: `${company.folder}/${fileName}`, bytes: pdf.length });
    count += 1;
    console.log(`generated ${company.folder}/${fileName} (${pdf.length} bytes)`);
  }
}
fs.writeFileSync(path.join(outRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nDone: ${count} PDFs written to demo-test-data/`);
