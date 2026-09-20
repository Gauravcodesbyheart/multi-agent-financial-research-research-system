const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "public", "FINRESEARCH_AI_COMPLETE_DOCUMENTATION.md");
const outputPath = path.join(root, "public", "FINRESEARCH_AI_COMPLETE_DOCUMENTATION.pdf");
const markdown = fs.readFileSync(inputPath, "utf8").replace(/\r\n/g, "\n");

const pdf = new jsPDF({ unit: "mm", format: "a4" });
const pageWidth = 210;
const pageHeight = 297;
const margin = 18;
const contentWidth = pageWidth - margin * 2;
const bottom = pageHeight - 18;
let y = 20;
let pageNumber = 1;
let inCode = false;
let inTable = false;

function footer() {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 130, 145);
  pdf.text("FinResearch AI - Complete Project Documentation", margin, pageHeight - 9);
  pdf.text(String(pageNumber), pageWidth - margin, pageHeight - 9, { align: "right" });
}

function newPage() {
  footer();
  pdf.addPage();
  pageNumber += 1;
  y = 20;
}

function ensure(height) {
  if (y + height > bottom) newPage();
}

function writeLines(lines, fontSize, color, lineHeight, font = "normal", indent = 0) {
  pdf.setFont("helvetica", font);
  pdf.setFontSize(fontSize);
  pdf.setTextColor(...color);
  for (const line of lines) {
    ensure(lineHeight);
    pdf.text(line, margin + indent, y);
    y += lineHeight;
  }
}

function paragraph(text) {
  const cleaned = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .trim();
  if (!cleaned) return;
  const lines = pdf.splitTextToSize(cleaned, contentWidth);
  writeLines(lines, 9.5, [42, 52, 68], 4.7);
  y += 2;
}

function codeLine(text) {
  const lines = pdf.splitTextToSize(text || " ", contentWidth - 8);
  ensure(lines.length * 4.2 + 4);
  pdf.setFillColor(243, 246, 250);
  pdf.roundedRect(margin, y - 3.5, contentWidth, lines.length * 4.2 + 5, 1.5, 1.5, "F");
  writeLines(lines, 8, [35, 45, 60], 4.2, "courier", 4);
}

function heading(text, level) {
  const size = level === 1 ? 18 : level === 2 ? 13 : 10.5;
  const space = level === 1 ? 12 : level === 2 ? 8 : 5;
  ensure(size + space + 5);
  if (level === 1) {
    pdf.setFillColor(20, 31, 55);
    pdf.rect(0, 0, pageWidth, 42, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(size);
    pdf.text(text, margin, 25);
    y = 55;
    return;
  }
  y += level === 2 ? 4 : 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(size);
  pdf.setTextColor(level === 2 ? 23 : 40, level === 2 ? 68 : 52, level === 2 ? 120 : 70);
  const lines = pdf.splitTextToSize(text, contentWidth);
  for (const line of lines) {
    ensure(size * 0.55 + space);
    pdf.text(line, margin, y);
    y += size * 0.55;
  }
  pdf.setDrawColor(215, 222, 232);
  pdf.setLineWidth(0.25);
  pdf.line(margin, y + 1, pageWidth - margin, y + 1);
  y += space;
}

function bullet(text, ordered = false, number = 0) {
  const prefix = ordered ? `${number}. ` : "- ";
  const clean = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
  const lines = pdf.splitTextToSize(clean, contentWidth - 8);
  ensure(lines.length * 4.7);
  writeLines(lines, 9.2, [42, 52, 68], 4.7, "normal", 6);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.2);
  pdf.setTextColor(23, 68, 120);
  pdf.text(prefix, margin, y - lines.length * 4.7);
  y += 1;
}

function tableRow(cells, header = false) {
  const widths = [contentWidth * 0.25, contentWidth * 0.1, contentWidth * 0.65];
  let x = margin;
  const rendered = cells.map((cell, i) => pdf.splitTextToSize(cell.replace(/`/g, ""), widths[i] - 3));
  const height = Math.max(...rendered.map((lines) => lines.length)) * 4 + 5;
  ensure(height);
  if (header) {
    pdf.setFillColor(220, 230, 244);
    pdf.rect(margin, y - 3.5, contentWidth, height, "F");
  }
  for (let i = 0; i < cells.length; i++) {
    pdf.setFont("helvetica", header ? "bold" : "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(42, 52, 68);
    pdf.text(rendered[i], x + 1.5, y);
    x += widths[i];
  }
  y += height;
  pdf.setDrawColor(220, 225, 232);
  pdf.line(margin, y - 2, pageWidth - margin, y - 2);
}

const lines = markdown.split("\n");
let orderedNumber = 0;
for (const raw of lines) {
  const line = raw.trimEnd();
  if (line.startsWith("```") && !inCode) {
    inCode = true;
    y += 2;
    continue;
  }
  if (line.startsWith("```") && inCode) {
    inCode = false;
    y += 3;
    continue;
  }
  if (inCode) {
    codeLine(line);
    continue;
  }
  if (line.startsWith("|")) {
    if (line.includes("---")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    tableRow(cells, !inTable);
    inTable = true;
    continue;
  }
  if (inTable) {
    y += 3;
    inTable = false;
  }
  if (!line.trim()) {
    y += 2;
    orderedNumber = 0;
    continue;
  }
  if (line.startsWith("# ")) {
    heading(line.slice(2), 1);
    continue;
  }
  if (line.startsWith("## ")) {
    heading(line.slice(3), 2);
    continue;
  }
  if (line.startsWith("### ")) {
    heading(line.slice(4), 3);
    continue;
  }
  if (/^\d+\.\s/.test(line)) {
    orderedNumber += 1;
    bullet(line.replace(/^\d+\.\s/, ""), true, orderedNumber);
    continue;
  }
  if (line.startsWith("- ")) {
    bullet(line.slice(2));
    continue;
  }
  if (line.startsWith("> ")) {
    const quote = pdf.splitTextToSize(line.slice(2), contentWidth - 8);
    ensure(quote.length * 4.7 + 6);
    pdf.setFillColor(235, 243, 252);
    pdf.rect(margin, y - 3, contentWidth, quote.length * 4.7 + 5, "F");
    writeLines(quote, 9, [35, 65, 100], 4.7, "italic", 4);
    y += 3;
    continue;
  }
  paragraph(line);
}
footer();
pdf.save(outputPath);
console.log(`Created ${outputPath}`);
