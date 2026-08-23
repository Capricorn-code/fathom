// 層3: SessionDigest生成。LLMに送信してよい唯一の型(ADR-003)。
// コード本体・diff・tool_result生データはこの型に含めない(docs/spec/data-model.md)。
// 実装はタスク③(パーサー第1弾)で行う。

export const DIGEST_LAYER = "digest" as const;
