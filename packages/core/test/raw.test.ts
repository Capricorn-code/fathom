import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { type RawLine, streamRawLines } from "../src/raw/index.js";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

const collect = async (jsonlPath: string): Promise<readonly RawLine[]> => {
  const lines: RawLine[] = [];
  for await (const line of streamRawLines(jsonlPath)) {
    lines.push(line);
  }
  return lines;
};

describe("層1: JSONLストリーム読み込み", () => {
  describe("正常系(session-basic.jsonl)", () => {
    it("各行がRawRecordとして順に得られる", async () => {
      const lines = await collect(fixture("session-basic.jsonl"));
      expect(lines).toHaveLength(3);
      expect(lines.every((line) => line.kind === "record")).toBe(true);
      const types = lines.map((line) => (line.kind === "record" ? line.record.type : null));
      expect(types).toEqual(["user", "assistant", "attachment"]);
    });

    it("未知キーも失われず保持される", async () => {
      const lines = await collect(fixture("session-basic.jsonl"));
      const first = lines[0];
      expect(first?.kind).toBe("record");
      if (first?.kind !== "record") return;
      expect(first.record["unknownFutureKey"]).toBe("preserve-me");
    });
  });

  describe("壊れた行のスキップ(session-broken.jsonl)", () => {
    it("壊れた行(不正JSON・非オブジェクト・type欠損)は行番号つきのskippedとして報告される", async () => {
      const lines = await collect(fixture("session-broken.jsonl"));
      const skipped = lines.filter((line) => line.kind === "skipped");
      expect(skipped.map((line) => line.lineNumber)).toEqual([2, 3, 4, 5]);
    });

    it("壊れた行があっても全体は失敗せず、正常な行はRawRecordとして得られる", async () => {
      const lines = await collect(fixture("session-broken.jsonl"));
      const records = lines.filter((line) => line.kind === "record");
      expect(records).toHaveLength(2);
      expect(records.map((line) => line.record.type)).toEqual(["user", "assistant"]);
    });
  });

  describe("空ファイル・空行", () => {
    it("空ファイルは0件で正常終了する", async () => {
      const lines = await collect(fixture("session-empty.jsonl"));
      expect(lines).toEqual([]);
    });

    it("空行はレコードにもskippedにも数えない(session-broken.jsonl 6行目)", async () => {
      const lines = await collect(fixture("session-broken.jsonl"));
      expect(lines.map((line) => line.lineNumber)).not.toContain(6);
      expect(lines).toHaveLength(6);
    });
  });
});
