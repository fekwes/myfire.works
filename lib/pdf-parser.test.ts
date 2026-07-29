import zlib from "zlib";
import { describe, expect, it } from "vitest";
import {
  decodeASCII85,
  decodeASCIIHex,
  decodeFlate,
  extractPdfText,
  extractTextFromPdfStream,
  findPdfStreams,
  parseParenthesizedStrings,
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
    // "Vanguard" in hex is 56616e6775617264
    const hexInput = Buffer.from("56616e6775617264>", "latin1");
    const decoded = decodeASCIIHex(hexInput);
    expect(decoded.toString("latin1")).toBe("Vanguard");
  });

  it("decodes ASCII85Decode stream data", () => {
    // ASCII85 encoding for "Hello W" is 87cURD]i,
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
});
