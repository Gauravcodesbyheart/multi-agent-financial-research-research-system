// Realistic seed data for demo companies — simulating 10-K annual report content

export const seedCompanies = [
  {
    name: "Apple Inc.",
    ticker: "AAPL",
    sector: "Technology",
    industry: "Consumer Electronics",
    description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",
  },
  {
    name: "Microsoft Corporation",
    ticker: "MSFT",
    sector: "Technology",
    industry: "Software",
    description: "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.",
  },
  {
    name: "Tesla, Inc.",
    ticker: "TSLA",
    sector: "Automotive",
    industry: "Electric Vehicles",
    description: "Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, energy generation and storage systems.",
  },
  {
    name: "Amazon.com, Inc.",
    ticker: "AMZN",
    sector: "Technology",
    industry: "E-Commerce & Cloud",
    description: "Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions through online and physical stores.",
  },
];

export const seedDocumentContent: Record<string, string> = {
  "Apple Inc.": `APPLE INC.
ANNUAL REPORT 2023
FORM 10-K

BUSINESS OVERVIEW
Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company also sells various related services. Apple was incorporated in California in January 1977. The company's products and services include iPhone, Mac, iPad, AirPods, Apple TV, Apple Watch, Beats products, HomePod, iPod touch, and various related services.

NET SALES BY PRODUCT
iPhone net sales: $205,489 million (52.0% of total net sales)
Mac net sales: $29,357 million (7.4% of total net sales)
iPad net sales: $28,300 million (7.2% of total net sales)
Wearables, Home and Accessories net sales: $39,845 million (10.1% of total net sales)
Services net sales: $85,200 million (21.6% of total net sales)
Total net sales: $394,328 million

RESULTS OF OPERATIONS
Net sales: $394,328 million (2023) vs $394,328 million (2022), decrease of $1,022 million
Gross margin: $169,148 million, representing 42.9% of net sales
Operating expenses: $54,847 million
Operating income: $114,301 million, representing 29.0% of net sales
Net income: $96,995 million
Earnings per share (diluted): $6.13

BALANCE SHEET
Total assets: $352,583 million
Cash and cash equivalents: $29,965 million
Total current assets: $143,566 million
Total current liabilities: $145,308 million
Long-term debt: $95,281 million
Total shareholders equity: $62,146 million

KEY FINANCIAL RATIOS
Current ratio: 0.99
Debt-to-equity ratio: 1.53
Return on equity: 156.08%
Return on assets: 27.51%
Gross margin: 42.9%
Operating margin: 29.0%
Net margin: 24.6%

CASH FLOW
Operating cash flow: $114,164 million
Capital expenditures: $10,959 million
Free cash flow: $103,205 million
Dividends paid: $14,996 million
Share repurchases: $77,550 million

RISK FACTORS
Macroeconomic and Industry Risks: The Company's operations and performance depend significantly on global and regional economic conditions. Adverse macroeconomic conditions, including slow economic growth, high unemployment, inflation, increased interest rates, or currency fluctuations, could adversely affect demand for Apple products and services.

Competition Risk: The markets for the Company's products and services are highly competitive. The Company faces competition from a broad range of global companies. If the Company fails to compete effectively, demand for its products and services may decline.

Supply Chain Risk: The Company depends on sole-source or limited-source suppliers for many components, which subjects the Company to supply chain risks. Disruptions to the supply chain could adversely affect the Company's financial results.

Geographic Concentration Risk: A significant portion of the Company's net sales comes from markets outside the United States. Revenue generated from China accounted for approximately 19% of total net sales in 2023, making the Company vulnerable to geopolitical tensions.

LIQUIDITY AND CAPITAL RESOURCES
The Company believes its existing cash and cash equivalents, along with commercial paper programs totaling $6.0 billion, provide adequate liquidity to meet its financial needs. The Company generated $114.2 billion in operating cash flows during 2023.

MANAGEMENT DISCUSSION AND ANALYSIS
Revenue was flat year-over-year due to foreign exchange headwinds of approximately $5.1 billion. Services revenue grew 16% to $85.2 billion, demonstrating continued ecosystem monetization. iPhone revenue declined 2% primarily due to macroeconomic headwinds in China. The Company returned over $90 billion to shareholders through dividends and buybacks.`,

  "Microsoft Corporation": `MICROSOFT CORPORATION
ANNUAL REPORT 2023
FORM 10-K

BUSINESS OVERVIEW
Microsoft Corporation is a technology company that develops and supports software, services, devices, and solutions worldwide. The company operates through three segments: Productivity and Business Processes, Intelligent Cloud, and More Personal Computing. Incorporated in 1975, Microsoft's mission is to empower every person and every organization on the planet to achieve more.

SEGMENT REVENUE
Productivity and Business Processes: $69,274 million (35% of total)
Intelligent Cloud (Azure): $87,907 million (44% of total)
More Personal Computing: $54,734 million (28% of total)
Total Revenue: $211,915 million

RESULTS OF OPERATIONS
Total revenue: $211,915 million (2023) vs $198,270 million (2022), increase of $13,645 million or 6.9%
Cost of revenue: $65,863 million
Gross margin: $146,052 million (68.9% gross margin)
Research and development: $27,195 million
Sales and marketing: $22,759 million
General and administrative: $7,575 million
Operating income: $88,523 million (41.8% operating margin)
Net income: $72,361 million
Earnings per share (diluted): $9.72

AZURE CLOUD GROWTH
Azure and other cloud services revenue grew 28% year-over-year
Azure AI services generated over $1 billion in annual revenue
Microsoft 365 Commercial cloud revenue grew 18%
Dynamics 365 revenue grew 25%

BALANCE SHEET
Total assets: $411,976 million
Cash and short-term investments: $111,262 million
Total current assets: $184,257 million
Total current liabilities: $104,149 million
Long-term debt: $41,990 million
Total shareholders equity: $206,223 million

KEY FINANCIAL RATIOS
Current ratio: 1.77
Debt-to-equity ratio: 0.20
Return on equity: 35.09%
Return on assets: 17.57%
Gross margin: 68.9%
Operating margin: 41.8%
Net margin: 34.1%
EPS (diluted): $9.72

CASH FLOW
Operating cash flow: $87,582 million
Capital expenditures: $28,107 million
Free cash flow: $59,475 million

RISK FACTORS
Cloud Competition Risk: The cloud computing market is intensely competitive. Microsoft faces competition from Amazon Web Services, Google Cloud, and others. Azure's growth depends on winning enterprise migrations.

AI Investment Risk: Microsoft has committed significant capital to AI infrastructure, including its multi-billion dollar investment in OpenAI. There is no guarantee these investments will generate adequate returns.

Cybersecurity Risk: Microsoft's systems, products, and services are subjected to increasingly sophisticated cyberattacks. A major breach could damage the company's reputation and result in significant liability.

Regulatory Risk: Microsoft is subject to increasingly burdensome regulations globally, including antitrust scrutiny following the Activision Blizzard acquisition.

LIQUIDITY
Microsoft maintains a strong liquidity position with $111.3 billion in cash and investments. The company has $57.3 billion in debt. Microsoft generated $87.6 billion in operating cash flows and returned $42.4 billion to shareholders.`,

  "Tesla, Inc.": `TESLA, INC.
ANNUAL REPORT 2023
FORM 10-K

BUSINESS OVERVIEW
Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, energy generation and storage systems, and related services. The company operates through two segments: Automotive, and Energy Generation and Storage. Tesla was incorporated in Delaware in July 2003.

VEHICLE DELIVERIES
Total vehicle deliveries: 1,808,581 units in 2023 (37% growth YoY)
Model 3 & Model Y deliveries: 1,739,707 units
Model S, X & Cybertruck deliveries: 68,874 units
Vehicle production: 1,845,985 units

REVENUE BREAKDOWN
Automotive revenues: $82,423 million (80% of total)
Energy generation and storage: $6,035 million (6% of total)
Services and other: $8,319 million (8% of total)
Total revenues: $96,773 million (19% growth YoY)

RESULTS OF OPERATIONS
Total revenues: $96,773 million vs $81,462 million (2022), +18.8%
Cost of revenues: $79,113 million
Gross profit: $17,660 million (gross margin 18.2%, down from 25.6%)
Operating income: $8,891 million (operating margin 9.2%)
Net income: $14,999 million (includes $5.9B deferred tax benefit)
Adjusted net income: $9,100 million
EPS (diluted): $3.53

GROSS MARGIN COMPRESSION
Automotive gross margin declined from 28.5% to 18.1% due to:
- Price reductions to stimulate demand and maintain market share
- Higher raw material and battery costs
- Increased manufacturing overhead from new factories (Gigafactory Texas, Berlin)
- Increased vehicle lease financing costs

BALANCE SHEET
Total assets: $106,618 million
Cash and cash equivalents: $29,094 million
Total current assets: $49,616 million
Total current liabilities: $28,748 million
Long-term debt: $2,857 million
Total equity: $62,634 million

KEY FINANCIAL RATIOS
Current ratio: 1.73
Debt-to-equity ratio: 0.05 (minimal leverage)
Return on equity: 23.9%
Return on assets: 14.1%
Gross margin: 18.2% (significantly declined from 25.6%)
Operating margin: 9.2% (declined from 16.8%)
Net margin: 15.5% (inflated by deferred tax benefit)

RISK FACTORS
Price War Risk: Tesla's significant price reductions across its vehicle lineup have materially compressed margins. Continued competitive pressure from Chinese manufacturers (BYD, NIO) may require further price cuts.

Competition Risk: The EV market is becoming increasingly competitive. Established automakers including GM, Ford, Volkswagen, Hyundai are aggressively launching electric vehicles. Chinese competitor BYD surpassed Tesla in quarterly deliveries in Q4 2023.

Production Ramp Risk: New Gigafactories in Texas and Berlin are still ramping production. Higher manufacturing costs and lower utilization rates are pressuring margins. The Cybertruck launch creates additional execution risk.

Regulatory Risk: Tesla operates in over 30 countries with varying EV incentive programs. Changes to US EV tax credits, European subsidies, or Chinese incentives could significantly impact demand.

Execution Risk: Tesla is simultaneously managing multiple major product launches including the Cybertruck, Semi, and next-generation affordable vehicle. Execution challenges could impact financial results.

CASH FLOW
Operating cash flow: $13,256 million
Capital expenditures: $8,898 million
Free cash flow: $4,358 million`,

  "Amazon.com, Inc.": `AMAZON.COM, INC.
ANNUAL REPORT 2023
FORM 10-K

BUSINESS OVERVIEW
Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions through online and physical stores in North America and internationally. It also manufactures and sells electronic devices, and provides Amazon Web Services (AWS), advertising, and other services.

SEGMENT NET SALES
North America: $352,828 million (58% of total)
International: $131,200 million (22% of total)
Amazon Web Services (AWS): $90,757 million (15% of total)
Total net sales: $574,785 million (12% growth YoY)

RESULTS OF OPERATIONS
Net sales: $574,785 million vs $513,983 million (2022), +11.8%
Operating income: $36,852 million (2023) vs $12,248 million (2022), +200%
Operating margin: 6.4% (vs 2.4% in 2022, significant improvement)
Net income: $30,425 million vs net loss of $(2,722) million in 2022
EPS (diluted): $2.90

AWS PERFORMANCE
AWS net sales: $90,757 million, +13% growth
AWS operating income: $24,631 million (27.1% operating margin)
AWS remains the company's most profitable segment

ADVERTISING REVENUE
Advertising services: $46,906 million, +26% growth
Advertising has become a significant high-margin revenue driver

NORTH AMERICA SEGMENT
North America net sales: $352,828 million, +12% growth
North America operating income: $14,877 million (4.2% margin, first full-year profit since pandemic)

INTERNATIONAL SEGMENT  
International net sales: $131,200 million, +11% growth
International operating loss: $(2,656) million (improving from $(7,746) million in 2022)

BALANCE SHEET
Total assets: $527,854 million
Cash and cash equivalents: $73,387 million
Total current assets: $185,498 million
Total current liabilities: $164,922 million
Long-term debt: $58,314 million
Total equity: $201,875 million

KEY FINANCIAL RATIOS
Current ratio: 1.13
Debt-to-equity ratio: 0.29
Return on equity: 15.1%
Return on assets: 5.8%
Gross margin: 46.9%
Operating margin: 6.4%
Net margin: 5.3%
EPS (diluted): $2.90

RISK FACTORS
Competition Risk: Amazon faces intense competition across all business segments from Walmart, Alibaba, Shopify in retail; Google Cloud, Microsoft Azure in cloud; and Meta, Google in advertising.

Regulatory Risk: Amazon faces ongoing antitrust investigations in the US and EU regarding its marketplace practices. The FTC filed suit against Amazon alleging illegal monopoly maintenance. Potential regulatory action could force business model changes.

Macroeconomic Risk: Consumer spending slowdowns directly impact Amazon's retail segments. Higher interest rates increase the cost of Amazon's substantial capital expenditure program for AWS infrastructure.

International Expansion Risk: Amazon's international segment continues to generate operating losses. Achieving profitability in key markets like India and Brazil requires continued investment without guarantee of success.

Labor Risk: Amazon employs over 1.5 million people globally. Labor cost inflation, unionization efforts, and workforce management challenges could increase operating costs significantly.

CASH FLOW
Operating cash flow: $84,946 million (record high)
Capital expenditures: $52,729 million (AWS infrastructure)
Free cash flow: $32,217 million (significant improvement from -$11.6B in 2022)`,
};

