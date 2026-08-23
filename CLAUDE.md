# CLAUDE.md — fathom 開発ルール

プロダクト定義・設計判断・仕様は **`docs/` 配下が唯一の正**([docs/README.md](./docs/README.md) が目次)。`HANDOFF.md` は2026-08-22時点の引き継ぎ用スナップショット(凍結済み・歴史的資料)であり、正ではない。ここには開発の進め方(ワークフロー)のルールのみを定義する。

## 開発フロー(Issue駆動)

1. **アイデアはすべて `BACKLOG.md` へ。** 着手直前にのみGitHub Issue化する(BACKLOG冒頭のルール)
2. **作業は必ずIssueから始める。** Issueには目的と、**Given/When/Then形式の完了条件**を書く(下記「BDD+TDD」参照)。Issueのないコード変更はしない
3. **Issueごとにworktree+ブランチを切って作業**し、mainに向けてPRを出す
4. **mainへの直接コミットは禁止。** すべての変更はPR経由でマージする
5. PRマージ後、worktreeとブランチを削除する

## ブランチ・worktree運用

- ブランチ命名: `<type>/<issue番号>-<短いスラッグ>`
  - type: `feat` / `fix` / `docs` / `chore` / `refactor` / `test`
  - 例: `feat/3-parser-raw-layer`
- worktreeはリポジトリの親ディレクトリに作成する:

  ```sh
  git worktree add ../<ブランチのスラッグ部分> -b <ブランチ名> main
  # 例: git worktree add ../3-parser-raw-layer -b feat/3-parser-raw-layer main
  ```

- 各worktreeでは最初に `pnpm install` を実行する(node_modulesはworktree間で共有されない)
- マージ後の掃除: `git worktree remove ../<dir>` → `git branch -d <ブランチ名>`(リモートブランチはリポジトリ設定 `delete_branch_on_merge` により自動削除される)
- 並列作業は「1 worktree = 1 Issue = 1 PR」を守る。worktree間で同じファイルを触るIssueは並列にしない

## BDD + TDD

### BDD: 振る舞いを先に言語化する

- **Issueの完了条件は Given / When / Then 形式で書く。** 例:
  - Given: 許可リストにないプロジェクトのJSONL
  - When: `fathom summary <パス>` を実行
  - Then: 解析を拒否し、許可リストへの追加方法を案内する
- テストはこの受け入れ条件と**1対1で対応**させる。`describe`/`it` は日本語の振る舞い文で書く(例: `it("許可リストにないプロジェクトは解析を拒否する")`)
- ツールは**vitestのみ**。Cucumber等のGherkin専用ツールは導入しない(個人開発ではdescribe/itで十分。ツールを増やさない)

### TDD: Red → Green → Refactor

1. **Red:** 受け入れ条件をvitestテストに写し、**失敗することを確認してから**実装に入る
2. **Green:** テストを通す最小の実装を書く
3. **Refactor:** テストが通る状態を保ったまま整理する

- テストは**公開APIの振る舞い(入力→出力)**に対して書く。内部実装の詳細に結合させない
- パーサー系のテスト入力は `packages/core/test/fixtures/` の**匿名化ログ断片**を使う(実ログをそのままコミットしない)
- 実装だけ・テストだけのPRは出さない(骨組み・docs・設定変更は除く)

## PRルール

- タイトル: `<type>: <変更内容>`(日本語可)
- 本文に必ず `Closes #<issue番号>` を入れ、マージでIssueが自動クローズされるようにする
- 本文に**「受け入れ条件 ⇔ テスト」の対応**を書く(どのGiven/When/Thenがどのテストで担保されるか)
- 完了条件: `pnpm build && pnpm test` が通ること
- マージ方式: **squash merge**(mainの履歴を1 Issue = 1コミットに保つ)

## GitHub側の構成

- マイルストーン: `M1`(サマリMD出力)/ `M2`(機能A公開)/ `M3`(機能B+課金)。IssueにはマイルストーンとHANDOFF.mdのタスク対応を紐付ける
- リポジトリはプライベート。ADR-004/006/007(個人リポジトリのみ・opt-in・個人機材)を常に遵守する

## 環境

- Node.js 22以上(開発機は24系)。`package.json` の `engines` は `">=22"` とする
- pnpm workspace モノレポ。タスクランナー(Turborepo等)は導入しない
