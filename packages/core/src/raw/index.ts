// 層1: JSONL読み込み。スキーマ寛容な生レコード(RawRecord)をストリームで返す。
// スキーマはCLIバージョンで揺れるため、既知キーはtypeのみ必須とし、
// 未知キーはlooseObjectですべて保持する(docs/spec/input-format.md)。
// 77MB級のファイルがあるため全量をメモリに載せない(readline + createReadStream)。

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { z } from "zod";

export const rawRecordSchema = z.looseObject({
  type: z.string(),
});

export type RawRecord = z.infer<typeof rawRecordSchema>;

export type RawLine =
  | { readonly kind: "record"; readonly lineNumber: number; readonly record: RawRecord }
  | { readonly kind: "skipped"; readonly lineNumber: number };

function parseLine(line: string, lineNumber: number): RawLine {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { kind: "skipped", lineNumber };
  }
  const result = rawRecordSchema.safeParse(parsed);
  return result.success
    ? { kind: "record", lineNumber, record: result.data }
    : { kind: "skipped", lineNumber };
}

export async function* streamRawLines(jsonlPath: string): AsyncGenerator<RawLine> {
  const input = createReadStream(jsonlPath, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Number.POSITIVE_INFINITY });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    if (line.trim() === "") {
      continue;
    }
    yield parseLine(line, lineNumber);
  }
}
