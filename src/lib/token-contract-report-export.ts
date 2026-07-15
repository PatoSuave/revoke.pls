import type {
  PDFFont,
  PDFDocument,
  PDFPage,
  RGB,
} from "pdf-lib";

import type {
  TokenContractControlSurface,
  TokenContractReportResponse,
} from "@/lib/token-contract-report";
import {
  buildReportDigest,
  criticalCheckAnswer,
  rankCriticalChecks,
  rankFindings,
  type TokenContractReportDigest,
} from "@/lib/token-contract-report-presentation";

export const TOKEN_CONTRACT_REPORT_PDF_MAX_PAGES = 120;
export const TOKEN_CONTRACT_REPORT_PDF_MAX_VISIBLE_CHARACTERS = 350_000;

export const TOKEN_CONTRACT_REPORT_EXPORT_SECTION_TITLES = [
  "Direct answers",
  "Priority findings and next checks",
  "Coverage, limits, and collection issues",
  "Optional AI-assisted explanation",
  "How to read the technical evidence",
  "All findings and typed evidence",
  "Contract and token profile",
  "Evidence modules and signals",
  "Selectors and bytecode",
  "Holders and supply history",
  "Contract history and simulations",
  "Liquidity evidence",
  "Complete structured report",
] as const;

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN_X = 46;
const PAGE_TOP = 62;
const PAGE_BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const MAX_FILENAME_LENGTH = 118;
const MAX_TEXT_ITEM_CHARACTERS = 48_000;

type PdfLibModule = typeof import("pdf-lib");

interface PdfPalette {
  navy: RGB;
  panel: RGB;
  cyan: RGB;
  blue: RGB;
  text: RGB;
  muted: RGB;
  border: RGB;
  white: RGB;
  critical: RGB;
  high: RGB;
  medium: RGB;
  low: RGB;
  info: RGB;
}

interface PdfFonts {
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
}

interface TextOptions {
  font?: PDFFont;
  size?: number;
  color?: RGB;
  lineHeight?: number;
  gapAfter?: number;
  indent?: number;
}

export interface TokenContractReportJsonExport {
  filename: string;
  text: string;
  blob: Blob;
}

export interface TokenContractReportPdfExport {
  filename: string;
  bytes: Uint8Array;
  blob: Blob;
  pageCount: number;
  readableViewTruncated: boolean;
}

export function serializeTokenContractReport(
  report: TokenContractReportResponse,
): string {
  return JSON.stringify(report, null, 2) + "\n";
}

export function tokenContractReportExportStem(
  report: TokenContractReportResponse,
): string {
  const chain = filenamePart(report.chain?.name ?? `chain-${report.chain?.chainId ?? "unknown"}`);
  const token = filenamePart(report.token.symbol ?? report.token.name ?? "contract");
  const address = report.contract?.address
    ? report.contract.address.slice(2, 10).toLowerCase()
    : "unknown";
  const date = validDate(report.generatedAt)
    ? new Date(report.generatedAt).toISOString().slice(0, 10)
    : "undated";
  const stem = `pulse-revoke-token-audit-${chain}-${token}-${address}-${date}`;
  return stem.slice(0, MAX_FILENAME_LENGTH).replace(/-+$/g, "") || "pulse-revoke-token-audit";
}

export function createTokenContractReportJsonExport(
  report: TokenContractReportResponse,
): TokenContractReportJsonExport {
  const text = serializeTokenContractReport(report);
  return {
    filename: tokenContractReportExportStem(report) + ".json",
    text,
    blob: new Blob([text], { type: "application/json;charset=utf-8" }),
  };
}

