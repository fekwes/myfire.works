import zlib from "zlib";

export interface PdfStreamInfo {
  data: Buffer;
  filters: string[];
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) return "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const fn = typeof pdfParse === "function" ? pdfParse : pdfParse.default;
    if (typeof fn === "function") {
      const parsed = await fn(buffer);
      if (parsed && typeof parsed.text === "string" && parsed.text.trim().length > 0) {
        const clean = parsed.text
          .replace(/(\d+),(\d{3})\s*o\s*(\d{2})/g, "$1,$2.$3")
          .replace(/(\d+)\s*o\s*(\d{2}\b)/g, "$1.$2")
          .replace(/\b([A-Za-z])\s+(?=[A-Za-z]\b)/g, "$1");
        return clean;
      }
    }
  } catch (err) {
    console.warn("pdf-parse primary extraction failed, using fallback stream parser", err);
  }
  return extractPdfText(buffer);
}

/**
 * Decode FlateDecode stream data using Node zlib inflate/unzip/inflateRaw.
 */
export function decodeFlate(buffer: Buffer): Buffer {
  if (!buffer || buffer.length === 0) return buffer;
  try {
    return zlib.inflateSync(buffer);
  } catch {
    try {
      return zlib.unzipSync(buffer);
    } catch {
      try {
        return zlib.inflateRawSync(buffer);
      } catch {
        return buffer;
      }
    }
  }
}

/**
 * Decode ASCIIHexDecode stream data.
 */
export function decodeASCIIHex(buffer: Buffer): Buffer {
  if (!buffer || buffer.length === 0) return buffer;
  let str = buffer.toString("latin1");
  const endIdx = str.indexOf(">");
  if (endIdx !== -1) {
    str = str.slice(0, endIdx);
  }
  const hex = str.replace(/[^0-9a-fA-F]/g, "");
  if (hex.length === 0) return Buffer.alloc(0);
  let paddedHex = hex;
  if (paddedHex.length % 2 !== 0) {
    paddedHex += "0";
  }
  return Buffer.from(paddedHex, "hex");
}

/**
 * Decode ASCII85Decode (Base85) stream data.
 */
export function decodeASCII85(buffer: Buffer): Buffer {
  if (!buffer || buffer.length === 0) return buffer;
  let str = buffer.toString("latin1");
  const endIdx = str.indexOf("~>");
  if (endIdx !== -1) {
    str = str.slice(0, endIdx);
  }
  str = str.replace(/\s/g, "");

  const out: number[] = [];
  let i = 0;
  while (i < str.length) {
    const char = str[i];
    if (char === "z") {
      out.push(0, 0, 0, 0);
      i++;
      continue;
    }
    const group: number[] = [];
    while (i < str.length && group.length < 5) {
      const c = str.charCodeAt(i);
      if (c >= 33 && c <= 117) {
        group.push(c - 33);
      }
      i++;
    }
    if (group.length === 0) break;

    const count = group.length;
    while (group.length < 5) {
      group.push(84); // Pad with 'u'
    }

    const val =
      group[0] * 52200625 +
      group[1] * 614125 +
      group[2] * 7225 +
      group[3] * 85 +
      group[4];

    const b1 = (val >>> 24) & 0xff;
    const b2 = (val >>> 16) & 0xff;
    const b3 = (val >>> 8) & 0xff;
    const b4 = val & 0xff;

    if (count === 5) {
      out.push(b1, b2, b3, b4);
    } else if (count === 4) {
      out.push(b1, b2, b3);
    } else if (count === 3) {
      out.push(b1, b2);
    } else if (count === 2) {
      out.push(b1);
    }
  }
  return Buffer.from(out);
}

/**
 * Extract filter names from a PDF object stream dictionary string.
 */
export function extractFilterNames(dictStr: string): string[] {
  const filters: string[] = [];
  const filterMatch = dictStr.match(/\/Filter\s*(?:\/([A-Za-z0-9_]+)|\[\s*([\s\S]*?)\s*\])/);
  if (filterMatch) {
    if (filterMatch[1]) {
      filters.push(filterMatch[1]);
    } else if (filterMatch[2]) {
      const names = filterMatch[2].match(/\/([A-Za-z0-9_]+)/g);
      if (names) {
        for (const n of names) {
          filters.push(n.replace("/", ""));
        }
      }
    }
  }
  return filters;
}

/**
 * Search a PDF binary buffer for stream objects and their filter metadata.
 */
