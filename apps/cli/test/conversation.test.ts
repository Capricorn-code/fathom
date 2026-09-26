import type { NormalizedEvent, SessionDigest } from "@fathom/core";
import { describe, expect, it } from "vitest";
import { buildConversationTurns } from "../src/conversation.js";
import { renderSummaryMarkdown } from "../src/render.js";

const events: readonly NormalizedEvent[] = [
  { kind: "assistant_text", text: "指示より前の応答(無視される)" },
  { kind: "user_prompt", text: "最初の指示" },
  { kind: "assistant_text", text: "最初の応答" },
  { kind: "tool_call", toolName: "Edit", filePath: "a.ts" },
  { kind: "assistant_text", text: "続きの応答" },
  { kind: "user_prompt", text: "次の指示" },
  { kind: "turn_meta", synthetic: false, inputTokens: 1, outputTokens: 1 },
];

const digest: SessionDigest = {
  sessionId: "conv-001",
  startedAt: undefined,
  endedAt: undefined,
  prompts: ["最初の指示", "次の指示"],
  files: [],
  tools: [],
  errorCount: 0,
  resolvedCount: 0,
  syntheticCount: 0,
  inputTokens: 0,
  outputTokens: 0,
};

describe("会話の流れの構築", () => {
  it("各指示に次の指示までのAI応答が対として紐付く", () => {
    const turns = buildConversationTurns(events);
    expect(turns).toEqual([
      { prompt: "最初の指示", responses: ["最初の応答", "続きの応答"] },
      { prompt: "次の指示", responses: [] },
    ]);
  });

  it("最初の指示より前の応答は無視される", () => {
    const turns = buildConversationTurns(events);
    expect(JSON.stringify(turns)).not.toContain("指示より前の応答");
  });
});

describe("会話の流れのMD表示", () => {
  it("指示とAI応答の要点が対で表示される", () => {
    const md = renderSummaryMarkdown(digest, buildConversationTurns(events));
    expect(md).toContain("## あなたの指示とAIの応答");
    expect(md).toContain("最初の指示");
    expect(md).toContain("最初の応答");
    expect(md).toContain("次の指示");
  });

  it("長い応答は先頭3行の要点+折りたたみの全文で表示される", () => {
    const longResponse = ["1行目", "2行目", "3行目", "4行目", "5行目", "6行目"].join("\n");
    const md = renderSummaryMarkdown(digest, [
      { prompt: "長い応答を返す指示", responses: [longResponse] },
    ]);
    expect(md).toContain("3行目");
    expect(md).toContain("<details>");
    expect(md).toContain("6行目");
  });

  it("短い応答は折りたたみなしで全文表示される", () => {
    const md = renderSummaryMarkdown(digest, [{ prompt: "指示", responses: ["短い応答"] }]);
    expect(md).toContain("短い応答");
    expect(md).not.toContain("<details>");
  });

  it("応答が記録されていない指示はその旨を表示する", () => {
    const md = renderSummaryMarkdown(digest, [{ prompt: "応答のない指示", responses: [] }]);
    expect(md).toContain("(応答の記録なし)");
  });
});
