// 層2: イベント正規化。RawRecordをNormalizedEventに変換し、sidechainを隔離する。
// 種別: user_prompt / assistant_text / tool_call / tool_result / turn_meta
// 実装はタスク③(パーサー第1弾)で行う。

export const NORMALIZE_LAYER = "normalize" as const;