export function findPdfStreams(buf: Buffer): PdfStreamInfo[] {
  const streams: PdfStreamInfo[] = [];
  const streamMarker = Buffer.from("stream");
  const endStreamMarker = Buffer.from("endstream");

  let pos = 0;
  while (pos < buf.length) {
    const streamIdx = buf.indexOf(streamMarker, pos);
    if (streamIdx === -1) break;

    const dictStart = Math.max(0, streamIdx - 1024);
    const dictSlice = buf.subarray(dictStart, streamIdx).toString("latin1");
    const filters = extractFilterNames(dictSlice);

    let dataStart = streamIdx + streamMarker.length;
    if (buf[dataStart] === 0x0d && buf[dataStart + 1] === 0x0a) {
      dataStart += 2;
    } else if (buf[dataStart] === 0x0a || buf[dataStart] === 0x0d) {
      dataStart += 1;
    }

    const endIdx = buf.indexOf(endStreamMarker, dataStart);
    if (endIdx === -1) {
      pos = streamIdx + streamMarker.length;
      continue;
    }

    let dataEnd = endIdx;
    if (dataEnd > dataStart && buf[dataEnd - 1] === 0x0a) {
      dataEnd--;
      if (dataEnd > dataStart && buf[dataEnd - 1] === 0x0d) {
        dataEnd--;
      }
    }

    const streamData = buf.subarray(dataStart, dataEnd);
    streams.push({ data: streamData, filters });

    pos = endIdx + endStreamMarker.length;
  }

  return streams;
}

/**
 * Apply stream filters in order.
 */
export function decodePdfStream(data: Buffer, filters: string[]): Buffer {
  let current = data;
  for (const filter of filters) {
    const f = filter.toLowerCase();
    if (f.includes("flate")) {
      current = decodeFlate(current);
    } else if (f.includes("hex")) {
      current = decodeASCIIHex(current);
    } else if (f.includes("85")) {
      current = decodeASCII85(current);
    }
  }
  return current;
}

/**
 * Parse CMap / ToUnicode font table mapping entries from decompressed PDF stream.
 */
export function parseCMapTable(streamText: string): Map<string, string> {
  const cmap = new Map<string, string>();
  if (!streamText.includes("beginbfchar") && !streamText.includes("beginbfrange")) {
    return cmap;
  }

  // Parse beginbfchar: <0001> <0050>
  const bfcharBlocks = streamText.split("beginbfchar");
  for (let i = 1; i < bfcharBlocks.length; i++) {
    const block = bfcharBlocks[i].split("endbfchar")[0];
    const regex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let m;
    while ((m = regex.exec(block)) !== null) {
      const srcHex = m[1].toUpperCase().padStart(4, "0");
      const dstHex = m[2].toUpperCase();
      let charStr = "";
      for (let j = 0; j < dstHex.length; j += 4) {
        const code = parseInt(dstHex.slice(j, j + 4), 16);
        if (!isNaN(code)) charStr += String.fromCharCode(code);
      }
      if (charStr) cmap.set(srcHex, charStr);
    }
  }

  // Parse beginbfrange: <0001> <0005> <0041>
  const bfrangeBlocks = streamText.split("beginbfrange");
  for (let i = 1; i < bfrangeBlocks.length; i++) {
    const block = bfrangeBlocks[i].split("endbfrange")[0];
    const regex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let m;
    while ((m = regex.exec(block)) !== null) {
      const startCode = parseInt(m[1], 16);
      const endCode = parseInt(m[2], 16);
      const dstStartCode = parseInt(m[3], 16);
      const hexLen = m[1].length;
      if (!isNaN(startCode) && !isNaN(endCode) && !isNaN(dstStartCode)) {
        for (let code = startCode; code <= endCode; code++) {
          const srcHex = code.toString(16).toUpperCase().padStart(hexLen, "0").padStart(4, "0");
          const dstChar = String.fromCharCode(dstStartCode + (code - startCode));
          cmap.set(srcHex, dstChar);
        }
      }
    }
  }

  return cmap;
}

/**
 * Parse a single parenthesized PDF string literal `(...)`, handling nested parentheses,
 * backslash escapes (`\(`, `\)`, `\\`, `\n`, `\r`, `\t`), and octal escapes (`\ddd`).
 */
