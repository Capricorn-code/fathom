import type { SessionDigest } from "@fathom/core";
import { describe, expect, it } from "vitest";
import { renderSummaryMarkdown } from "../src/render.js";

const digest: SessionDigest = {
  sessionId: "session-001",
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-01-01T01:30:00.000Z",
  prompts: ["サンプル関数をリファクタして", "テストも追加して"],
  files: [
    { path: "src/sample.ts", edits: 3 },
    { path: "test/sample.test.ts", edits: 1 },
  ],
  tools: [
    { name: "Edit", count: 4 },
    { name: "Bash", count: 2 },
  ],
  errorCount: 2,
  resolvedCount: 1,
  syntheticCount: 1,
  inputTokens: 1500,
  outputTokens: 300,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
};

const emptyDigest: SessionDigest = {
  sessionId: "empty-session",
  startedAt: undefined,
  endedAt: undefined,
  prompts: [],
  files: [],
  tools: [],
  errorCount: 0,
  resolvedCount: 0,
  syntheticCount: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
};

describe("サマリMDレンダリング", () => {
  describe("必須セクション", () => {
    it("期間・指示一覧・触ったファイル・エラー・トークンのセクションがすべて含まれる", () => {
      const md = renderSummaryMarkdown(digest);
      expect(md).toContain("## 期間");
      expect(md).toContain("## あなたの指示");
      expect(md).toContain("## 触れられたファイル");
      expect(md).toContain("## エラー");
      expect(md).toContain("## トークン量");
    });

    it("集計値が本文に反映される", () => {
      const md = renderSummaryMarkdown(digest);
      expect(md).toContain("サンプル関数をリファクタして");
      expect(md).toContain("src/sample.ts");
      expect(md).toContain("3回");
      expect(md).toContain("1,500");
      expect(md).toContain("300");
    });
  });

  describe("帰属を断定しない文言(docs/product.md)", () => {
    it("「あなたは〜した」形式の断定文言を含まない", () => {
      const md = renderSummaryMarkdown(digest);
      expect(md).not.toMatch(/あなたは.+(した|しました)/);
      expect(md).not.toContain("実装しました");
    });

    it("「〜が行われた。あなたの指示n回」形式で表現される", () => {
      const md = renderSummaryMarkdown(digest);
      expect(md).toContain("編集が行われました");
      expect(md).toContain("あなたの指示: 2回");
    });
  });

  describe("空データ耐性", () => {
    it("全項目が空でも破綻せず「なし」等で出力される", () => {
      const md = renderSummaryMarkdown(emptyDigest);
      expect(md).toContain("## あなたの指示");
      expect(md).toContain("(なし)");
      expect(md).not.toContain("undefined");
      expect(md).not.toContain("NaN");
    });

    it("期間が不明な場合は「不明」と表示される", () => {
      const md = renderSummaryMarkdown(emptyDigest);
      expect(md).toContain("不明");
    });
  });
});
