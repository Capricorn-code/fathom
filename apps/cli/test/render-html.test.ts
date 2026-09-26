import type { SessionDigest } from "@fathom/core";
import { describe, expect, it } from "vitest";
import type { ConversationTurn } from "../src/conversation.js";
import { renderSummaryHtml } from "../src/render-html.js";

const digest: SessionDigest = {
  sessionId: "html-001",
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-01-01T01:00:00.000Z",
  prompts: ["最初の指示"],
  files: [{ path: "src/sample.ts", edits: 3 }],
  tools: [{ name: "Edit", count: 4 }],
  errorCount: 1,
  resolvedCount: 1,
  syntheticCount: 0,
  inputTokens: 1500,
  outputTokens: 300,
  cacheReadTokens: 1000,
  cacheCreationTokens: 200,
};

const turns: readonly ConversationTurn[] = [
  {
    prompt: "最初の指示",
    responses: [["1行目", "2行目", "3行目", "4行目", "5行目"].join("\n")],
  },
];

describe("サマリのHTML出力", () => {
  describe("自己完結HTML", () => {
    it("スタイル内蔵の完全なHTML文書が生成され、外部リソースを参照しない", () => {
      const html = renderSummaryHtml(digest, turns);
      expect(html).toContain("<!doctype html>");
      expect(html).toContain("<style>");
      expect(html).not.toMatch(/src="https?:|href="https?:/);
    });

    it("集計(期間・ファイル・ツール・エラー・トークン)と会話の流れが含まれる", () => {
      const html = renderSummaryHtml(digest, turns);
      expect(html).toContain("html-001");
      expect(html).toContain("2026-01-01T00:00:00.000Z");
      expect(html).toContain("src/sample.ts");
      expect(html).toContain("Edit");
      expect(html).toContain("1,500");
      expect(html).toContain("最初の指示");
    });

    it("長い応答は折りたたみ(details)で開閉できる", () => {
      const html = renderSummaryHtml(digest, turns);
      expect(html).toContain("<details>");
      expect(html).toContain("5行目");
    });

    it("帰属を断定しない文言ルールが維持される", () => {
      const html = renderSummaryHtml(digest, turns);
      expect(html).not.toMatch(/あなたは.+(した|しました)/);
      expect(html).toContain("断定しません");
    });
  });

  describe("エスケープ", () => {
    it("HTMLタグを含む指示・応答はエスケープされ、スクリプトとして埋め込まれない", () => {
      const html = renderSummaryHtml(digest, [
        { prompt: '<script>alert("x")</script>', responses: ["<img src=x onerror=alert(1)>"] },
      ]);
      expect(html).not.toContain('<script>alert("x")</script>');
      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain("<img src=x");
    });
  });
});
