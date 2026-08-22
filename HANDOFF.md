# HANDOFF.md — fathom プロジェクト引き継ぎ資料

> **⚠️ 凍結済み(2026-08-23):** 本資料は2026-08-22時点の引き継ぎ用スナップショットであり、以後更新しない。
> 設計・仕様の最新の正は [docs/](./docs/) 配下、開発ワークフローは [CLAUDE.md](./CLAUDE.md) を参照すること。
> 本文中の「この資料が唯一の正」という記述は docs/ 整備(Issue #3)をもって失効している。

## あなた(Claude Code)への依頼

この資料に基づき、タスク②(リポジトリ初期構築)、続けてタスク③(パーサー第1弾)を実行してください。設計判断は完了済みで、この資料が唯一の正です。資料にない判断が必要になったら、勝手に進めず人間に確認すること。

## プロダクト定義

**名前:** fathom(ファゾム。「水深を測る」+「深く理解する」の両義を持つ英単語)

**コンセプト:** AIとの開発履歴から「何をやったか」を言語化し(機能A)、「それが本当に身についているか」を検証する(機能B)。**発見ではなく、区別と確信のためのツール。**

**解決する課題:** AI時代にエンジニアが (1) 自分のスキルの成長を言語化できない (2) AIに書かせた成果を本当に理解しているか確信が持てない。

**重要な設計思想:** 「AIを使えばスキルが身についている」とは前提しない。サマリの文言は帰属を断定しない(「あなたはXを実装した」ではなく「Xの実装が行われた。あなたの指示n回」)。検証(B)を通った実績だけが確信になる、という誠実さがこの製品の差別化。

**ビジネスモデル:** 機能A=無料(集客装置)、機能B=有料(月500〜1,000円想定、Stripe)。ターゲットは日本のClaude Codeユーザー(X/Zenn/Qiita圏)。

**クリティカルCUJ(1本のみ):**
AIに書かせてばかりで実力に不安を持つ開発者が、インストール→実行→**5分以内に出力を読み、「これは人に説明できる/ここは説明できない」と区別できる感覚を得る**まで。最重要は出力の質。摩擦削減のため初回実行時の対話的セットアップを含める(後述)。

**マイルストーン:**

- M1: 開発者自身のログでサマリMDが出る ← 今回のゴール
- M2: 機能A公開(npm)+ Zenn記事
- M3: 機能B + 課金

## 確定済み設計判断

docs/adr/ に以下8本を文書化すること。形式: 状況/決定/却下した代替案、各10〜15行。

- **ADR-001:** 2サービスではなく1サービス。ログ解析基盤を共有し、機能A/Bを2つの入口として載せる
- **ADR-002:** 機能A(無料・集客)→機能B(有料・収益)の直列開発。並行しない
- **ADR-003:** ローカル解析を最大化。LLMに送るのは正規化済みSessionDigestのみ。送信前にマスキング済み内容をプレビューさせ編集可能に(※M1ではLLM連携自体を実装しない)
- **ADR-004:** 検証・ドッグフーディング対象は個人リポジトリ/OSSのみ。業務コードは扱わない
- **ADR-005:** マスキング3段階。(1)構造的に送らない: tool_result生データ/コード本体/diff/attachment (2)変換して送る: パス一般化/エラーテンプレ化 (3)プレビュー後送る: typedプロンプト/プロジェクト名
- **ADR-006:** 解析対象はopt-in許可リスト方式。設定で明示されたプロジェクト以外パーサーは読めない。デフォルト全拒否
- **ADR-007:** 開発・検証・ログ蓄積はすべて個人機材・個人アカウント。会社資産に触れない
- **ADR-008:** パーサーのGo移植は機能Bリリース後に検討(予約のみ。着手しない)

## 技術スタック(確定)

- TypeScript / Node.js 22 / pnpm workspace モノレポ(Turborepo等のタスクランナーは導入しない)
- zod(`.passthrough()`で未知キー許容)/ commander / tsup / vitest
- M1ではLLM連携なし・DBなし・Webなし。出力はローカルMDのみ

## リポジトリ構成

```
fathom/
├── package.json / pnpm-workspace.yaml / tsconfig.base.json
├── HANDOFF.md / README.md / BACKLOG.md
├── docs/adr/            # ADR-001〜008
├── packages/
│   ├── core/src/
│   │   ├── raw/         # 層1: JSONL読み込み
│   │   ├── normalize/   # 層2: イベント正規化
│   │   ├── digest/      # 層3: SessionDigest生成
│   │   └── index.ts
│   ├── core/test/fixtures/   # 匿名化ログ断片
│   └── masking/src/     # 純関数。coreに依存しない(M1では骨組みのみ)
└── apps/cli/src/
    ├── commands/        # summary.ts
    └── config.ts        # 許可リスト読み込み
```

意図: coreとcliの分離は将来のWeb版でcoreを再利用するため。maskingの独立は「プレビューと実送信で同一関数を共有」(ADR-005)のため。層1/2/3のディレクトリ対応は「層3だけがLLM送信可能」を構造で見せるため。

## 入力データ仕様(実地調査済み)

`~/.claude/projects/<cwdスラッシュ→ハイフン化>/<sessionId>.jsonl`、1行1JSON。

**type種別:** attachment(過半のノイズ)/ assistant / user / last-prompt / permission-mode / mode / ai-title / system / file-history-snapshot / queue-operation

**実装上の要点:**

- 会話は線形でなく `uuid ← parentUuid` の木。`last-prompt.leafUuid` が現在の末端
- 人の発話抽出は `type=="user" && promptSource=="typed" && !isMeta`。これを怠るとhookノイズが大半になる
- `isSidechain: true` はサブエージェントのログ。メイン会話と混ぜない
- assistant の `message.usage` にトークン数。`message.model` が `<synthetic>` はエラー合成応答
- tool_use は `message.content[0] = {type:"tool_use", id, name, input}`。tool_result は userレコード側、生データは `toolUseResult`
- スキーマはCLIバージョンで揺れる。未知キー無視・欠損許容で
- 最大77MB級があるためストリーム処理必須(readline + createReadStream)。JSON.parse失敗行はスキップして件数記録

## データモデル(3層)

- **層1 RawRecord:** スキーマ寛容な生レコード
- **層2 NormalizedEvent:** user_prompt / assistant_text / tool_call / tool_result / turn_meta。sidechain隔離
- **層3 SessionDigest:** LLM送信可能な唯一の型。sessionId / project / branch / 期間 / typedプロンプト一覧 / 触ったファイルと編集回数 / コマンド分類と回数 / エラー数と解決数 / トークン量。**コード本体・diff・tool_result生データは型に含めない**

## タスク②: リポジトリ初期構築

上記構成の骨組み。空実装で `pnpm install && pnpm build && pnpm test` が通ること。ADR 8本、README(プロダクト定義の要約+「やらないこと: BtoB作り込み/組織ダッシュボード/iOS化/ゲーミフィケーション」)、BACKLOG.md(冒頭に「アイデアは全部ここ。着手直前にのみIssue化」)。

## タスク③: パーサー第1弾

**ゴール:** JSONL 1ファイル → セッションサマリMD出力。

**やる:**

- ストリーム読込 → typedプロンプト抽出 / tool_useのツール名・ファイルパス / tool_resultのis_error / usage集計
- MD出力: 期間 / 指示一覧 / 触ったファイルと回数 / エラー数と解決数 / トークン量。文言は帰属断定を避ける(設計思想参照)
- CLI: `fathom summary <jsonlパス>`。ADR-006準拠で許可リスト外は拒否
- **初回対話セットアップ:** 設定なしで実行時、`~/.claude/projects/` 一覧を表示し「解析対象を選択(業務プロジェクトは選ばないでください)」と促して許可リスト(`~/.config/fathom/config.json`)を生成

**やらない(広げるな):** 会話木の厳密復元(線形読みで妥協)/ sidechain除外の厳密化 / マスキング実装 / LLM連携 / 複数ファイル・週次集計

**完了条件:** 開発者がこのfathomリポジトリ自身の開発ログを食わせ、読めるMDが出ること(ドッグフーディング)。

## 人間側の状況

- 個人Mac: Git / Node 22 / Claude Code 導入済み。個人アカウント認証
- devcontainer不使用のホスト直運用。ログは `~/.claude/projects/` に自然に永続化される
- 名前 fathom は決定済み。npm上の正式パッケージ名(素の `fathom` が取られている場合のスコープ付き等)はM2公開直前に判断する。M1では影響なし