export async function createTokenContractReportPdfExport(
  report: TokenContractReportResponse,
): Promise<TokenContractReportPdfExport> {
  const pdfLib = await import("pdf-lib");
  const pdfDoc = await pdfLib.PDFDocument.create();
  const fonts: PdfFonts = {
    regular: await pdfDoc.embedFont(pdfLib.StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(pdfLib.StandardFonts.HelveticaBold),
    mono: await pdfDoc.embedFont(pdfLib.StandardFonts.Courier),
  };
  const palette = createPalette(pdfLib);
  const json = serializeTokenContractReport(report);
  const fileStem = tokenContractReportExportStem(report);
  const reportDate = validDate(report.generatedAt)
    ? new Date(report.generatedAt)
    : new Date();

  pdfDoc.setTitle(
    sanitizePdfText(
      `Pulse Revoke token contract report - ${report.token.symbol ?? report.token.name ?? report.contract?.address ?? "contract"}`,
    ),
  );
  pdfDoc.setSubject("Read-only token contract evidence report");
  pdfDoc.setAuthor("Pulse Revoke");
  pdfDoc.setCreator("Pulse Revoke token contract report");
  pdfDoc.setProducer("Pulse Revoke");
  pdfDoc.setCreationDate(reportDate);
  pdfDoc.setModificationDate(new Date());
  pdfDoc.setKeywords([
    "token contract",
    "read-only audit",
    "deterministic evidence",
    report.chain?.name ?? "EVM",
  ]);

  await pdfDoc.attach(new TextEncoder().encode(json), fileStem + ".json", {
    mimeType: "application/json",
    description: "Complete machine-readable Token Contract Report response",
    creationDate: reportDate,
    modificationDate: reportDate,
  });

  const writer = new PdfReportWriter({
    pdfDoc,
    fonts,
    palette,
    report,
  });
  const digest = buildReportDigest(report);

  renderCover(writer, report, digest);
  writer.addPage();
  renderDirectAnswers(writer, report, digest);
  renderPriorityFindings(writer, digest);
  renderCoverageAndLimits(writer, report, digest);
  renderAi(writer, report);
  renderHowToRead(writer);
  renderFindings(writer, report);
  renderContractProfile(writer, report);
  renderModulesAndSignals(writer, report);
  renderSelectorsAndBytecode(writer, report);
  renderHoldersAndSupply(writer, report);
  renderHistoryAndSimulations(writer, report);
  renderLiquidity(writer, report);
  renderCompletePayload(writer, json, fileStem + ".json");
  writer.finish();

  const savedBytes = await pdfDoc.save({
    addDefaultPage: false,
    useObjectStreams: true,
    updateFieldAppearances: false,
  });
  const bytes = Uint8Array.from(savedBytes);
  return {
    filename: fileStem + ".pdf",
    bytes,
    blob: new Blob([bytes.buffer], { type: "application/pdf" }),
    pageCount: pdfDoc.getPageCount(),
    readableViewTruncated: writer.truncated || writer.shortened,
  };
}

class PdfReportWriter {
  readonly pdfDoc: PDFDocument;
  readonly fonts: PdfFonts;
  readonly palette: PdfPalette;
  readonly report: TokenContractReportResponse;
  page: PDFPage;
  y = PAGE_HEIGHT - PAGE_TOP;
  truncated = false;
  shortened = false;
  private visibleCharacters = 0;

  constructor({
    pdfDoc,
    fonts,
    palette,
    report,
  }: {
    pdfDoc: PDFDocument;
    fonts: PdfFonts;
    palette: PdfPalette;
    report: TokenContractReportResponse;
  }) {
    this.pdfDoc = pdfDoc;
    this.fonts = fonts;
    this.palette = palette;
    this.report = report;
    this.page = this.addPage(true);
  }

  addPage(cover = false): PDFPage {
    const page = this.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: this.palette.white,
    });
    if (!cover) {
      page.drawText("PULSE REVOKE", {
        x: PAGE_MARGIN_X,
        y: PAGE_HEIGHT - 30,
        font: this.fonts.bold,
        size: 9,
        color: this.palette.navy,
      });
      const label = sanitizePdfText(
        `${this.report.chain?.name ?? "Unknown chain"} - ${shortAddress(this.report.contract?.address)}`,
      );
      const labelWidth = this.fonts.regular.widthOfTextAtSize(label, 8);
      page.drawRectangle({
        x: PAGE_MARGIN_X,
        y: PAGE_HEIGHT - 40,
        width: CONTENT_WIDTH,
        height: 0.8,
        color: this.palette.border,
      });
      // Redraw the right-aligned label after measuring it.
      page.drawRectangle({
        x: PAGE_WIDTH - PAGE_MARGIN_X - labelWidth - 2,
        y: PAGE_HEIGHT - 35,
        width: labelWidth + 4,
        height: 12,
        color: this.palette.white,
      });
      page.drawText(label, {
        x: PAGE_WIDTH - PAGE_MARGIN_X - labelWidth,
        y: PAGE_HEIGHT - 30,
        font: this.fonts.regular,
        size: 8,
        color: this.palette.muted,
      });
    }
    this.page = page;
    this.y = PAGE_HEIGHT - PAGE_TOP;
    return page;
  }

  section(title: string, description?: string): void {
    if (!this.ensureSpace(description ? 80 : 54)) return;
    this.y -= 6;
    this.page.drawRectangle({
      x: PAGE_MARGIN_X,
      y: this.y - 3,
      width: 4,
      height: 24,
      color: this.palette.cyan,
    });
    this.page.drawText(this.safe(title), {
      x: PAGE_MARGIN_X + 13,
      y: this.y + 2,
      font: this.fonts.bold,
      size: 16,
      color: this.palette.navy,
    });
    this.y -= 31;
    if (description) {
      this.paragraph(description, {
        size: 9.5,
        color: this.palette.muted,
        gapAfter: 12,
      });
    }
  }

  subheading(title: string): void {
    const lines = wrapText(
      this.safe(title),
      this.fonts.bold,
      11.5,
      CONTENT_WIDTH,
    );
    if (!this.ensureSpace(16 + lines.length * 15)) return;
    this.y -= 4;
    lines.forEach((line) => {
      this.page.drawText(line, {
        x: PAGE_MARGIN_X,
        y: this.y,
        font: this.fonts.bold,
        size: 11.5,
        color: this.palette.blue,
      });
      this.y -= 15;
    });
    this.y -= 4;
  }

  paragraph(value: unknown, options: TextOptions = {}): void {
    if (this.truncated) return;
    const rawText = printable(value);
    if (!rawText) return;
    const remaining = TOKEN_CONTRACT_REPORT_PDF_MAX_VISIBLE_CHARACTERS - this.visibleCharacters;
    if (remaining <= 0) {
      this.truncated = true;
      return;
    }
    const wasTrimmed = rawText.length > Math.min(remaining, MAX_TEXT_ITEM_CHARACTERS);
    const text = rawText.slice(0, Math.min(remaining, MAX_TEXT_ITEM_CHARACTERS));
    this.visibleCharacters += text.length;
    const font = options.font ?? this.fonts.regular;
    const size = options.size ?? 9.5;
    const lineHeight = options.lineHeight ?? size * 1.42;
    const indent = options.indent ?? 0;
    const maxWidth = CONTENT_WIDTH - indent;
    const lines = wrapText(this.safe(text), font, size, maxWidth);
    for (const line of lines) {
      if (!this.ensureSpace(lineHeight + 2)) return;
      if (line) {
        this.page.drawText(line, {
          x: PAGE_MARGIN_X + indent,
          y: this.y,
          font,
          size,
          color: options.color ?? this.palette.text,
        });
      }
      this.y -= lineHeight;
    }
    if (wasTrimmed) {
      this.shortened = true;
      this.paragraph(
        "This unusually long text value was shortened in the readable view. The complete value is retained in the embedded JSON attachment.",
        { size: 8.5, color: this.palette.medium, gapAfter: 4 },
      );
    }
    this.y -= options.gapAfter ?? 7;
  }

  keyValue(label: string, value: unknown, options: { mono?: boolean } = {}): void {
    const labelLines = wrapText(
      this.safe(label.toUpperCase()),
      this.fonts.bold,
      7.5,
      CONTENT_WIDTH,
    );
    if (!this.ensureSpace(24 + labelLines.length * 10)) return;
    labelLines.forEach((line) => {
      this.page.drawText(line, {
        x: PAGE_MARGIN_X,
        y: this.y,
        font: this.fonts.bold,
        size: 7.5,
        color: this.palette.muted,
      });
      this.y -= 10;
    });
    this.y -= 2;
    this.paragraph(value ?? "Unavailable", {
      font: options.mono ? this.fonts.mono : this.fonts.regular,
      size: options.mono ? 7.8 : 9.3,
      lineHeight: options.mono ? 10.5 : 13,
      gapAfter: 6,
    });
  }

  list(items: readonly unknown[], options: { ordered?: boolean; mono?: boolean } = {}): void {
    if (items.length === 0) {
      this.paragraph("None returned.", { color: this.palette.muted });
      return;
    }
    items.forEach((item, index) => {
      const prefix = options.ordered ? `${index + 1}. ` : "- ";
      this.paragraph(prefix + printable(item), {
        font: options.mono ? this.fonts.mono : this.fonts.regular,
        size: options.mono ? 7.7 : 9.2,
        lineHeight: options.mono ? 10.4 : 13,
        gapAfter: 2,
        indent: 8,
      });
    });
    this.y -= 4;
  }

  callout(title: string, body: string, tone: "info" | "warning" | "risk" = "info"): void {
    const accent =
      tone === "risk"
        ? this.palette.critical
        : tone === "warning"
          ? this.palette.medium
          : this.palette.cyan;
    const safeBody = this.safe(body);
    const allLines = wrapText(
      safeBody,
      this.fonts.regular,
      8.7,
      CONTENT_WIDTH - 24,
    );
    const lines = allLines.slice(0, 22);
    if (allLines.length > lines.length) {
      this.shortened = true;
      lines[lines.length - 1] = "Readable callout shortened - complete text is retained in the embedded JSON.";
    }
    const boxHeight = 40 + lines.length * 11;
    if (!this.ensureSpace(boxHeight + 10)) return;
    this.page.drawRectangle({
      x: PAGE_MARGIN_X,
      y: this.y - boxHeight + 8,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: this.palette.panel,
      borderColor: accent,
      borderWidth: 0.8,
      opacity: 0.75,
      borderOpacity: 0.65,
    });
    this.page.drawText(this.safe(title), {
      x: PAGE_MARGIN_X + 12,
      y: this.y - 10,
      font: this.fonts.bold,
      size: 10,
      color: accent,
    });
    lines.forEach((line, index) => {
      this.page.drawText(line, {
        x: PAGE_MARGIN_X + 12,
        y: this.y - 26 - index * 11,
        font: this.fonts.regular,
        size: 8.7,
        color: this.palette.text,
      });
    });
    this.visibleCharacters += title.length + body.length;
    this.y -= boxHeight + 10;
  }

  divider(): void {
    if (!this.ensureSpace(18)) return;
    this.page.drawRectangle({
      x: PAGE_MARGIN_X,
      y: this.y,
      width: CONTENT_WIDTH,
      height: 0.6,
      color: this.palette.border,
    });
    this.y -= 15;
  }

  json(value: unknown): void {
    let text: string;
    try {
      text = JSON.stringify(value, null, 2);
    } catch {
      text = "Structured value could not be serialized.";
    }
    this.paragraph(text, {
      font: this.fonts.mono,
      size: 6.8,
      lineHeight: 8.7,
      color: this.palette.text,
      gapAfter: 10,
    });
  }

  finish(): void {
    const pages = this.pdfDoc.getPages();
    const footerNote = this.truncated || this.shortened
      ? "Readable view capped - complete JSON is attached"
      : "Read-only evidence report - no transaction was submitted";
    pages.forEach((page, index) => {
      page.drawRectangle({
        x: PAGE_MARGIN_X,
        y: 35,
        width: CONTENT_WIDTH,
        height: 0.6,
        color: this.palette.border,
      });
      page.drawText(footerNote, {
        x: PAGE_MARGIN_X,
        y: 20,
        font: this.fonts.regular,
        size: 7.5,
        color: this.palette.muted,
      });
      const pageLabel = `Page ${index + 1} of ${pages.length}`;
      const width = this.fonts.regular.widthOfTextAtSize(pageLabel, 7.5);
      page.drawText(pageLabel, {
        x: PAGE_WIDTH - PAGE_MARGIN_X - width,
        y: 20,
        font: this.fonts.regular,
        size: 7.5,
        color: this.palette.muted,
      });
    });
  }

  private safe(value: string): string {
    return sanitizePdfText(value);
  }

  private ensureSpace(height: number): boolean {
    if (this.truncated) return false;
    if (this.y - height >= PAGE_BOTTOM) return true;
    if (this.pdfDoc.getPageCount() >= TOKEN_CONTRACT_REPORT_PDF_MAX_PAGES) {
      this.truncated = true;
      return false;
    }
    this.addPage();
    return true;
  }
}