export function parseSinglePdfString(
  src: string,
  startIdx: number,
): { text: string | null; nextIndex: number } {
  if (src[startIdx] !== "(") return { text: null, nextIndex: startIdx };

  let depth = 0;
  let i = startIdx;
  let result = "";

  while (i < src.length) {
    const ch = src[i];

    if (ch === "\\") {
      i++;
      if (i >= src.length) break;
      const esc = src[i];
      if (esc === "(") result += "(";
      else if (esc === ")") result += ")";
      else if (esc === "\\") result += "\\";
      else if (esc === "n") result += "\n";
      else if (esc === "r") result += "\r";
      else if (esc === "t") result += "\t";
      else if (esc === "b") result += "\b";
      else if (esc === "f") result += "\f";
      else if (/[0-7]/.test(esc)) {
        let octalStr = esc;
        if (i + 1 < src.length && /[0-7]/.test(src[i + 1])) {
          octalStr += src[++i];
          if (i + 1 < src.length && /[0-7]/.test(src[i + 1])) {
            octalStr += src[++i];
          }
        }
        const charCode = parseInt(octalStr, 8);
        if (charCode === 163) {
          result += "£";
        } else {
          result += String.fromCharCode(charCode);
        }
      } else {
        result += esc;
      }
    } else if (ch === "(") {
      depth++;
      if (depth > 1) result += "(";
    } else if (ch === ")") {
      depth--;
      if (depth === 0) {
        return { text: result, nextIndex: i + 1 };
      }
      result += ")";
    } else {
      result += ch;
    }

    i++;
  }

  return { text: result, nextIndex: i };
}

/**
 * Extract all parenthesized text strings from a PDF content stream.
 */
export function parseParenthesizedStrings(src: string): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < src.length) {
    if (src[i] === "(") {
      const parsed = parseSinglePdfString(src, i);
      if (parsed.text !== null) {
        result.push(parsed.text);
        i = parsed.nextIndex;
        continue;
      }
    }
    i++;
  }

  return result;
}

/**
 * Decode CID hex character sequence using CMap dictionary.
 */
function decodeCidHex(hexStr: string, cmap: Map<string, string>): string {
  let decoded = "";
  const cleanHex = hexStr.replace(/[^0-9a-fA-F]/g, "");
  for (let i = 0; i < cleanHex.length; i += 4) {
    const chunk = cleanHex.slice(i, i + 4).toUpperCase().padStart(4, "0");
    const char = cmap.get(chunk);
    if (char !== undefined) {
      decoded += char;
    }
  }
  if (!decoded) {
    for (let i = 0; i < cleanHex.length; i += 2) {
      const chunk = cleanHex.slice(i, i + 2).toUpperCase().padStart(4, "0");
      const char = cmap.get(chunk);
      if (char !== undefined) {
        decoded += char;
      }
    }
  }
  return decoded;
}

/**
 * Extract text from a decoded PDF content stream by inspecting Tj, TJ, ', ", T*, Td, TD, ET operators,
 * CMap CID hex strings, and parenthesized text blocks.
 */
