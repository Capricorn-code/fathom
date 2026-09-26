// 会話の流れ(指示→AI応答の対)の構築。表示専用の純関数。
// SessionDigest(LLM送信可能型)には載せず、レンダラーに直接渡す(ADR-003維持、Issue #33)。

import type { NormalizedEvent } from "@fathom/core";

export interface ConversationTurn {
  readonly prompt: string;
  readonly responses: readonly string[];
}

export const buildConversationTurns = (
  events: readonly NormalizedEvent[],
): readonly ConversationTurn[] => {
  // ローカルに閉じた蓄積用配列(CLAUDE.md TS実装ルールの許容例外)
  const turns: { prompt: string; responses: string[] }[] = [];
  for (const event of events) {
    if (event.kind === "user_prompt") {
      turns.push({ prompt: event.text, responses: [] });
    } else if (event.kind === "assistant_text") {
      // 最初の指示より前の応答は対にできないため無視する
      turns[turns.length - 1]?.responses.push(event.text);
    }
  }
  return turns;
};