function renderCover(
  writer: PdfReportWriter,
  report: TokenContractReportResponse,
  digest: TokenContractReportDigest,
): void {
  const { page, fonts, palette } = writer;
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 238,
    width: PAGE_WIDTH,
    height: 238,
    color: palette.navy,
  });
  page.drawText("PULSE REVOKE", {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 48,
    font: fonts.bold,
    size: 10,
    color: palette.cyan,
  });
  page.drawText("TOKEN CONTRACT REPORT", {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 91,
    font: fonts.bold,
    size: 24,
    color: palette.white,
  });
  const tokenName = sanitizePdfText(
    report.token.symbol ?? report.token.name ?? "Unknown token or contract",
  );
  const tokenLines = wrapText(tokenName, fonts.bold, 16, CONTENT_WIDTH);
  tokenLines.slice(0, 2).forEach((line, index) => {
    page.drawText(line, {
      x: PAGE_MARGIN_X,
      y: PAGE_HEIGHT - 126 - index * 21,
      font: fonts.bold,
      size: 16,
      color: palette.white,
    });
  });
  page.drawText(
    sanitizePdfText(
      `${report.chain?.name ?? "Unknown chain"} (${report.chain?.chainId ?? "unknown"})`,
    ),
    {
      x: PAGE_MARGIN_X,
      y: PAGE_HEIGHT - 176,
      font: fonts.regular,
      size: 10,
      color: palette.white,
    },
  );
  page.drawText(sanitizePdfText(report.contract?.address ?? "Contract unavailable"), {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 197,
    font: fonts.mono,
    size: 8,
    color: palette.white,
  });

  writer.y = PAGE_HEIGHT - 276;
  writer.callout(
    digest.directOutcome.toUpperCase(),
    report.verdict.summary,
    ["critical", "high"].includes(report.verdict.severity)
      ? "risk"
      : report.verdict.severity === "unknown"
        ? "warning"
        : "info",
  );
  writer.keyValue("Deterministic severity", report.verdict.severity);
  writer.keyValue(
    "Verdict confidence",
    `${report.verdict.confidence}% (${report.verdict.confidenceLabel})`,
  );
  writer.keyValue(
    "Evidence coverage",
    `${report.audit.coveragePercent}% - ${report.audit.resolvedQuestions} resolved, ${report.audit.reviewChecks} review clues, ${report.audit.notEvaluatedChecks} not evaluated`,
  );
  writer.keyValue("Confirmed concerns", digest.confirmedConcernCount);
  writer.keyValue("Open evidence areas", digest.openEvidenceItemCount);
  writer.keyValue("Generated", formatTimestamp(report.generatedAt));
  writer.callout(
    "Important boundary",
    digest.completenessNote,
    "warning",
  );
}

function renderDirectAnswers(
  writer: PdfReportWriter,
  report: TokenContractReportResponse,
  digest: TokenContractReportDigest,
): void {
  writer.section(
    "Direct answers",
    "Plain-language answers to the critical contract questions. Not detected means the collected evidence did not show the behavior; it does not prove the behavior is impossible.",
  );
  writer.callout(
    digest.directOutcome,
    report.verdict.summary,
    digest.confirmedConcernCount > 0
      ? "risk"
      : digest.evidenceIncomplete
        ? "warning"
        : "info",
  );
  const checks = rankCriticalChecks(report.audit.criticalChecks);
  checks.forEach((check, index) => {
    const answer = criticalCheckAnswer(check);
    writer.keyValue(
      `${index + 1}. ${check.question}`,
      `${answer.label}. ${check.evidence}`,
    );
  });
  if (checks.length === 0) {
    writer.paragraph(
      "No critical audit questions were returned. This does not imply safety.",
      { color: writer.palette.muted },
    );
  }
}

