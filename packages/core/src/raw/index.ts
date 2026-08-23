// 層1: JSONL読み込み。スキーマ寛容な生レコード(RawRecord)を返す。
// スキーマはCLIバージョンで揺れるため、未知キー許容・欠損許容(zod .passthrough())で扱う。
// 実装はタスク③(パーサー第1弾)で行う。

export const RAW_LAYER = "raw" as const;
