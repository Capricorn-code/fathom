// 許可リスト読み込み(ADR-006: opt-in方式、デフォルト全拒否)。
// 設定ファイル: ~/.config/fathom/config.json
// 設定が存在しない場合は初回対話セットアップへ誘導する(docs/spec/feature-a.md)。
// 実装はタスク③(パーサー第1弾)で行う。

export interface FathomConfig {
  /** 解析を許可したプロジェクトディレクトリ名(~/.claude/projects/ 配下の名前) */
  allowedProjects: string[];
}

export const CONFIG_PATH_HINT = "~/.config/fathom/config.json";