function renderPriorityFindings(
  writer: PdfReportWriter,
  digest: TokenContractReportDigest,
): void {
  writer.section(
    "Priority findings and next checks",
    "The highest-impact confirmed findings appear first. The complete finding set and every typed reference remain in the advanced evidence sections and embedded JSON.",
  );
  const priorityFindings = digest.confirmedConcerns.slice(0, 5);
  writer.subheading("What was confirmed");
  if (priorityFindings.length === 0) {
    writer.paragraph(
      "No confirmed non-informational concern was returned in the collected evidence. This is not proof that the contract is safe.",
      { color: writer.palette.muted },
    );
  }
  priorityFindings.forEach((finding, index) => {
    writer.subheading(`${index + 1}. ${finding.title}`);
    writer.keyValue("What was found", finding.summary);
    writer.keyValue("Why it matters", finding.practicalEffect);
    writer.keyValue(
      "Evidence strength",
      `${finding.severity} severity; ${finding.state}; ${finding.confidence}% confidence; ${finding.evidence.length} typed reference(s); evidence ID ${finding.id}`,
    );
    writer.keyValue(
      "Recommended check",
      finding.recommendation || "No finding-specific recommendation returned.",
    );
    writer.divider();
  });
  if (digest.confirmedConcerns.length > priorityFindings.length) {
    writer.paragraph(
      `Showing the top ${priorityFindings.length} of ${digest.confirmedConcerns.length} confirmed concerns here. See All findings and typed evidence for the complete list.`,
      { color: writer.palette.muted },
    );
  }

  writer.subheading("Recommended next checks");
  writer.list(digest.nextChecks, { ordered: true });

  const unresolvedItems = [
    ...digest.reviewFindings.slice(0, 3).map(
      (finding) => `${finding.title}: ${finding.summary}`,
    ),
    ...digest.unresolvedChecks
      .slice(0, Math.max(0, 3 - Math.min(3, digest.reviewFindings.length)))
      .map((check) => `${check.question}: ${criticalCheckAnswer(check).label}. ${check.evidence}`),
  ];
  writer.subheading("Highest-priority unresolved areas");
  writer.list(unresolvedItems);
}

function renderHowToRead(writer: PdfReportWriter): void {
  writer.section(
    "How to read the technical evidence",
    "The remaining sections are the advanced evidence record. They separate what was observed, how strongly it was supported, and which questions could actually be evaluated.",
  );
  writer.keyValue(
    "Verdict",
    "The server-owned conclusion derived from deterministic evidence. The AI explanation cannot change it.",
  );
  writer.keyValue(
    "Severity",
    "The practical impact of a confirmed capability or observed behavior: critical, high, medium, low, or unknown.",
  );
  writer.keyValue(
    "Confidence",
    "How reliable the evidence is. Verified source and validated on-chain behavior generally support stronger confidence than selector-name clues.",
  );
  writer.keyValue(
    "Coverage",
    "The share of audit questions resolved by collected evidence. It measures completeness, not safety and not model quality.",
  );
  writer.keyValue(
    "Confirmed finding",
    "Behavior supported by deterministic source, bytecode, storage, history, or simulation evidence.",
  );
  writer.keyValue(
    "Review clue",
    "A lead that deserves investigation but does not yet prove behavior. Candidate 4byte signatures and incomplete decompilation belong here.",
  );
  writer.keyValue(
    "Simulation",
    "A read-only eth_call at a captured block. Success or failure describes only that caller, route, amount, and block.",
  );
}

function renderCoverageAndLimits(
  writer: PdfReportWriter,
  report: TokenContractReportResponse,
  digest: TokenContractReportDigest,
): void {
  writer.section(
    "Coverage, limits, and collection issues",
    "Coverage measures completeness, not safety. Missing evidence, provider failures, and permanent report boundaries are grouped here before the advanced record.",
  );
  writer.callout(
    `${report.audit.coveragePercent}% evidence coverage`,
    digest.completenessNote,
    digest.evidenceIncomplete ? "warning" : "info",
  );
  writer.keyValue(
    "Question counts",
    `${report.audit.resolvedQuestions} resolved; ${report.audit.reviewChecks} review clues; ${report.audit.notEvaluatedChecks} not evaluated; ${report.audit.totalChecks} total`,
  );
  writer.keyValue(
    "Evidence modules",
    `${digest.completedDeterministicModuleCount} of ${digest.deterministicModuleCount} deterministic modules complete`,
  );
  writer.keyValue("Collection issues", digest.collectionIssueCount);
  writer.keyValue(
    "Classification confidence",
    `${report.audit.classificationConfidence}%`,
  );
  writer.subheading("Coverage blockers");
  writer.list(report.audit.coverageExplanation.blockers);
  if (digest.incompleteModules.length > 0) {
    writer.subheading("Incomplete evidence modules");
  }
  digest.incompleteModules.forEach((module) => {
    writer.keyValue(
      `${module.label} - ${module.status}`,
      `${module.summary} Evidence references: ${module.evidenceCount}.`,
    );
    if (module.warnings.length > 0) writer.list(module.warnings);
  });

  writer.subheading("What this report does not prove");
  writer.list(report.reportBoundaries);
  if (report.warnings.length > 0) {
    writer.subheading("Provider and runtime warnings");
    writer.list(report.warnings);
  }
  if (report.errors.length > 0) {
    writer.subheading("Provider failures");
    writer.list(report.errors);
  }
  if (report.missingConfig.length > 0) {
    writer.subheading("Missing server configuration");
    writer.list(report.missingConfig);
  }
  writer.subheading("Coverage calculation");
  writer.paragraph(report.audit.coverageExplanation.summary);
  writer.paragraph(report.audit.coverageExplanation.calculation, {
    color: writer.palette.muted,
  });
}

function renderFindings(writer: PdfReportWriter, report: TokenContractReportResponse): void {
  writer.section(
    "All findings and typed evidence",
    "Every finding keeps severity, evidence state, confidence, practical effect, recommendation, and typed references separate.",
  );
  if (report.findings.length === 0) {
    writer.paragraph(
      "No structured findings were returned. This does not imply safety when coverage or modules are incomplete.",
      { color: writer.palette.muted },
    );
    return;
  }
  rankFindings(report.findings).forEach((finding, index) => {
    writer.subheading(`${index + 1}. ${finding.title}`);
    writer.keyValue("What was found", finding.summary);
    writer.keyValue("Why it matters", finding.practicalEffect);
    writer.keyValue("Recommended check", finding.recommendation || "No recommendation returned.");
    writer.keyValue(
      "Evidence strength",
      `${finding.category}; ${finding.severity}; ${finding.state}; ${finding.confidence}% confidence; evidence ID ${finding.id}`,
    );
    writer.subheading("Typed evidence references");
    if (finding.evidence.length === 0) {
      writer.paragraph("No typed evidence references were attached.", {
        color: writer.palette.muted,
      });
    }
    finding.evidence.forEach((evidence) => {
      const sourceLocation = evidence.file
        ? `; ${evidence.file}${evidence.startLine ? `:${evidence.startLine}` : ""}${evidence.endLine ? `-${evidence.endLine}` : ""}`
        : "";
      const chainReference = [
        evidence.selector ? `selector ${evidence.selector}` : null,
        evidence.transactionHash ? `tx ${evidence.transactionHash}` : null,
        evidence.blockNumber !== undefined ? `block ${evidence.blockNumber}` : null,
      ]
        .filter(Boolean)
        .join("; ");
      writer.keyValue(
        `${evidence.id} - ${evidence.type}`,
        `${evidence.summary}${sourceLocation}${chainReference ? `; ${chainReference}` : ""}`,
      );
    });
    writer.divider();
  });
}