export const seedMetrics: Record<
  string,
  {
    fiscalYear: number;
    revenue: string;
    revenueGrowth: string;
    grossMargin: string;
    operatingMargin: string;
    netMargin: string;
    netIncome: string;
    totalAssets: string;
    totalEquity: string;
    cashAndEquivalents: string;
    totalDebt: string;
    currentRatio: string;
    debtToEquity: string;
    roe: string;
    roa: string;
    eps: string;
    operatingCashFlow: string;
    freeCashFlow: string;
    ebitda: string;
    ebitdaMargin: string;
    grossProfit: string;
    operatingIncome: string;
  }
> = {
  "Apple Inc.": {
    fiscalYear: 2023,
    revenue: "394328",
    revenueGrowth: "-0.0026",
    grossProfit: "169148",
    grossMargin: "0.4290",
    operatingIncome: "114301",
    operatingMargin: "0.2900",
    netIncome: "96995",
    netMargin: "0.2460",
    ebitda: "123200",
    ebitdaMargin: "0.3123",
    totalAssets: "352583",
    totalEquity: "62146",
    cashAndEquivalents: "29965",
    totalDebt: "110000",
    currentRatio: "0.9900",
    debtToEquity: "1.5300",
    roe: "1.5608",
    roa: "0.2751",
    eps: "6.13",
    operatingCashFlow: "114164",
    freeCashFlow: "103205",
  },
  "Microsoft Corporation": {
    fiscalYear: 2023,
    revenue: "211915",
    revenueGrowth: "0.0688",
    grossProfit: "146052",
    grossMargin: "0.6890",
    operatingIncome: "88523",
    operatingMargin: "0.4180",
    netIncome: "72361",
    netMargin: "0.3414",
    ebitda: "105000",
    ebitdaMargin: "0.4955",
    totalAssets: "411976",
    totalEquity: "206223",
    cashAndEquivalents: "111262",
    totalDebt: "41990",
    currentRatio: "1.7700",
    debtToEquity: "0.2036",
    roe: "0.3509",
    roa: "0.1757",
    eps: "9.72",
    operatingCashFlow: "87582",
    freeCashFlow: "59475",
  },
  "Tesla, Inc.": {
    fiscalYear: 2023,
    revenue: "96773",
    revenueGrowth: "0.1880",
    grossProfit: "17660",
    grossMargin: "0.1826",
    operatingIncome: "8891",
    operatingMargin: "0.0919",
    netIncome: "14999",
    netMargin: "0.1550",
    ebitda: "13656",
    ebitdaMargin: "0.1411",
    totalAssets: "106618",
    totalEquity: "62634",
    cashAndEquivalents: "29094",
    totalDebt: "2857",
    currentRatio: "1.7300",
    debtToEquity: "0.0456",
    roe: "0.2395",
    roa: "0.1407",
    eps: "3.53",
    operatingCashFlow: "13256",
    freeCashFlow: "4358",
  },
  "Amazon.com, Inc.": {
    fiscalYear: 2023,
    revenue: "574785",
    revenueGrowth: "0.1180",
    grossProfit: "270100",
    grossMargin: "0.4699",
    operatingIncome: "36852",
    operatingMargin: "0.0641",
    netIncome: "30425",
    netMargin: "0.0529",
    ebitda: "85000",
    ebitdaMargin: "0.1479",
    totalAssets: "527854",
    totalEquity: "201875",
    cashAndEquivalents: "73387",
    totalDebt: "58314",
    currentRatio: "1.1300",
    debtToEquity: "0.2889",
    roe: "0.1507",
    roa: "0.0576",
    eps: "2.90",
    operatingCashFlow: "84946",
    freeCashFlow: "32217",
  },
};

