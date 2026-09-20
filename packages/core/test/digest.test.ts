import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSessionDigest } from "../src/digest/index.js";
import { type NormalizedEvent, normalizeRecord } from "../src/normalize/index.js";
import { streamRawLines } from "../src/raw/index.js";

const fixturePath = fileURLToPath(new URL("./fixtures/session-normalize.jsonl", import.meta.url));

const fixtureEvents = async (): Promise<readonly NormalizedEvent[]> => {
  const events: NormalizedEvent[] = [];
  for await (const line of streamRawLines(fixturePath)) {
    if (line.kind === "record") {
      events.push(...normalizeRecord(line.record));
    }
  }
  return events;
};

describe("層3: SessionDigest生成", () => {
  describe("基本集計(fixture由来のイベント列)", () => {
    it("sessionId・期間・typedプロンプト一覧・ファイル編集回数・ツール分類・トークン量が得られる", async () => {
      const digest = buildSessionDigest(await fixtureEvents(), { sessionId: "session-001" });
      expect(digest.sessionId).toBe("session-001");
      expect(digest.startedAt).toBe("2026-01-01T00:00:00.000Z");
      expect(digest.endedAt).toBe("2026-01-01T00:00:10.000Z");
      expect(digest.prompts).toEqual(["サンプル関数をリファクタして"]);
      expect(digest.files).toEqual([{ path: "src/sample.ts", edits: 1 }]);
      expect(digest.tools).toEqual([{ name: "Edit", count: 1 }]);
    });
  });

  describe("エラー数と解決数", () => {
    const at = (index: number): string => `2026-01-01T00:00:${String(index).padStart(2, "0")}.000Z`;
    const call = (index: number, toolName: string): NormalizedEvent => ({
      kind: "tool_call",
      toolName,
      timestamp: at(index),
    });
    const result = (index: number, isError: boolean): NormalizedEvent => ({
      kind: "tool_result",
      isError,
      timestamp: at(index),
    });

    it("エラー後に同じツールが成功していれば解決として数える", () => {
      const digest = buildSessionDigest(
        [call(1, "Bash"), result(2, true), call(3, "Bash"), result(4, false)],
        { sessionId: "s" },
      );
      expect(digest.errorCount).toBe(1);
      expect(digest.resolvedCount).toBe(1);
    });

    it("エラー後に同じツールの成功がなければ未解決のまま数える", () => {
      const digest = buildSessionDigest(
        [call(1, "Bash"), result(2, true), call(3, "Edit"), result(4, false)],
        { sessionId: "s" },
      );
      expect(digest.errorCount).toBe(1);
      expect(digest.resolvedCount).toBe(0);
    });
  });

  describe("トークン集計とsynthetic除外", () => {
    it("syntheticの応答はトークン量に混ぜない", () => {
      const events: readonly NormalizedEvent[] = [
        {
          kind: "turn_meta",
          model: "claude-sonnet-5",
          synthetic: false,
          inputTokens: 100,
          outputTokens: 20,
        },
        {
          kind: "turn_meta",
          model: "<synthetic>",
          synthetic: true,
          inputTokens: 999,
          outputTokens: 999,
        },
        {
          kind: "turn_meta",
          model: "claude-sonnet-5",
          synthetic: false,
          inputTokens: 50,
          outputTokens: 10,
        },
      ];
      const digest = buildSessionDigest(events, { sessionId: "s" });
      expect(digest.inputTokens).toBe(150);
      expect(digest.outputTokens).toBe(30);
      expect(digest.syntheticCount).toBe(1);
    });
  });

  describe("禁止項目が型に存在しない(ADR-003/005)", () => {
    it("Digestのキーは許可された集計項目だけで構成される", async () => {
      const digest = buildSessionDigest(await fixtureEvents(), { sessionId: "s" });
      expect(Object.keys(digest).toSorted()).toEqual(
        [
          "sessionId",
          "startedAt",
          "endedAt",
          "prompts",
          "files",
          "tools",
          "errorCount",
          "resolvedCount",
          "syntheticCount",
          "inputTokens",
          "outputTokens",
        ].toSorted(),
      );
    });

    it("イベント由来の生データ(tool_result本文等)はDigestのどこにも現れない", async () => {
      const digest = buildSessionDigest(await fixtureEvents(), { sessionId: "s" });
      expect(JSON.stringify(digest)).not.toContain("raw-output-must-not-leak");
    });
  });

  describe("空イベント列", () => {
    it("0件でも破綻せず空のDigestが得られる", () => {
      const digest = buildSessionDigest([], { sessionId: "empty" });
      expect(digest.prompts).toEqual([]);
      expect(digest.files).toEqual([]);
      expect(digest.errorCount).toBe(0);
      expect(digest.startedAt).toBeUndefined();
    });
  });
});