function renderContractProfile(writer: PdfReportWriter, report: TokenContractReportResponse): void {
  writer.section(
    "Contract and token profile",
    "Identity, deployment, ownership, proxy, token-standard, and supply reads collected without connecting a wallet.",
  );
  const contract = report.contract;
  const source = contract?.source;
  const creation = contract?.creation;
  writer.subheading("Contract identity and deployment");
  writer.keyValue("Chain", report.chain ? `${report.chain.name} (${report.chain.chainId})` : null);
  writer.keyValue("Explorer", report.chain?.explorerName ?? null);
  writer.keyValue("Contract address", contract?.address ?? null, { mono: true });
  writer.keyValue("Explorer URL", contract?.explorerUrl ?? null, { mono: true });
  writer.keyValue("Deployed bytecode", contract ? yesNo(contract.hasBytecode) : null);
  writer.keyValue("Creation lookup", creation?.lookupStatus ?? null);
  writer.keyValue("Creation transaction", creation?.transactionHash ?? null, { mono: true });
  writer.keyValue("Creation transaction URL", creation?.transactionUrl ?? null, {
    mono: true,
  });
  writer.keyValue("Creation block", creation?.blockNumber ?? null);
  writer.keyValue("Creation time", creation?.timestamp ? formatTimestamp(creation.timestamp) : null);
  writer.keyValue("Deployer", creation?.deployerAddress ?? null, { mono: true });
  writer.keyValue("Deployer explorer URL", creation?.deployerUrl ?? null, { mono: true });

  writer.subheading("Source, ABI, and proxy profile");
  writer.keyValue("Source status", source?.verified ?? null);
  writer.keyValue("Verification provider", source?.verificationProvider ?? null);
  writer.keyValue("Verification match", source?.verificationMatch ?? null);
  writer.keyValue("Contract name", source?.contractName ?? null);
  writer.keyValue("Compiler", source?.compilerVersion ?? null);
  writer.keyValue("ABI function count", source?.abiFunctionCount ?? null);
  writer.keyValue("Proxy", nullableBoolean(source?.isProxy));
  writer.keyValue("Implementation address", source?.implementationAddress ?? null, {
    mono: true,
  });
  if (source?.implementation) {
    writer.keyValue(
      "Implementation metadata",
      `${source.implementation.contractName ?? "Unnamed"}; ${source.implementation.verified}; provider ${source.implementation.verificationProvider ?? "unknown"}; match ${source.implementation.verificationMatch ?? "unknown"}; compiler ${source.implementation.compilerVersion ?? "unknown"}; ${source.implementation.abiFunctionCount ?? "unknown"} ABI functions`,
    );
    renderControlSurface(writer, "Implementation control surface", source.implementation.controlSurface);
  }
  if (source) renderControlSurface(writer, "Contract control surface", source.controlSurface);

  writer.subheading("Ownership and effective control");
  writer.keyValue("Ownership status", report.controls.ownershipStatus);
  writer.keyValue("Owner getter", report.controls.ownerMethod ?? null);
  writer.keyValue("Owner address", report.controls.ownerAddress ?? null, { mono: true });
  writer.keyValue("owner() candidate", report.controls.ownerCandidates.owner ?? null, { mono: true });
  writer.keyValue("getOwner() candidate", report.controls.ownerCandidates.getOwner ?? null, {
    mono: true,
  });
  writer.keyValue(
    "Owner zero removes all control",
    nullableBoolean(report.controls.ownerZeroRemovesAllControl),
  );
  writer.keyValue(
    "Effective controllers",
    report.controls.effectiveControllerAddresses.length > 0
      ? report.controls.effectiveControllerAddresses.join(", ")
      : "None deterministically identified",
    { mono: true },
  );

  writer.subheading("Token reads and detected standards");
  writer.keyValue("Name", report.token.name ?? null);
  writer.keyValue("Symbol", report.token.symbol ?? null);
  writer.keyValue("Decimals", report.token.decimals ?? null);
  writer.keyValue("Formatted total supply", report.token.formattedTotalSupply ?? null);
  writer.keyValue("Raw total supply", report.token.totalSupply ?? null, { mono: true });
  writer.keyValue("Vault asset", report.token.vaultAssetAddress ?? null, { mono: true });
  writer.keyValue("Raw total assets", report.token.totalAssets ?? null, { mono: true });
  writer.keyValue(
    "Standards",
    [
      `ERC-20-like ${yesNo(report.standards.erc20Like)}`,
      `ERC-721 ${yesNo(report.standards.erc721)}`,
      `ERC-1155 ${yesNo(report.standards.erc1155)}`,
      `ERC-4626 ${yesNo(report.standards.erc4626)}`,
      `ERC-6909 ${report.standards.erc6909.replace("_", " ")}`,
      `Hybrid ${yesNo(report.standards.hybrid)}`,
    ].join("; "),
  );
}

function renderModulesAndSignals(writer: PdfReportWriter, report: TokenContractReportResponse): void {
  writer.section(
    "Evidence modules and signals",
    "Module status describes collection completeness. Signals are lower-level scanner observations and may be informational or incomplete.",
  );
  writer.subheading("Evidence modules");
  Object.values(report.modules).forEach((module) => {
    writer.keyValue(
      `${module.label} - ${module.status}`,
      `${module.summary} Evidence references: ${module.evidenceCount}.`,
    );
    if (module.warnings.length > 0) writer.list(module.warnings);
  });
  writer.subheading("Scanner signals");
  if (report.signals.length === 0) {
    writer.paragraph("No scanner signals were returned.", { color: writer.palette.muted });
  }
  report.signals.forEach((signal) => {
    writer.keyValue(
      `${signal.label} - ${signal.severity} - ${signal.status}`,
      `${signal.evidence} (signal ID ${signal.id})`,
    );
  });
}

function renderSelectorsAndBytecode(writer: PdfReportWriter, report: TokenContractReportResponse): void {
  writer.section(
    "Selectors and bytecode",
    "Selectors show callable entry-point identifiers found in runtime bytecode. Candidate names are review clues unless verified ABI or deterministic behavior confirms them.",
  );
  writer.subheading("Resolved and candidate selectors");
  if (report.selectors.length === 0) {
    writer.paragraph("No runtime selectors were returned.", { color: writer.palette.muted });
  }
  report.selectors.forEach((selector) => {
    writer.keyValue(
      `${selector.selector} - ${selector.label}`,
      `${selector.signature ?? "Unresolved signature"}; ${selector.resolution}; ${selector.confidence}; ${selector.classification}; ${selector.riskCategory}; ${selector.evidenceState}`,
      { mono: true },
    );
    if (selector.candidates.length > 0) {
      writer.list(selector.candidates, { mono: true });
    }
  });
  renderBytecodeArtifact(writer, "Runtime bytecode", report.bytecode.runtime);
  renderBytecodeArtifact(writer, "Creation bytecode", report.bytecode.creation);
}

