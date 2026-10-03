import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  // @fathom/* はnpmに公開しない内部パッケージのため、CLIに焼き込む。
  // commander / zod は通常のdependenciesとして利用者側でインストールされる
  noExternal: [/^@fathom\//],
});
