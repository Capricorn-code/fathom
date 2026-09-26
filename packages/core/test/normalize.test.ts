import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { type NormalizedEvent, normalizeRecord } from "../src/normalize/index.js";
import { streamRawLines } from "../src/raw/index.js";

const fixturePath = fileURLToPath(new URL("./fixtures/session-normalize.jsonl", import.meta.url));

const normalizeFixture = async (): Promise<readonly NormalizedEvent[]> => {
  const events: NormalizedEvent[] = [];
  for await (const line of streamRawLines(fixturePath)) {
    if (line.kind === "record") {
      events.push(...normalizeRecord(line.record));
    }
  }
  return events;
};

describe("層2: イベント正規化", () => {
  describe("typedプロンプト抽出", () => {
    it("promptSource==typed かつ isMetaでない行だけが user_prompt になる", async () => {
      const events = await normalizeFixture();
      const prompts = events.filter((event) => event.kind === "user_prompt");
      expect(prompts).toHaveLength(1);
      expect(prompts[0]?.text).toBe("サンプル関数をリファクタして");
    });
  });

  describe("tool_call / tool_result", () => {
    it("tool_useがツール名とファイルパスつきの tool_call になる", async () => {
      const events = await normalizeFixture();
      const calls = events.filter((event) => event.kind === "tool_call");
      expect(calls).toHaveLength(1);
      expect(calls[0]?.toolName).toBe("Edit");
      expect(calls[0]?.filePath).toBe("src/sample.ts");
    });

    it("tool_resultはis_errorだけを持ち、生データはイベントに含まれない", async () => {
      const events = await normalizeFixture();
      const results = events.filter((event) => event.kind === "tool_result");
      expect(results).toHaveLength(1);
      expect(results[0]?.isError).toBe(true);
      expect(JSON.stringify(events)).not.toContain("raw-output-must-not-leak");
    });
  });

  describe("sidechain隔離", () => {
    it("isSidechain=true のレコードはイベントを生成しない", async () => {
      const events = await normalizeFixture();
      expect(JSON.stringify(events)).not.toContain("サブエージェント");
    });
  });

  describe("turn_meta", () => {
    it("usageがトークン数つきの turn_meta になる", async () => {
      const events = await normalizeFixture();
      const metas = events.filter((event) => event.kind === "turn_meta");
      const normal = metas.find((meta) => !meta.synthetic);
      expect(normal?.inputTokens).toBe(100);
      expect(normal?.outputTokens).toBe(20);
      expect(normal?.model).toBe("claude-sonnet-5");
    });

    it("<synthetic>モデルの応答は synthetic として区別できる", async () => {
      const events = await normalizeFixture();
      const metas = events.filter((event) => event.kind === "turn_meta");
      expect(metas).toHaveLength(2);
      expect(metas.filter((meta) => meta.synthetic)).toHaveLength(1);
    });
  });

  describe("対象外レコード", () => {
    it("attachment等のレコードはイベントを生成しない", () => {
      expect(normalizeRecord({ type: "attachment" })).toEqual([]);
    });
  });

  describe("キャッシュ系トークン(#31)", () => {
    it("usageのキャッシュ読み込み・作成トークンがturn_metaに含まれる", () => {
      const events = normalizeRecord({
        type: "assistant",
        message: {
          model: "claude-sonnet-5",
          usage: {
            input_tokens: 10,
            cache_read_input_tokens: 100,
            cache_creation_input_tokens: 20,
          },
        },
      });
      const meta = events.find((event) => event.kind === "turn_meta");
      expect(meta).toMatchObject({
        inputTokens: 10,
        cacheReadTokens: 100,
        cacheCreationTokens: 20,
      });
    });

    it("キャッシュ系フィールドを持たない古い形式のusageでも破綻しない", () => {
      const events = normalizeRecord({
        type: "assistant",
        message: { model: "claude-sonnet-5", usage: { input_tokens: 10, output_tokens: 5 } },
      });
      const meta = events.find((event) => event.kind === "turn_meta");
      expect(meta).toMatchObject({ inputTokens: 10, cacheReadTokens: 0, cacheCreationTokens: 0 });
    });
  });
});