function renderHoldersAndSupply(writer: PdfReportWriter, report: TokenContractReportResponse): void {
  writer.section(
    "Holders and supply history",
    "Holder concentration is based only on the bounded sample returned by supported providers and Transfer-event fallbacks.",
  );
  writer.keyValue("Deployer raw balance", report.holders.deployerBalance ?? null, { mono: true });
  writer.keyValue(
    "Deployer share",
    report.holders.deployerPercent === null ? null : `${report.holders.deployerPercent}%`,
  );
  writer.keyValue(
    "Sampled supply share",
    report.holders.sampledSupplyPercent === null
      ? null
      : `${report.holders.sampledSupplyPercent}%`,
  );
  writer.subheading("Sampled holders");
  if (report.holders.sampled.length === 0) {
    writer.paragraph("No candidate holders were available.", { color: writer.palette.muted });
  }
  report.holders.sampled.forEach((holder, index) => {
    writer.keyValue(
      `${index + 1}. ${holder.address}`,
      `Raw balance ${holder.balance}; share ${holder.percentageOfSupply === null ? "unknown" : `${holder.percentageOfSupply}%`}; sources ${holder.sources.join(", ")}`,
      { mono: true },
    );
  });
  renderLimitations(writer, "Holder limitations", report.holders.limitations);

  writer.subheading("Supply history");
  writer.keyValue("Initial mint amount", report.supplyHistory.initialMintAmount ?? null, {
    mono: true,
  });
  writer.keyValue(
    "Initial mint recipients",
    report.supplyHistory.initialMintRecipients.length > 0
      ? report.supplyHistory.initialMintRecipients.join(", ")
      : null,
    { mono: true },
  );
  writer.keyValue(
    "Initial mint transaction",
    report.supplyHistory.initialMintTransactionHash ?? null,
    { mono: true },
  );
  writer.keyValue("Initial mint block", report.supplyHistory.initialMintBlockNumber ?? null);
  writer.keyValue(
    "Current supply differs from initial mint",
    nullableBoolean(report.supplyHistory.currentSupplyDiffersFromInitialMint),
  );
  renderLimitations(writer, "Supply-history limitations", report.supplyHistory.limitations);
}

function renderHistoryAndSimulations(
  writer: PdfReportWriter,
  report: TokenContractReportResponse,
): void {
  writer.section(
    "Contract history and simulations",
    "History is bounded to inspected provider data. Simulations are read-only calls at a captured block and never sign or submit transactions.",
  );
  writer.subheading("Contract history");
  writer.keyValue("Calls inspected", report.history.inspectedTransactions);
  writer.keyValue(
    "Post-owner-zero activity",
    nullableBoolean(report.history.postOwnershipZeroActivity),
  );
  writer.keyValue(
    "History coverage",
    `${report.history.coverage.complete ? "complete" : "incomplete"}; truncated ${yesNo(report.history.coverage.truncated)}`,
  );
  if (report.history.coverage.coveredRanges.length > 0) {
    writer.subheading("Covered history ranges");
    report.history.coverage.coveredRanges.forEach((range) => {
      writer.keyValue(
        `${range.scope} - ${range.provider}`,
        `Blocks ${range.fromBlock ?? "unknown"} to ${range.toBlock ?? "unknown"}; ${range.resultCount} result(s)`,
      );
    });
  }
  if (report.history.coverage.gaps.length > 0) {
    writer.subheading("History coverage gaps");
    writer.list(report.history.coverage.gaps);
  }
  writer.subheading("Ownership events");
  if (report.history.ownershipTransfers.length === 0) {
    writer.paragraph("No standard ownership-transfer events were returned in the inspected range.", {
      color: writer.palette.muted,
    });
  }
  report.history.ownershipTransfers.forEach((event) => {
    writer.keyValue(
      event.transactionHash,
      `Block ${event.blockNumber ?? "unknown"}; ${event.previousOwner ?? "unknown"} to ${event.newOwner ?? "unknown"}; renounced ${yesNo(event.renounced)}`,
      { mono: true },
    );
  });
  writer.subheading("Decoded recent calls");
  if (report.history.decodedCalls.length === 0) {
    writer.paragraph("No privileged calls were decoded.", { color: writer.palette.muted });
  }
  const readableDecodedCalls = report.history.decodedCalls.slice(0, 12);
  readableDecodedCalls.forEach((call) => {
    writer.keyValue(
      call.signature ?? call.selector ?? "Unresolved call",
      `Tx ${call.transactionHash}; block ${call.blockNumber ?? "unknown"}; time ${call.timestamp ? formatTimestamp(call.timestamp) : "unknown"}; from ${call.from ?? "unknown"}; success ${nullableBoolean(call.success)}; after owner zero ${nullableBoolean(call.afterOwnershipZero)}`,
      { mono: true },
    );
  });
  if (report.history.decodedCalls.length > readableDecodedCalls.length) {
    writer.paragraph(
      `${report.history.decodedCalls.length - readableDecodedCalls.length} additional decoded calls are retained in the embedded JSON attachment.`,
      { color: writer.palette.muted },
    );
  }
  renderLimitations(writer, "History limitations", report.history.limitations);

  writer.subheading("Bounded read-only simulations");
  writer.keyValue("Captured block", report.simulation.blockNumber ?? null);
  if (report.simulation.attempts.length === 0) {
    writer.paragraph("No simulation attempts were available.", { color: writer.palette.muted });
  }
  report.simulation.attempts.forEach((attempt) => {
    writer.keyValue(
      `${attempt.label} - ${attempt.status}`,
      `${attempt.functionSignature}; kind ${attempt.kind ?? "unclassified"}; router ${attempt.routerVersion ?? "not applicable"} at ${attempt.routerAddress ?? "not applicable"}; pair ${attempt.pairAddress ?? "not applicable"}; stage ${attempt.stage ?? "not labeled"}; caller ${attempt.from ?? "unknown"}; call target ${attempt.to}; recipient ${attempt.recipient ?? "not applicable"}; raw amount ${attempt.amount ?? "not applicable"}; block ${attempt.blockNumber ?? "unknown"}; evidence ${attempt.evidenceState ?? "not labeled"}. ${attempt.detail}${attempt.returnData ? ` Return data ${attempt.returnData}.` : ""}`,
      { mono: true },
    );
    if (attempt.prerequisites && attempt.prerequisites.length > 0) {
      writer.keyValue("Simulation prerequisites", attempt.prerequisites.join("; "));
    }
    if (attempt.assumptions && attempt.assumptions.length > 0) {
      writer.keyValue("Simulation assumptions", attempt.assumptions.join("; "));
    }
  });
  renderLimitations(writer, "Simulation limitations", report.simulation.limitations);
}

