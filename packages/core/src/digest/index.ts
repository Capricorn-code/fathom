// 層3: SessionDigest生成。LLMに送信してよい唯一の型(ADR-003)。
// コード本体・diff・tool_resultの生データを保持するフィールドは定義しない。
// 追加する場合はADR-003/005(docs/spec/data-model.md)との整合を必ず確認すること。

import type { NormalizedEvent } from "../normalize/index.js";

export interface SessionDigest {
  readonly sessionId: string;
  readonly startedAt?: string;
  readonly endedAt?: string;
  readonly prompts: readonly string[];
  readonly files: readonly { readonly path: string; readonly edits: number }[];
  readonly tools: readonly { readonly name: string; readonly count: number }[];
  readonly errorCount: number;
  readonly resolvedCount: number;
  readonly syntheticCount: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface SessionMeta {
  readonly sessionId: string;
}

const countMapToSorted = (
  counts: ReadonlyMap<string, number>,
): readonly { name: string; count: number }[] =>
  [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name));

export function buildSessionDigest(
  events: readonly NormalizedEvent[],
  meta: SessionMeta,
): SessionDigest {
  // ローカルに閉じた蓄積用の可変Map/配列(CLAUDE.md TS実装ルールの許容例外)
  const prompts: string[] = [];
  const fileEdits = new Map<string, number>();
  const toolCounts = new Map<string, number>();
  const timestamps: string[] = [];
  // エラー解決の判定: tool_resultは直前のtool_callのツール名に紐付け、
  // エラーになったツールがその後一度でも成功していれば「解決」と数える(線形読みの妥協)
  const erroredTools: string[] = [];
  const succeededAfterError = new Set<string>();
  let currentTool: string | undefined;
  let syntheticCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (const event of events) {
    if (event.timestamp !== undefined) {
      timestamps.push(event.timestamp);
    }
    switch (event.kind) {
      case "user_prompt":
        prompts.push(event.text);
        break;
      case "tool_call":
        currentTool = event.toolName;
        toolCounts.set(event.toolName, (toolCounts.get(event.toolName) ?? 0) + 1);
        if (event.filePath !== undefined) {
          fileEdits.set(event.filePath, (fileEdits.get(event.filePath) ?? 0) + 1);
        }
        break;
      case "tool_result":
        if (event.isError) {
          if (currentTool !== undefined) {
            erroredTools.push(currentTool);
          }
        } else if (currentTool !== undefined && erroredTools.includes(currentTool)) {
          succeededAfterError.add(currentTool);
        }
        break;
      case "turn_meta":
        if (event.synthetic) {
          syntheticCount += 1;
        } else {
          inputTokens += event.inputTokens;
          outputTokens += event.outputTokens;
        }
        break;
      default:
        break;
    }
  }

  const sortedTimestamps = timestamps.toSorted();
  const errorCount = erroredTools.length;
  const resolvedCount = erroredTools.filter((tool) => succeededAfterError.has(tool)).length;

  return {
    sessionId: meta.sessionId,
    startedAt: sortedTimestamps[0],
    endedAt: sortedTimestamps[sortedTimestamps.length - 1],
    prompts,
    files: [...fileEdits.entries()]
      .map(([path, edits]) => ({ path, edits }))
      .toSorted((a, b) => b.edits - a.edits || a.path.localeCompare(b.path)),
    tools: countMapToSorted(toolCounts),
    errorCount,
    resolvedCount,
    syntheticCount,
    inputTokens,
    outputTokens,
  };
}
