# リリース手順

`@haruto-y/fathom` を公開するときの手順。トークンによる自動公開はしない(手動+2FA。#43の方針)。

## 事前条件

- mainが最新で、CIがグリーン
- `npm whoami` が `haruto-y` を返す(未ログインなら `npm login`)
- `apps/cli/CHANGELOG.md` に今回のバージョンの項があり、日付が入っている
- `apps/cli/package.json` の `version` がCHANGELOGと一致している

## 手順

```sh
cd apps/cli
npm publish        # prepublishOnlyが自動でbuild+testを実行する。2FA(Touch ID)で承認
```

公開後の確認と記録:

```sh
npm view @haruto-y/fathom version        # レジストリに反映されたか
npm install -g @haruto-y/fathom && fathom --help   # 実インストール確認

git tag v<バージョン> && git push origin v<バージョン>
```

GitHubのReleasesページでタグからリリースを作成し、CHANGELOGの該当項を本文に転記する。

## 注意

- 一度公開したバージョンは変更不可。間違えたら修正版をパッチとして公開する(72時間以内ならunpublish可能だが原則使わない)
- バージョンの上げ方: バグ修正=パッチ / 機能追加=マイナー。0.x系の間は破壊的変更もマイナーで可
- 1.0.0を出す直前にはRC(`1.0.0-rc.1` + dist-tag `next`)の導入を検討する