function renderLiquidity(writer: PdfReportWriter, report: TokenContractReportResponse): void {
  writer.section(
    "Liquidity evidence",
    "DEX discovery identifies candidate trading pairs. On-chain pair snapshots and LP event history provide stronger evidence than provider labels alone.",
  );
  if (report.liquidity.pairs.length === 0) {
    writer.paragraph("No validated indexed DEX pair was returned.", {
      color: writer.palette.muted,
    });
  }
  report.liquidity.pairs.forEach((pair, index) => {
    writer.subheading(`${index + 1}. ${pair.dexId ?? "Unknown DEX"} pair`);
    writer.keyValue("Pair address", pair.pairAddress, { mono: true });
    writer.keyValue("Chain slug", pair.chainSlug);
    writer.keyValue("Provider labels", pair.labels.join(", ") || null);
    writer.keyValue("Base token", pair.baseTokenAddress ?? null, { mono: true });
    writer.keyValue("Quote token", pair.quoteTokenAddress ?? null, { mono: true });
    writer.keyValue(
      "Provider liquidity",
      pair.liquidityUsd === null ? null : `$${pair.liquidityUsd.toLocaleString("en-US")}`,
    );
    writer.keyValue(
      "Pair created",
      pair.pairCreatedAt === null
        ? null
        : formatTimestamp(new Date(pair.pairCreatedAt).toISOString()),
    );
    writer.keyValue("Pair URL", pair.url ?? null, { mono: true });
  });
  writer.subheading("On-chain LP snapshots and lifecycle evidence");
  if ((report.liquidity.pairEvidence ?? []).length === 0) {
    writer.paragraph("No on-chain LP snapshot was returned.", { color: writer.palette.muted });
  }
  (report.liquidity.pairEvidence ?? []).forEach((evidence, index) => {
    writer.subheading(`LP evidence ${index + 1} - ${evidence.snapshot.pairAddress}`);
    writer.keyValue(
      "Snapshot status",
      `${evidence.status}; captured block ${evidence.snapshot.capturedBlock}`,
    );
    writer.keyValue("Factory", evidence.snapshot.factory ?? null, { mono: true });
    writer.keyValue("Token 0", evidence.snapshot.token0 ?? null, { mono: true });
    writer.keyValue("Token 1", evidence.snapshot.token1 ?? null, { mono: true });
    writer.keyValue("Quote token", evidence.snapshot.quoteTokenAddress ?? null, {
      mono: true,
    });
    writer.keyValue(
      "Raw reserves",
      evidence.snapshot.reserves
        ? `${evidence.snapshot.reserves.reserve0} / ${evidence.snapshot.reserves.reserve1}`
        : null,
      { mono: true },
    );
    writer.keyValue("Raw LP total supply", evidence.snapshot.totalSupply ?? null, {
      mono: true,
    });

    writer.subheading("Current LP custody");
    writer.paragraph(
      "Burned LP is held at the zero or dead address. Controller LP is currently held by a deployer or effective controller. Known locked LP requires a recognized locker classification; an unidentified contract holder is not treated as locked.",
      { size: 8.7, color: writer.palette.muted },
    );
    writer.keyValue(
      "Custody coverage",
      `${evidence.custody.complete ? "complete" : "incomplete"}; sampled ${formatBps(evidence.custody.sampledSupplyBps)} of LP supply`,
    );
    writer.keyValue("Burned LP share", formatBps(evidence.custody.burnedBps));
    writer.keyValue("Controller-held LP share", formatBps(evidence.custody.controllerBps));
    writer.keyValue("Known locked LP share", formatBps(evidence.custody.knownLockedBps));
    writer.keyValue("Sampled raw LP balance", evidence.custody.sampledBalance, {
      mono: true,
    });
    if (evidence.custody.positions.length === 0) {
      writer.paragraph("No positive current LP custody position was confirmed.", {
        color: writer.palette.muted,
      });
    }
    evidence.custody.positions.forEach((position) => {
      writer.keyValue(
        `${position.classification}${position.label ? ` - ${position.label}` : ""}`,
        `${position.address}; raw balance ${position.balance}; share ${formatBps(position.shareBps)}; sources ${position.sources.join(", ")}; bytecode ${nullableBoolean(position.hasBytecode)}`,
        { mono: true },
      );
    });
    renderLimitations(writer, "LP custody limitations", evidence.custody.limitations);

    writer.subheading("Observed LP lifecycle");
    writer.keyValue(
      "Event coverage",
      Object.entries(evidence.eventCoverage)
        .map(
          ([eventName, coverage]) =>
            `${eventName}: ${coverage.available ? "available" : "unavailable"}, ${coverage.retainedLogs} retained, truncated ${yesNo(coverage.truncated)}`,
        )
        .join("; "),
    );
    writer.keyValue(
      "Deployer LP activity",
      `Minted ${evidence.deployerActivity.observedLpMintedToDeployer}; sent to pair ${evidence.deployerActivity.observedLpSentByDeployerToPair}; matched to burns ${evidence.deployerActivity.observedLpMatchedToBurns}; removed after mint ${evidence.deployerActivity.observedLpRemovedAfterMint}; observed mint fully consumed ${nullableBoolean(evidence.deployerActivity.observedMintFullyConsumedLater)}; consumed ${formatBps(evidence.deployerActivity.observedConsumedBps)}`,
      { mono: true },
    );
    evidence.mintTransactions.forEach((transaction) => {
      writer.keyValue(
        `LP mint - ${transaction.transactionHash}`,
        `Block ${transaction.blockNumber ?? "unknown"}; sender ${transaction.sender ?? "unknown"}; amount0 ${transaction.amount0}; amount1 ${transaction.amount1}; LP minted to deployer ${transaction.lpMintedToDeployer}`,
        { mono: true },
      );
    });
    evidence.removalTransactions.forEach((transaction) => {
      writer.keyValue(
        `LP removal - ${transaction.transactionHash}`,
        `Block ${transaction.blockNumber ?? "unknown"}; caller ${transaction.burnCaller ?? "unknown"}; recipient ${transaction.recipient ?? "unknown"}; amount0 ${transaction.amount0}; amount1 ${transaction.amount1}; matched deployer LP ${transaction.matchedDeployerLp}; after observed deployer mint ${nullableBoolean(transaction.afterObservedDeployerMint)}`,
        { mono: true },
      );
    });
    writer.paragraph(
      "The complete normalized LP evidence record is retained in the embedded JSON attachment. The readable view above contains the custody, lifecycle, transaction, and limitation fields needed to evaluate this pair.",
      { color: writer.palette.muted },
    );
  });
  renderLimitations(writer, "Liquidity limitations", report.liquidity.limitations);
}

