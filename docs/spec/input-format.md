# 入力データ仕様(Claude Codeセッションログ)

2026-08時点の実地調査に基づく。スキーマはClaude CodeのCLIバージョンで揺れるため、**未知キー無視・欠損許容**を原則とする。

## 場所と形式

```
~/.claude/projects/<cwdのスラッシュをハイフン化したディレクトリ名>/<sessionId>.jsonl
```

1行1JSON。最大77MB級のファイルが存在するため**ストリーム処理必須**(`readline` + `createReadStream`)。`JSON.parse` 失敗行はスキップして件数を記録する。

## type種別

`attachment`(過半のノイズ)/ `assistant` / `user` / `last-prompt` / `permission-mode` / `mode` / `ai-title` / `system` / `file-history-snapshot` / `queue-operation`

## 実装上の要点

- **会話は線形ではなく木構造。** `uuid ← parentUuid` で親子をたどる。`last-prompt.leafUuid` が現在の末端(M1では線形読みで妥協: [roadmap.md](../roadmap.md))
- **人の発話抽出:** `type=="user" && promptSource=="typed" && !isMeta`。この条件を怠るとhookノイズが大半になる
- **sidechain:** `isSidechain: true` はサブエージェントのログ。メイン会話と混ぜない
- **トークン数:** assistantの `message.usage`。`message.model` が `<synthetic>` はエラー合成応答なので通常応答と区別する
- **tool_use:** `message.content[0] = {type:"tool_use", id, name, input}`
- **tool_result:** userレコード側に載る。生データは `toolUseResult` フィールド(**層3に渡さない**: [data-model.md](./data-model.md))

## usageの実仕様(2026-09、#31での実地確認)

assistantレコードの `message.usage` は以下を持つ。入力の大半はプロンプトキャッシュ側に記録されるため、**トークン集計は3者の合計を入力として扱う**こと:

- `input_tokens` — キャッシュ外の入力
- `cache_read_input_tokens` — キャッシュ読み込み(入力の大半を占める)
- `cache_creation_input_tokens` — キャッシュ作成
- `output_tokens` — 出力

いずれも欠損しうる(古い形式)。欠損時は0として扱う。
