// SessionDigest → サマリMD。純関数(I/Oなし)。
// 文言ルール(docs/product.md): 帰属を断定しない。
// 「あなたはXを実装した」とは書かず「Xの編集が行われた。あなたの指示n回」と書く。

import type { SessionDigest } from "@fathom/core";
import type { ConversationTurn } from "./conversation.js";

const EXCERPT_LINES = 3;

const formatCount = (value: number): string => value.toLocaleString("en-US");

const listOrNone = (lines: readonly string[]): string =>
  lines.length > 0 ? lines.join("\n") : "(なし)";

const renderTurn = (turn: ConversationTurn, index: number): string => {
  const heading = `### ${index + 1}. ${turn.prompt}`;
  const lines = turn.responses
    .join("\n")
    .split("\n")
    .filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return [heading, "", "(応答の記録なし)"].join("\n");
  }
  const excerpt = lines.slice(0, EXCERPT_LINES).join("\n");
  if (lines.length <= EXCERPT_LINES) {
    return [heading, "", excerpt].join("\n");
  }
  return [
    heading,
    "",
    excerpt,
    "",
    "<details><summary>応答の全文</summary>",
    "",
    lines.join("\n"),
    "",
    "</details>",
  ].join("\n");
};

export function renderSummaryMarkdown(
  digest: SessionDigest,
  turns?: readonly ConversationTurn[],
): string {
  const period =
    digest.startedAt !== undefined && digest.endedAt !== undefined
      ? `${digest.startedAt} 〜 ${digest.endedAt}`
      : "不明";

  // 会話の流れ(表示専用のturns)があれば指示→応答の対で、なければ指示一覧のみを出す
  const conversationHeading = turns !== undefined ? "## あなたの指示とAIの応答" : "## あなたの指示";
  const conversation =
    turns !== undefined
      ? listOrNone(turns.map((turn, index) => renderTurn(turn, index)))
      : listOrNone(digest.prompts.map((prompt, index) => `${index + 1}. ${prompt}`));

  const files = listOrNone(digest.files.map((file) => `- ${file.path}(${file.edits}回)`));

  const tools = listOrNone(digest.tools.map((tool) => `- ${tool.name}: ${tool.count}回`));

  const fileSummary =
    digest.files.length > 0
      ? `${digest.files.length}ファイルへの編集が行われました。あなたの指示: ${digest.prompts.length}回`
      : "ファイルへの編集は記録されていません。";

  const errorSummary =
    digest.errorCount > 0
      ? `${digest.errorCount}件のエラーが発生し、うち${digest.resolvedCount}件はその後の操作の成功が記録されています。`
      : "エラーは記録されていません。";

  return [
    `# セッションサマリ: ${digest.sessionId}`,
    "",
    "> このサマリはセッションログの機械的な集計です。記録された操作の主体(あなた/AI)を断定しません。",
    "",
    "## 期間",
    "",
    period,
    "",
    conversationHeading,
    "",
    conversation,
    "",
    "## 触れられたファイル",
    "",
    fileSummary,
    "",
    files,
    "",
    "## 使用されたツール",
    "",
    tools,
    "",
    "## エラー",
    "",
    errorSummary,
    "",
    "## トークン量",
    "",
    `- 入力: ${formatCount(digest.inputTokens)}${
      digest.cacheReadTokens + digest.cacheCreationTokens > 0
        ? `(うちキャッシュ読み込み ${formatCount(digest.cacheReadTokens)} / キャッシュ作成 ${formatCount(digest.cacheCreationTokens)})`
        : ""
    }`,
    `- 出力: ${formatCount(digest.outputTokens)}`,
    ...(digest.syntheticCount > 0
      ? ["", `(エラー時の合成応答 ${digest.syntheticCount}件は集計から除外)`]
      : []),
    "",
  ].join("\n");
}
