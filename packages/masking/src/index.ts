// マスキング(ADR-005: 3段階マスキングの段階2〜3)。
// 純関数のみで構成し、@fathom/core に依存しない。
// プレビュー表示と実送信で同一関数を共有するための独立パッケージ。
// M1では骨組みのみ。実装はM2(LLM連携の前)で行う。

export const MASKING_LAYER = "masking" as const;
