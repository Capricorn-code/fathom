// 許可リスト読み込み(ADR-006: opt-in方式、デフォルト全拒否)。
// 設定ファイル: ~/.config/fathom/config.json
//
// この設定はユーザーが手で書くものではない。設定なしで実行された場合、
// fathomが ~/.claude/projects/ を列挙して読みやすいプロジェクト名で提示し、
// 対話的に選ばせて自動生成する(docs/spec/feature-a.md の初回対話セットアップ)。
// ユーザーは隠しディレクトリの存在や構造を知らなくてよい。
// opt-in自体は「業務プロジェクトを誤って解析しない」を仕組みで担保するための
// 意図的な摩擦(ADR-004/006)。
// 実装はタスク③(パーサー第1弾)で行う。

export interface FathomConfig {
  /** 解析を許可したプロジェクトディレクトリ名(~/.claude/projects/ 配下の名前) */
  allowedProjects: string[];
}

export const CONFIG_PATH_HINT = "~/.config/fathom/config.json";
