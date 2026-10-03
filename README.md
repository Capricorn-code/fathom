# fathom

**Claude Codeで、あなたは今日何をやった?** — AIとの開発履歴から「何をやったか」を言語化するローカルCLI。

**発見ではなく、区別と確信のために。** AIに書かせてばかりのエンジニアが、「これは人に説明できる/ここは説明できない」を区別する材料を提供します。

## 何ができるか

Claude Codeが `~/.claude/projects/` に自動保存しているセッションログ(JSONL)を読み、**あなたの指示とAIの応答を対にした5分で読めるサマリ**をMarkdown / HTMLで出力します。

```sh
npm install -g @haruto-y/fathom     # Node.js 22+

fathom summary          # セッション一覧から選んでMarkdownを出力
fathom summary --html   # 同じく選んで自己完結HTMLを生成
```

初回実行時は、解析を許可するプロジェクトを選ぶ対話セットアップが起動します(**デフォルト全拒否のopt-in方式**。選んだプロジェクト以外のログは一切読みません)。

詳しい使い方・出力例は [apps/cli/README.md](./apps/cli/README.md)(npmパッケージのREADME)へ。

## 設計思想

1. **完全ローカル。** 解析もサマリ生成もローカルで完結し、ログが外部へ送られることはありません(外部通信するコードが存在しません)
2. **帰属を断定しない。** 「あなたはXを実装した」とは書かず「Xの編集が行われた。あなたの指示n回」と記録そのままに表現します。「AIを使えばスキルが身についている」とは前提しない誠実さが、この製品の軸です
3. **業務コードは対象外。** 個人リポジトリ・OSSでの利用を前提に設計しています

## ロードマップ

- ✅ M1: サマリ出力(3層パーサー+CLI)
- 🔶 M2: 機能A公開(npm)← いまここ
- ⬜ M3: 機能B「それが本当に身についているか」の検証機能

## やらないこと

BtoBの作り込み / 組織ダッシュボード / iOS化 / ゲーミフィケーション

## 開発者向け

- 設計・仕様の正: [docs/](./docs/)(目次は [docs/README.md](./docs/README.md))
- 開発ワークフロー: [CLAUDE.md](./CLAUDE.md)(Issue駆動・BDD+TDD・worktree並列)
- アイデア置き場: [BACKLOG.md](./BACKLOG.md)
- pnpm workspaceモノレポ: `packages/core`(3層パーサー)/ `packages/masking` / `apps/cli`

## ライセンス

[MIT](./LICENSE)
