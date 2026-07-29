import zlib from "zlib";

/**
 * Extract text tokens from a string (decompressed stream content or raw buffer text).
 * Decodes parenthesized string literals (handling escaped parens) and hex string literals.
 */
export function extractPdfTextTokens(rawStr: string): string[] {
  const pieces: string[] = [];

  // 1. Match paren string literals (handling escaped parens \( and \))
  const parenMatches = rawStr.match(/\((?:[^\()\\]|\\.)*\)/g);
  if (parenMatches) {
    for (const m of parenMatches) {
      let content = m.slice(1, -1);
      // Unescape PDF string escape sequences: \( -> (, \) -> ), \\ -> \, \r -> \n, \t, etc.
      content = content
        .replace(/\\([()\\nrtbf])/g, (_, char) => {
          if (char === "(") return "(";
          if (char === ")") return ")";
          if (char === "\\") return "\\";
          if (char === "n") return "\n";
          if (char === "r") return "\r";
          if (char === "t") return "\t";
          return char;
        })
        .replace(/\\\d{1,3}/g, "") // octal escape sequences
        .trim();

      if (content.length > 0 && /[a-zA-Z0-9£$€,.%]/.test(content)) {
        pieces.push(content);
      }
    }
  }

  // 2. Match Hex string literals <48656c6c6f>
  const hexMatches = rawStr.match(/<([0-9a-fA-F\s]{4,})>/g);
  if (hexMatches) {
    for (const hm of hexMatches) {
      const hexDigits = hm.slice(1, -1).replace(/\s+/g, "");
      if (hexDigits.length % 2 !== 0) continue;
      try {
        const hexBuffer = Buffer.from(hexDigits, "hex");
        let decoded = "";
        if (hexBuffer.length >= 2 && hexBuffer[0] === 0xfe && hexBuffer[1] === 0xff) {
          decoded = new TextDecoder("utf-16be").decode(hexBuffer.subarray(2));
        } else {
          decoded = hexBuffer.toString("utf8");
        }
        decoded = decoded.trim();
        if (decoded.length > 0 && /[a-zA-Z0-9£$€,.%]/.test(decoded)) {
          pieces.push(decoded);
        }
      } catch {
        // ignore invalid hex byte conversion
      }
    }
  }

  return pieces;
}

/**
 * Extract clean text content from PDF binary buffer (handles multi-page FlateDecode streams reliably).
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  const textPieces: string[] = [];

  let offset = 0;
  while (offset < buffer.length) {
    const streamIdx = buffer.indexOf("stream", offset);
    if (streamIdx === -1) break;

    const endStreamIdx = buffer.indexOf("endstream", streamIdx);
    if (endStreamIdx === -1) break;

    let start = streamIdx + 6;
    if (buffer[start] === 0x0d) start++; // \r
    if (buffer[start] === 0x0a) start++; // \n

    let end = endStreamIdx;
    while (end > start && (buffer[end - 1] === 0x0a || buffer[end - 1] === 0x0d)) {
      end--;
    }

    const streamBytes = buffer.subarray(start, end);

    let decompressedStr = "";

    // Decompression attempts: zlib inflate -> raw inflate -> unzip -> latin1 string
    try {
      decompressedStr = zlib.inflateSync(streamBytes).toString("latin1");
    } catch {
      try {
        decompressedStr = zlib.inflateRawSync(streamBytes).toString("latin1");
      } catch {
        try {
          decompressedStr = zlib.unzipSync(streamBytes).toString("latin1");
        } catch {
          decompressedStr = streamBytes.toString("latin1");
        }
      }
    }

    if (decompressedStr) {
      const extracted = extractPdfTextTokens(decompressedStr);
      for (const item of extracted) {
        textPieces.push(item);
      }
    }

    offset = endStreamIdx + 9;
  }

  // Fallback: if no text pieces were extracted from stream blocks, scan the entire buffer
  if (textPieces.length === 0) {
    const latin1Text = buffer.toString("latin1");
    const extracted = extractPdfTextTokens(latin1Text);
    for (const item of extracted) {
      textPieces.push(item);
    }
  }

  return textPieces.join(" ");
}