export const seedRisks: Record<
  string,
  Array<{
    riskType: string;
    severity: string;
    title: string;
    description: string;
    sourceText: string;
    recommendation: string;
  }>
> = {
  "Apple Inc.": [
    {
      riskType: "Geographic Concentration Risk",
      severity: "high",
      title: "China Revenue Dependency (~19% of Sales)",
      description: "Apple generates approximately 19% of total net sales from China, creating significant exposure to geopolitical tensions, trade wars, and Chinese regulatory actions that could impair market access.",
      sourceText: "Revenue generated from China accounted for approximately 19% of total net sales in 2023",
      recommendation: "Monitor geopolitical developments; diversify manufacturing to India and Vietnam as strategic hedge.",
    },
    {
      riskType: "Revenue Risk",
      severity: "medium",
      title: "iPhone Revenue Stagnation",
      description: "iPhone revenue declined 2% in 2023 amid macroeconomic headwinds and market saturation in key markets. With iPhone comprising 52% of revenues, any sustained decline poses material risk.",
      sourceText: "iPhone net sales: $205,489 million (52.0% of total net sales)",
      recommendation: "Watch Services segment growth as offset; track iPhone upgrade cycles carefully.",
    },
    {
      riskType: "Liquidity Risk",
      severity: "medium",
      title: "Current Ratio Below 1.0x",
      description: "Apple's current ratio of 0.99x indicates current liabilities exceed current assets, though this is actively managed through commercial paper programs and strong operating cash flows.",
      sourceText: "Total current assets: $143,566 million; Total current liabilities: $145,308 million",
      recommendation: "Not immediately concerning given $114B operating cash flow; monitor if cash position deteriorates.",
    },
  ],
  "Microsoft Corporation": [
    {
      riskType: "Market Risk",
      severity: "high",
      title: "AI Infrastructure Investment Uncertainty",
      description: "Microsoft has committed tens of billions to AI infrastructure and OpenAI partnership. These investments create significant execution risk and uncertainty about return on capital.",
      sourceText: "Microsoft has committed significant capital to AI infrastructure, including its multi-billion dollar investment in OpenAI",
      recommendation: "Track Azure AI revenue growth as leading indicator of ROI; monitor capex-to-revenue ratio quarterly.",
    },
    {
      riskType: "Regulatory Risk",
      severity: "medium",
      title: "Antitrust Scrutiny Post-Activision",
      description: "Following the $69 billion Activision Blizzard acquisition, Microsoft faces ongoing regulatory scrutiny in the EU and US that could restrict future M&A activities and business practices.",
      sourceText: "Microsoft is subject to increasingly burdensome regulations globally, including antitrust scrutiny following the Activision Blizzard acquisition",
      recommendation: "Monitor regulatory outcomes; evaluate integration execution and gaming segment performance.",
    },
  ],
  "Tesla, Inc.": [
    {
      riskType: "Margin Risk",
      severity: "critical",
      title: "Gross Margin Compression (28.5% → 18.2%)",
      description: "Tesla's automotive gross margin declined dramatically from 28.5% to 18.1% in 2023 due to aggressive price cuts, new factory ramp costs, and rising material costs. This is a critical red flag requiring immediate attention.",
      sourceText: "Gross profit: $17,660 million (gross margin 18.2%, down from 25.6%)",
      recommendation: "Critical watch item. Monitor Q4 2023 and 2024 margins closely. Price cuts may not be sustainable.",
    },
    {
      riskType: "Revenue Risk",
      severity: "high",
      title: "Intensifying EV Competition from BYD",
      description: "Chinese manufacturer BYD surpassed Tesla in quarterly EV deliveries in Q4 2023, signaling a fundamental shift in competitive dynamics. Tesla's premium positioning is under threat.",
      sourceText: "Chinese competitor BYD surpassed Tesla in quarterly deliveries in Q4 2023",
      recommendation: "Monitor pricing strategy and market share trends; evaluate next-gen affordable vehicle timeline.",
    },
    {
      riskType: "Operational Risk",
      severity: "high",
      title: "Simultaneous Multi-Product Launch Risk",
      description: "Tesla is managing Cybertruck launch, Semi production, and next-generation vehicle development simultaneously, creating significant execution risk across operations.",
      sourceText: "Tesla is simultaneously managing multiple major product launches including the Cybertruck, Semi, and next-generation affordable vehicle",
      recommendation: "Track Cybertruck delivery rates and gross margin contribution quarterly.",
    },
  ],
  "Amazon.com, Inc.": [
    {
      riskType: "Regulatory Risk",
      severity: "critical",
      title: "FTC Antitrust Lawsuit — Monopoly Allegations",
      description: "The FTC filed suit against Amazon alleging illegal monopoly maintenance in online marketplace operations. A successful prosecution could force fundamental business model changes.",
      sourceText: "The FTC filed suit against Amazon alleging illegal monopoly maintenance. Potential regulatory action could force business model changes",
      recommendation: "Monitor litigation progress; assess potential impact on third-party seller practices.",
    },
    {
      riskType: "Revenue Risk",
      severity: "medium",
      title: "International Segment Ongoing Losses",
      description: "Amazon's international segment generated operating losses of $(2,656) million in 2023, representing a long-running drag on consolidated profitability requiring substantial ongoing investment.",
      sourceText: "International operating loss: $(2,656) million (improving from $(7,746) million in 2022)",
      recommendation: "Track path to international profitability; evaluate market-specific investment thesis.",
    },
  ],
};
