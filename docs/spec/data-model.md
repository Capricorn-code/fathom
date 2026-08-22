# データモデル(3層)

パーサーは3層構造。層のディレクトリ対応(`packages/core/src/raw|normalize|digest`)は「層3だけがLLM送信可能」という制約を構造で見せるためのもの。

## 層1: RawRecord

スキーマ寛容な生レコード。JSONLの1行に対応する。

- zodの `.passthrough()` で未知キーを許容する(スキーマはCLIバージョンで揺れるため)
- 欠損キーも許容する
- `JSON.parse` に失敗した行はスキップし、件数を記録する

## 層2: NormalizedEvent

生レコードを正規化したイベント。種別:

- `user_prompt` — 人が打った発話(`type=="user" && promptSource=="typed" && !isMeta`)
- `assistant_text` — アシスタントのテキスト応答
- `tool_call` — ツール呼び出し(ツール名・ファイルパス等)
- `tool_result` — ツール実行結果(is_errorフラグ。**生データは層3に渡さない**)
- `turn_meta` — トークン使用量などのメタ情報

sidechain(`isSidechain: true`、サブエージェントのログ)はこの層で隔離し、メイン会話と混ぜない。

## 層3: SessionDigest

**LLMに送信してよい唯一の型**([ADR-003](../adr/003-local-analysis-first.md))。

含めるもの:

- sessionId / project / branch / 期間
- typedプロンプト一覧
- 触ったファイルと編集回数
- コマンド分類と回数
- エラー数と解決数
- トークン量

**型に含めないもの(構造的に送信不可能にする):**

- コード本体
- diff
- tool_resultの生データ

入力データの実仕様は [input-format.md](./input-format.md) を参照。