function renderAi(writer: PdfReportWriter, report: TokenContractReportResponse): void {
  writer.section(
    "Optional AI-assisted explanation",
    "DeepSeek selects grounded evidence for a secondary review and recommends follow-up checks. Displayed conclusions remain deterministic; the model cannot set or lower the verdict, score, confidence, coverage, or evidence state.",
  );
  const narrative = report.ai.narrative;
  if (narrative) {
    writer.subheading(narrative.title);
    writer.keyValue("Bottom line", narrative.bottomLine);
    writer.keyValue(
      "Secondary review context",
      `${narrative.overallVerdict}; ${narrative.confidence}% confidence. ${narrative.confidenceReason}`,
    );
    writer.subheading("Key concerns highlighted");
    writer.list(narrative.mainRisks);
    writer.subheading("Checks still unresolved");
    writer.list(narrative.whatNotSeen);
    writer.subheading("Recommended next checks");
    writer.list(narrative.whatToCheckOnChain);
    writer.subheading("Source-cited secondary observations");
    narrative.detailedFindings.forEach((finding, index) => {
      writer.keyValue(
        `${index + 1}. ${finding.heading} - ${finding.severity}`,
        `${finding.description} Practical effect: ${finding.practicalEffect}`,
      );
      if (finding.evidence.length > 0) writer.list(finding.evidence);
      if (finding.citations && finding.citations.length > 0) {
        writer.list(
          finding.citations.map(
            (citation) =>
              `${citation.file}:${citation.startLine}-${citation.endLine}; evidence IDs ${citation.evidenceIds.join(", ")}`,
          ),
          { mono: true },
        );
      }
    });
    writer.subheading("Selector review clues");
    writer.list(narrative.selectorWatchlist, { mono: true });
  } else {
    writer.paragraph(
      "No structured AI narrative was returned. The deterministic report above remains available and authoritative.",
      {
      color: writer.palette.muted,
      },
    );
  }
  if (report.ai.markdown) {
    writer.subheading("Provider narrative text");
    writer.paragraph(report.ai.markdown, {
      size: 8.5,
      color: writer.palette.text,
    });
  }
  writer.subheading("Provider details");
  writer.keyValue("AI status", report.ai.status);
  writer.keyValue("Model", report.ai.model ?? null);
  writer.keyValue("Failure reason", report.ai.reason ?? null);
  writer.keyValue("Finish reason", report.ai.finishReason ?? null);
  if (report.ai.usage) {
    writer.keyValue(
      "Token usage",
      `${report.ai.usage.promptTokens} prompt; ${report.ai.usage.completionTokens} completion; ${report.ai.usage.reasoningTokens} reasoning; ${report.ai.usage.totalTokens} total; ${report.ai.usage.attempts} attempt(s)`,
    );
  }
}

function renderCompletePayload(writer: PdfReportWriter, json: string, attachmentName: string): void {
  writer.section(
    "Complete structured report",
    "The PDF contains the exact final in-memory report as an embedded JSON attachment. The separate Download JSON button provides the same payload directly.",
  );
  writer.keyValue("Embedded attachment", attachmentName, { mono: true });
  writer.keyValue("JSON character count", json.length.toLocaleString("en-US"));
  writer.keyValue(
    "Integrity note",
    "The attachment is serialized directly from the final API response. No report fields are added, removed, or rewritten for the JSON export.",
  );
  writer.callout(
    "Readable-view safeguard",
    `The human-readable PDF is limited to ${TOKEN_CONTRACT_REPORT_PDF_MAX_PAGES} pages and ${TOKEN_CONTRACT_REPORT_PDF_MAX_VISIBLE_CHARACTERS.toLocaleString("en-US")} visible characters. If that cap is reached, the embedded JSON remains complete.`,
    "info",
  );
}

function renderControlSurface(
  writer: PdfReportWriter,
  title: string,
  surface: TokenContractControlSurface,
): void {
  writer.subheading(title);
  Object.entries(surface).forEach(([category, functions]) => {
    writer.keyValue(category.replace(/([a-z])([A-Z])/g, "$1 $2"),
      (functions as string[]).length > 0 ? (functions as string[]).join(", ") : "None identified",
      { mono: true },
    );
  });
}

function renderBytecodeArtifact(
  writer: PdfReportWriter,
  title: string,
  artifact: TokenContractReportResponse["bytecode"]["runtime"],
): void {
  writer.subheading(title);
  writer.keyValue("Available", yesNo(artifact.available));
  writer.keyValue("Byte length", artifact.byteLength.toLocaleString("en-US"));
  writer.keyValue("Source", artifact.source ?? null);
  writer.keyValue("Hash", artifact.hash ?? null, { mono: true });
  writer.keyValue("Normalized hash", artifact.hashWithoutMetadata ?? null, { mono: true });
  writer.keyValue("Metadata detected", yesNo(artifact.metadataDetected));
  writer.keyValue(
    "Embedded addresses",
    artifact.embeddedAddresses.length > 0
      ? artifact.embeddedAddresses.join(", ")
      : "None identified",
    { mono: true },
  );
  renderLimitations(writer, `${title} limitations`, artifact.limitations);
}

function renderLimitations(
  writer: PdfReportWriter,
  title: string,
  limitations: readonly string[],
): void {
  writer.subheading(title);
  writer.list(limitations);
}

function createPalette(pdfLib: PdfLibModule): PdfPalette {
  const { rgb } = pdfLib;
  return {
    navy: rgb(0.035, 0.075, 0.13),
    panel: rgb(0.94, 0.97, 0.985),
    cyan: rgb(0.0, 0.63, 0.76),
    blue: rgb(0.05, 0.33, 0.55),
    text: rgb(0.12, 0.16, 0.21),
    muted: rgb(0.34, 0.4, 0.47),
    border: rgb(0.8, 0.84, 0.88),
    white: rgb(1, 1, 1),
    critical: rgb(0.72, 0.09, 0.13),
    high: rgb(0.83, 0.24, 0.12),
    medium: rgb(0.7, 0.42, 0.02),
    low: rgb(0.08, 0.45, 0.32),
    info: rgb(0.05, 0.33, 0.55),
  };
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n");
  paragraphs.forEach((paragraph) => {
    if (paragraph.length === 0) {
      lines.push("");
      return;
    }
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    words.forEach((word) => {
      const pieces = splitLongWord(word, font, size, maxWidth);
      pieces.forEach((piece) => {
        const candidate = current ? `${current} ${piece}` : piece;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          current = candidate;
          return;
        }
        if (current) lines.push(current);
        current = piece;
      });
    });
    if (current) lines.push(current);
  });
  return lines.length > 0 ? lines : [""];
}

function splitLongWord(word: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
  const pieces: string[] = [];
  let piece = "";
  for (const character of word) {
    const candidate = piece + character;
    if (piece && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      pieces.push(piece);
      piece = character;
    } else {
      piece = candidate;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

function sanitizePdfText(value: string): string {
  return value
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?");
}

function filenamePart(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 34);
  return normalized || "unknown";
}

function printable(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Unavailable";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function nullableBoolean(value: boolean | null | undefined): string {
  return value === null || value === undefined ? "Unresolved" : yesNo(value);
}

function formatBps(value: number | null | undefined): string {
  return value === null || value === undefined
    ? "unresolved"
    : `${(value / 100).toFixed(2)}%`;
}

function shortAddress(address: string | null | undefined): string {
  return address ? `${address.slice(0, 8)}...${address.slice(-6)}` : "contract unavailable";
}

function validDate(value: string): boolean {
  return Number.isFinite(new Date(value).getTime());
}

function formatTimestamp(value: string): string {
  if (!validDate(value)) return value || "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
}