export function extractTextFromPdfStream(streamText: string, cmap?: Map<string, string>): string {
  const lines: string[] = [];
  let currentLine: string[] = [];

  let i = 0;
  while (i < streamText.length) {
    if (streamText[i] === "[") {
      const endBracket = streamText.indexOf("]", i);
      if (endBracket !== -1) {
        const arrayContent = streamText.slice(i + 1, endBracket);
        const rest = streamText.slice(endBracket + 1, endBracket + 10);
        const tjOpMatch = rest.match(/^\s*TJ\b/i);
        if (tjOpMatch) {
          const strings = parseParenthesizedStrings(arrayContent);
          if (strings.length > 0) {
            currentLine.push(strings.join(""));
          } else if (cmap && cmap.size > 0) {
            const hexes = arrayContent.match(/<([0-9a-fA-F]+)>/g);
            if (hexes) {
              for (const hStr of hexes) {
                const decoded = decodeCidHex(hStr, cmap);
                if (decoded) currentLine.push(decoded);
              }
            }
          }
          i = endBracket + tjOpMatch[0].length + 1;
          continue;
        }
      }
    }

    if (streamText[i] === "<" && streamText[i + 1] !== "<") {
      const endAngle = streamText.indexOf(">", i);
      if (endAngle !== -1) {
        const hexData = streamText.slice(i + 1, endAngle);
        const rest = streamText.slice(endAngle + 1, endAngle + 10);
        const tjOpMatch = rest.match(/^\s*(Tj|'|")/i);
        if (tjOpMatch && cmap && cmap.size > 0) {
          const decoded = decodeCidHex(hexData, cmap);
          if (decoded) currentLine.push(decoded);
          i = endAngle + tjOpMatch[0].length + 1;
          continue;
        }

        const decodedBuf = decodeASCIIHex(Buffer.from(hexData, "latin1"));
        let decodedText = "";
        if (decodedBuf.length >= 2 && decodedBuf[0] === 0xfe && decodedBuf[1] === 0xff) {
          decodedText = new TextDecoder("utf-16be").decode(decodedBuf.subarray(2));
        } else {
          decodedText = decodedBuf.toString("utf8");
        }
        if (decodedText.trim()) {
          currentLine.push(decodedText.trim());
        }
        i = endAngle + 1;
        continue;
      }
    }

    if (streamText[i] === "(") {
      const { text, nextIndex } = parseSinglePdfString(streamText, i);
      if (text !== null) {
        const rest = streamText.slice(nextIndex, nextIndex + 15);
        const opMatch = rest.match(/^\s*(Tj|'|")/i);
        if (opMatch) {
          currentLine.push(text);
          if (opMatch[1] === "'" || opMatch[1] === '"') {
            lines.push(currentLine.join(" "));
            currentLine = [];
          }
          i = nextIndex + opMatch[0].length;
          continue;
        } else {
          currentLine.push(text);
          i = nextIndex;
          continue;
        }
      }
    }

    if (streamText[i] === "T" || streamText[i] === "E") {
      const opMatch = streamText.slice(i, i + 5).match(/^(T\*|ET|Td|TD)\b/);
      if (opMatch) {
        if (currentLine.length > 0) {
          lines.push(currentLine.join(" "));
          currentLine = [];
        }
        i += opMatch[0].length;
        continue;
      }
    }

    i++;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine.join(" "));
  }

  if (lines.length === 0) {
    const fallbackStrings = parseParenthesizedStrings(streamText);
    return fallbackStrings.join("\n");
  }

  return lines.join("\n");
}

/**
 * Primary entry point: Extracts text across all stream filters in a PDF document buffer, Uint8Array, or base64 string.
 */
export function extractPdfText(input: Buffer | Uint8Array | string): string {
  let buf: Buffer;

  if (typeof input === "string") {
    const cleanStr = input.replace(/^data:application\/pdf;base64,/, "").trim();
    if (/^[A-Za-z0-9+/=]+$/.test(cleanStr.slice(0, 100)) && cleanStr.length % 4 === 0) {
      buf = Buffer.from(cleanStr, "base64");
    } else {
      buf = Buffer.from(input, "binary");
    }
  } else {
    buf = Buffer.from(input);
  }

  if (!buf || buf.length === 0) return "";

  const streamMatches = findPdfStreams(buf);

  // 1. Build master CMap dictionary from all streams
  const globalCmap = new Map<string, string>();
  for (const stream of streamMatches) {
    const decodedBuf = decodePdfStream(stream.data, stream.filters);
    const decodedText = decodedBuf.toString("latin1");
    if (decodedText.includes("beginbfchar") || decodedText.includes("beginbfrange")) {
      const streamCmap = parseCMapTable(decodedText);
      for (const [k, v] of streamCmap) {
        globalCmap.set(k, v);
      }
    }
  }

  // 2. Extract text from content streams using the global CMap map
  const textBlocks: string[] = [];
  for (const stream of streamMatches) {
    const decodedBuf = decodePdfStream(stream.data, stream.filters);
    const decodedText = decodedBuf.toString("latin1");
    
    // Ignore pure CMap font dictionary streams from output text blocks
    if (decodedText.includes("begincmap") || decodedText.includes("/CIDInit")) continue;

    const extracted = extractTextFromPdfStream(decodedText, globalCmap);
    const rawClean = extracted.trim();
    if (!rawClean) continue;

    // Collapse character spacing (e.g. "P e r s o n a l" -> "Personal")
    let clean = rawClean.replace(/\b([A-Za-z])\s+(?=[A-Za-z]\b)/g, "$1");
    // Normalize font-substituted decimal point 'o' (e.g. "47,128o95" -> "47,128.95")
    clean = clean.replace(/(\d+),(\d{3})\s*o\s*(\d{2})/g, "$1,$2.$3")
                 .replace(/(\d)\s*o\s*(\d{2}\b)/g, "$1.$2");

    // Filter stream output quality: ignore binary font garbage (low ascii ratio)
    const asciiCount = clean.split("").filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).length;
    const asciiRatio = asciiCount / clean.length;
    const containsKeyTerms = /\b(?:Vanguard|SIPP|ISA|GIA|Portfolio|Valuation|Total|Pensions?|Personal|Savings|GBP|£|Account|Holdings|Fund)\b/i.test(clean);

    if (asciiRatio >= 0.70 || containsKeyTerms) {
      textBlocks.push(clean);
    }
  }

  if (textBlocks.length === 0) {
    const rawText = buf.toString("latin1");
    const extracted = extractTextFromPdfStream(rawText, globalCmap);
    if (extracted.trim()) {
      textBlocks.push(extracted.trim());
    }
  }

  return textBlocks.join("\n\n");
}
