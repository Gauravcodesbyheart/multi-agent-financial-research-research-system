process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost:5432/selftest";
(async () => {
  const { validateFinancialDocument } = await import("./src/lib/agents/validationAgent.ts");
  const cases = [
    ["fake resume (MUST reject)", "John Doe\nWork Experience: ABC Corp\nSkills: Excel\nEducation: B.Com\nReferences available upon request"],
    ["annual report sample (MUST accept)", "ANNUAL REPORT 2025\nFiscal year: 2025\nRESULTS OF OPERATIONS\nTotal revenue: $4,200 million\nNet income: $310 million\nTotal assets: $6,100 million\nCONSOLIDATED FINANCIAL STATEMENTS\nTotal liabilities: $2,900 million"],
    ["invoice (MUST reject)", "INVOICE No. 123\nBill To: Acme\nAmount Due: $500\nPayment Terms: Net 30"],
  ];
  let pass = 0;
  for (const [name, text] of cases) {
    const r = await validateFinancialDocument(text, name);
    const expected = name.includes("reject") ? false : true;
    const ok = r.isFinancial === expected;
    if (ok) pass++;
    console.log(`${ok ? "PASS" : "FAIL"} | ${r.isFinancial ? "ACCEPT" : "REJECT"} | ${r.documentTypeGuess} | ${name}`);
    if (!ok) console.log("   reasons:", r.reasons.join(" "));
  }
  console.log(`\nRESULT: ${pass}/3 logic tests passed.`);
})();