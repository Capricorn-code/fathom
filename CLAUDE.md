# CLAUDE.md — fathom 開発ルール

プロダクト定義・設計判断・タスク内容は `HANDOFF.md` が唯一の正。ここには開発の進め方(ワークフロー)のルールのみを定義する。

## 開発フロー(Issue駆動)

1. **アイデアはすべて `BACKLOG.md` へ。** 着手直前にのみGitHub Issue化する(BACKLOG冒頭のルール)
2. **作業は必ずIssueから始める。** Issueには目的・完了条件を書く。Issueのないコード変更はしない
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
- マージ後の掃除: `git worktree remove ../<dir>` → `git branch -d <ブランチ名>`
- 並列作業は「1 worktree = 1 Issue = 1 PR」を守る。worktree間で同じファイルを触るIssueは並列にしない

## PRルール

- タイトル: `<type>: <変更内容>`(日本語可)
- 本文に必ず `Closes #<issue番号>` を入れ、マージでIssueが自動クローズされるようにする
- 完了条件: `pnpm build && pnpm test` が通ること
- マージ方式: **squash merge**(mainの履歴を1 Issue = 1コミットに保つ)

## GitHub側の構成

- マイルストーン: `M1`(サマリMD出力)/ `M2`(機能A公開)/ `M3`(機能B+課金)。IssueにはマイルストーンとHANDOFF.mdのタスク対応を紐付ける
- リポジトリはプライベート。ADR-004/006/007(個人リポジトリのみ・opt-in・個人機材)を常に遵守する

## 環境

- Node.js 22以上(開発機は24系)。`package.json` の `engines` は `">=22"` とする
- pnpm workspace モノレポ。タスクランナー(Turborepo等)は導入しない
