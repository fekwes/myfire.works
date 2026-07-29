import zlib from "zlib";

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

    const streamBytes = buffer.subarray(start, endStreamIdx);

    try {
      const decompressed = zlib.inflateSync(streamBytes).toString("latin1");
      const matches = decompressed.match(/\(([^()]{1,200})\)/g);
      if (matches) {
        for (const m of matches) {
          const content = m.slice(1, -1).trim();
          if (content.length > 0 && /[a-zA-Z0-9£$,.]/.test(content)) {
            textPieces.push(content);
          }
        }
      }
    } catch {
      try {
        const rawStr = streamBytes.toString("latin1");
        const matches = rawStr.match(/\(([^()]{1,200})\)/g);
        if (matches) {
          for (const m of matches) {
            const content = m.slice(1, -1).trim();
            if (content.length > 0 && /[a-zA-Z0-9£$,.]/.test(content)) {
              textPieces.push(content);
            }
          }
        }
      } catch {
        // ignore unparseable stream segment
      }
    }

    offset = endStreamIdx + 9;
  }

  if (textPieces.length === 0) {
    const fullText = buffer.toString("latin1");
    const matches = fullText.match(/\(([^()]{1,150})\)/g);
    if (matches) {
      for (const m of matches) {
        const content = m.slice(1, -1).trim();
        if (content.length > 0 && /[a-zA-Z0-9£$,.]/.test(content)) {
          textPieces.push(content);
        }
      }
    }
  }

  return textPieces.join(" ");
}
