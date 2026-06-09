---
"@takuma-hirai/create-app": patch
---

chore: bump to 0.1.1 (template fetch path → monorepo `template/`)

Template repo (`thirai-classlab/next-clean-arch-template`) を CLI + template の monorepo 構造に再編したため、giget が参照する template path を `<repo>` → `<repo>/template` に切替える。

- `TEMPLATE_SOURCE` を `github:thirai-classlab/next-clean-arch-template/template` に変更 (giget の subdir 指定構文)。
- git clone fallback は subdir 指定不可のため、tmp dir に full clone → `template/` の中身を target dir に移動する 2 段構成に変更。
- 公開 API (`cloneTemplate(targetDir, deps)`) と CLI 表面 (`npx @takuma-hirai/create-app <project>`) は変化なし (= behavior-preserving)。
