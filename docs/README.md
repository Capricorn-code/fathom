# docs

fathomの設計・仕様の**唯一の正**。ここと実装が食い違ったら、どちらかを直すIssueを立てる。

| ドキュメント | 内容 |
|---|---|
| [product.md](./product.md) | プロダクト定義・設計思想・ビジネスモデル・やらないこと |
| [cuj.md](./cuj.md) | クリティカルCUJ(1本のみ) |
| [roadmap.md](./roadmap.md) | マイルストーン M1/M2/M3 |
| [spec/feature-a.md](./spec/feature-a.md) | 機能A(サマリ)の機能設計書 |
| [spec/data-model.md](./spec/data-model.md) | 3層データモデル |
| [spec/input-format.md](./spec/input-format.md) | セッションログJSONLの入力仕様 |
| [adr/](./adr/) | 設計判断の記録(ADR-001〜009) |
| [adr/009](./adr/009-architecture-pipeline.md) | アーキテクチャ方針(依存方向ルール・DDDは本質のみ・インフラ層はWeb版で再評価) |

- 機能B設計書(`spec/feature-b.md`)はM3着手前に作成する
- ルートの `HANDOFF.md` は2026-08-22時点の引き継ぎ用スナップショット(凍結済み)であり、正ではない
