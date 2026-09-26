// SessionDigest + 会話の流れ → 自己完結HTML。純関数(I/Oなし)。
// 暫定の「画面」(Issue #36)。本格画面はM3以降のWebサービス化で提供する。
// 外部CDN・スクリプトを参照しない(オフラインで開ける・XSS面も単純に保つ)。
// 文言ルール(docs/product.md): 帰属を断定しない。

import type { SessionDigest } from "@fathom/core";
import type { ConversationTurn } from "./conversation.js";

const EXCERPT_LINES = 3;

const escapeHtml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const formatCount = (value: number): string => value.toLocaleString("en-US");

const STYLE = `
:root { color-scheme: light dark; }
body { font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif;
  max-width: 780px; margin: 0 auto; padding: 24px 16px; line-height: 1.7; }
h1 { font-size: 1.4rem; } h2 { font-size: 1.1rem; margin-top: 2em;
  border-bottom: 1px solid color-mix(in srgb, currentColor 25%, transparent); padding-bottom: 4px; }
h3 { font-size: 1rem; margin: 1.6em 0 0.2em; }
.desc { font-size: 0.85rem; opacity: 0.7; margin: 0 0 6px; }
.notice { font-size: 0.85rem; opacity: 0.75; border-left: 3px solid currentColor; padding-left: 10px; }
dl.stats { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; }
dl.stats dt { font-weight: 600; } dl.stats dd { margin: 0; }
ol.turns { padding-left: 0; list-style: none; counter-reset: turn; }
ol.turns > li { margin: 20px 0; padding: 12px 14px; border-radius: 8px;
  background: color-mix(in srgb, currentColor 6%, transparent); counter-increment: turn; }
.prompt { font-weight: 600; } .prompt::before { content: counter(turn) ". "; opacity: 0.6; }
.response { margin: 8px 0 0; white-space: pre-wrap; font-size: 0.95rem; }
details { margin-top: 8px; } summary { cursor: pointer; font-size: 0.85rem; opacity: 0.8; }
.none { opacity: 0.6; }
code, .path { font-family: ui-monospace, monospace; font-size: 0.9em; }
`;

const renderPeriod = (digest: SessionDigest): string => {
  const period =
    digest.startedAt !== undefined && digest.endedAt !== undefined
      ? `${escapeHtml(digest.startedAt)} 〜 ${escapeHtml(digest.endedAt)}`
      : "不明";
  return `<p class="period"><strong>期間:</strong> ${period}</p>`;
};

// 統計は脇役としてページ最下部に置く(#38のフィードバック)。
// 各項目に「何の数字か」の説明を付ける(初見で意味が分かるように)。ファイル全量は折りたたみ
const renderDetails = (digest: SessionDigest): string => {
  const files =
    digest.files.length > 0
      ? `<details><summary>触れられたファイル(${digest.files.length}件)</summary><ul>${digest.files
          .map(
            (file) =>
              `<li><span class="path">${escapeHtml(file.path)}</span>(${file.edits}回)</li>`,
          )
          .join("")}</ul></details>`
      : '<p class="none">(なし)</p>';
  const tools =
    digest.tools.length > 0
      ? digest.tools.map((tool) => `${escapeHtml(tool.name)}: ${tool.count}回`).join("、")
      : '<span class="none">(なし)</span>';
  const cacheNote =
    digest.cacheReadTokens + digest.cacheCreationTokens > 0
      ? `(うちキャッシュ読み込み ${formatCount(digest.cacheReadTokens)} / 作成 ${formatCount(digest.cacheCreationTokens)})`
      : "";
  const errors =
    digest.errorCount > 0
      ? `${digest.errorCount}件発生、うち${digest.resolvedCount}件はその後の操作の成功が記録`
      : "記録なし";
  return `<h3>触れられたファイル</h3>
<p class="desc">このセッションで編集・作成が記録されたファイルと、その回数です。</p>
${files}
<h3>使用されたツール</h3>
<p class="desc">AIが作業に使った道具(ファイル編集・コマンド実行・検索など)の内訳です。</p>
<p>${tools}</p>
<h3>エラー</h3>
<p class="desc">ツールの実行が失敗した回数です。「その後の操作の成功」は同じツールが後で成功した記録を指します。</p>
<p>${errors}</p>
<h3>トークン量</h3>
<p class="desc">AIとのやり取りで処理されたテキスト量です。入力は毎ターン会話履歴を再送する仕組みのため<strong>延べ量(重複を含む)</strong>で、会話の中身の量ではありません。</p>
<p>入力 ${formatCount(digest.inputTokens)}${cacheNote} / 出力 ${formatCount(digest.outputTokens)}</p>`;
};

const renderTurn = (turn: ConversationTurn): string => {
  const lines = turn.responses
    .join("\n")
    .split("\n")
    .filter((line) => line.trim() !== "");
  const prompt = `<p class="prompt">${escapeHtml(turn.prompt)}</p>`;
  if (lines.length === 0) {
    return `<li>${prompt}<p class="response none">(応答の記録なし)</p></li>`;
  }
  const excerpt = `<p class="response">${escapeHtml(lines.slice(0, EXCERPT_LINES).join("\n"))}</p>`;
  if (lines.length <= EXCERPT_LINES) {
    return `<li>${prompt}${excerpt}</li>`;
  }
  const full = `<details><summary>応答の全文(${lines.length}行)</summary><p class="response">${escapeHtml(lines.join("\n"))}</p></details>`;
  return `<li>${prompt}${excerpt}${full}</li>`;
};

export function renderSummaryHtml(
  digest: SessionDigest,
  turns: readonly ConversationTurn[],
): string {
  const turnItems =
    turns.length > 0
      ? `<ol class="turns">${turns.map((turn) => renderTurn(turn)).join("\n")}</ol>`
      : '<p class="none">(なし)</p>';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>セッションサマリ: ${escapeHtml(digest.sessionId)}</title>
<style>${STYLE}</style>
</head>
<body>
<h1>セッションサマリ: ${escapeHtml(digest.sessionId)}</h1>
<p class="notice">このサマリはセッションログの機械的な集計です。記録された操作の主体(あなた/AI)を断定しません。</p>
${renderPeriod(digest)}
<h2>あなたの指示とAIの応答</h2>
${turnItems}
<h2>詳細</h2>
${renderDetails(digest)}
</body>
</html>
`;
}
