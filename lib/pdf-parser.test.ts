import { describe, expect, it } from "vitest";
import zlib from "zlib";
import {
  decodeASCII85,
  decodeASCIIHex,
  decodeFlate,
  extractPdfText,
  extractTextFromPdfBuffer,
  extractTextFromPdfStream,
  parseSinglePdfString,
} from "./pdf-parser";

describe("pdf-parser", () => {
  it("decodes FlateDecode stream data", () => {
    const originalText = "Vanguard Personal Pension £337,856.14";
    const compressed = zlib.deflateSync(Buffer.from(originalText, "utf-8"));
    const decompressed = decodeFlate(compressed);
    expect(decompressed.toString("utf-8")).toBe(originalText);
  });

  it("decodes ASCIIHexDecode stream data", () => {
    const hexInput = Buffer.from("56616e6775617264>", "latin1");
    const decoded = decodeASCIIHex(hexInput);
    expect(decoded.toString("latin1")).toBe("Vanguard");
  });

  it("decodes ASCII85Decode stream data", () => {
    const a85Input = Buffer.from("87cURD]i,~>", "latin1");
    const decoded = decodeASCII85(a85Input);
    expect(decoded.toString("latin1")).toBe("Hello W");
  });

  it("handles z shortcut in ASCII85Decode", () => {
    const a85WithZ = Buffer.from("z~>", "latin1");
    const decoded = decodeASCII85(a85WithZ);
    expect(decoded).toEqual(Buffer.from([0, 0, 0, 0]));
  });

  it("parses single parenthesized string with octal escapes and nested parens", () => {
    const str = "(Vanguard Personal Pension (SIPP) \\243337\\,856.14) Tj";
    const parsed = parseSinglePdfString(str, 0);
    expect(parsed.text).toBe("Vanguard Personal Pension (SIPP) £337,856.14");
  });

  it("parses parenthesized text blocks from Tj and TJ streams", () => {
    const pdfStreamText = `
BT
/F1 12 Tf
(Portfolio Value by Product Wrapper) Tj T*
(Vanguard Personal Pension) Tj T*
[(Stocks & Shares ISA) 10 ( £166,720.37)] TJ T*
(General Investment Account) Tj T*
(£196,717.05) Tj
ET
    `;
    const text = extractTextFromPdfStream(pdfStreamText);
    expect(text).toContain("Portfolio Value by Product Wrapper");
    expect(text).toContain("Vanguard Personal Pension");
    expect(text).toContain("Stocks & Shares ISA £166,720.37");
    expect(text).toContain("General Investment Account");
    expect(text).toContain("£196,717.05");
  });

  it("extracts text from a complete raw PDF buffer with FlateDecode streams", () => {
    const streamContent = `
BT
/F1 12 Tf
(Vanguard Personal Pension) Tj T*
(£337,856.14) Tj
ET
    `;
    const compressed = zlib.deflateSync(Buffer.from(streamContent, "latin1"));
    const pdfHeader = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Length " + compressed.length + " /Filter /FlateDecode >>\nstream\n");
    const pdfFooter = Buffer.from("\nendstream\nendobj\n%%EOF");
    const fullPdf = Buffer.concat([pdfHeader, compressed, pdfFooter]);

    const extracted = extractPdfText(fullPdf);
    expect(extracted).toContain("Vanguard Personal Pension");
    expect(extracted).toContain("£337,856.14");
  });

  it("extracts text from base64 string", () => {
    const streamContent = "(Stocks & Shares ISA) Tj (£166,720.37) Tj";
    const base64Pdf = Buffer.from(`%PDF-1.4\nstream\n${streamContent}\nendstream`).toString("base64");

    const extracted = extractPdfText(base64Pdf);
    expect(extracted).toContain("Stocks & Shares ISA");
    expect(extracted).toContain("£166,720.37");
  });

  it("decompresses FlateDecode stream blocks with binary buffer slicing", () => {
    const rawContent = "(ISA Balance £45,000) (SIPP Balance £120,000)";
    const compressed = zlib.deflateSync(Buffer.from(rawContent, "latin1"));

    const pdfData = Buffer.concat([
      Buffer.from("1 0 obj\n<< /Filter /FlateDecode >>\nstream\r\n", "latin1"),
      compressed,
      Buffer.from("\r\nendstream\nendobj\n", "latin1"),
    ]);

    const extracted = extractTextFromPdfBuffer(pdfData);
    expect(extracted).toContain("ISA Balance £45,000");
    expect(extracted).toContain("SIPP Balance £120,000");
  });

  it("handles uncompressed stream contents gracefully", () => {
    const pdfData = Buffer.from(
      "1 0 obj\nstream\n(GIA Balance £15,000)\nendstream\nendobj",
      "latin1"
    );

    const extracted = extractTextFromPdfBuffer(pdfData);
    expect(extracted).toContain("GIA Balance £15,000");
  });

  it("falls back to full buffer string extraction if no stream matches", () => {
    const pdfData = Buffer.from("BT /F1 12 Tf (Vanguard ISA £50,000) ET", "latin1");

    const extracted = extractTextFromPdfBuffer(pdfData);
    expect(extracted).toBe("Vanguard ISA £50,000");
  });

  it("extracts text across multiple compressed stream blocks in multi-page PDFs", () => {
    const stream1 = zlib.deflateSync(Buffer.from("(Page 1 SIPP £200,000) Tj", "latin1"));
    const stream2 = zlib.deflateSync(Buffer.from("(Page 2 ISA £20,000) Tj", "latin1"));

    const pdfData = Buffer.concat([
      Buffer.from("1 0 obj\n<< /Filter /FlateDecode >>\nstream\r\n", "latin1"),
      stream1,
      Buffer.from("\r\nendstream\nendobj\n2 0 obj\n<< /Filter /FlateDecode >>\nstream\r\n", "latin1"),
      stream2,
      Buffer.from("\r\nendstream\nendobj", "latin1"),
    ]);

    const extracted = extractPdfText(pdfData);
    expect(extracted).toContain("Page 1 SIPP £200,000");
    expect(extracted).toContain("Page 2 ISA £20,000");
  });

  it("handles escaped parentheses inside fund names", () => {
    const rawContent = "(Vanguard FTSE Global All Cap Index Fund \\(UK\\) £45,000) Tj";
    const compressed = zlib.deflateSync(Buffer.from(rawContent, "latin1"));

    const pdfData = Buffer.concat([
      Buffer.from("1 0 obj\n<< /Filter /FlateDecode >>\nstream\r\n", "latin1"),
      compressed,
      Buffer.from("\r\nendstream\nendobj", "latin1"),
    ]);

    const extracted = extractPdfText(pdfData);
    expect(extracted).toContain("Vanguard FTSE Global All Cap Index Fund (UK) £45,000");
  });

  it("decompresses raw deflate streams (RFC 1951)", () => {
    const rawContent = "(HL SIPP £150,000) Tj";
    const compressed = zlib.deflateRawSync(Buffer.from(rawContent, "latin1"));

    const pdfData = Buffer.concat([
      Buffer.from("1 0 obj\n<< /Filter /FlateDecode >>\nstream\n", "latin1"),
      compressed,
      Buffer.from("\nendstream\nendobj", "latin1"),
    ]);

    const extracted = extractPdfText(pdfData);
    expect(extracted).toContain("HL SIPP £150,000");
  });

  it("decodes Hex and UTF-16 BE string literals", () => {
    const hexLiteral = "<4953412042616c616e636520c2a335302c303030> Tj";
    const utf16Literal = "<FEFF0053004900500050> Tj";

    const pdfData = Buffer.from(
      `1 0 obj\nstream\n${hexLiteral} ${utf16Literal}\nendstream\nendobj`,
      "latin1"
    );

    const extracted = extractTextFromPdfBuffer(pdfData);
    expect(extracted).toContain("ISA Balance £50,000");
    expect(extracted).toContain("SIPP");
  });
});
