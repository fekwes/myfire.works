import zlib from "zlib";

/**
 * Extract clean text content from PDF binary buffer (handles multi-page FlateDecode streams).
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  const textPieces: string[] = [];
  const rawStr = buffer.toString("latin1");

  // Decompress FlateDecode streams
  const streamRegex = /\/Filter\s*\/FlateDecode[^\r\n]*?stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(rawStr)) !== null) {
    try {
      const compressedBytes = Buffer.from(match[1], "latin1");
      const decompressed = zlib.inflateSync(compressedBytes).toString("latin1");

      // Extract text in parentheses (Tj / TJ operators or literal text strings)
      const tjMatches = decompressed.match(/\(([^()]{1,200})\)/g);
      if (tjMatches) {
        for (const m of tjMatches) {
          const content = m.slice(1, -1).trim();
          if (content.length > 0 && /[a-zA-Z0-9£$,.]/.test(content)) {
            textPieces.push(content);
          }
        }
      }
    } catch {
      // Ignore unparseable or corrupted stream blocks
    }
  }

  // Fallback to uncompressed parenthesized literal strings if stream decompression didn't yield text
  if (textPieces.length === 0) {
    const uncompressedMatches = rawStr.match(/\(([^()]{1,150})\)/g);
    if (uncompressedMatches) {
      for (const m of uncompressedMatches) {
        const content = m.slice(1, -1).trim();
        if (content.length > 0 && /[a-zA-Z0-9£$,.]/.test(content)) {
          textPieces.push(content);
        }
      }
    }
  }

  return textPieces.join(" ");
}
