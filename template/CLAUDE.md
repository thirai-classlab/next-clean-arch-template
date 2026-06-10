# CLAUDE.md — Claude Code 利用時の規範

このファイルは **Claude Code** (claude.com/code) で本テンプレート生成 project を触る際の規範書です。

> 本書の **規範本体は [AGENTS.md](./AGENTS.md) に集約**しています (Cursor / Aider / Codex / Copilot 等の AI エージェント全般向け)。本ファイルは Claude Code 固有の補足のみを記載します。**先に AGENTS.md を読んでください**。

---

## Claude Code 固有の追補

### A. Skill 活用 (frontend 作業時)

Claude Code には skill 機構があり、本テンプレートが採用する **Chakra UI v3** での開発を加速する skill が公開されています。フロントエンド作業時は以下を **優先利用**してください (`general-purpose` subagent + 手動 context7 lookup で代替しない、research-reuse 原則):

| skill | 用途 |
|---|---|
| `chakra-ui-builder` | 新規 component / layout / form / dashboard / theme 構築、Chakra UI セットアップ、charts (`@chakra-ui/charts`) |
| `chakra-ui-migrate` | Chakra v2→v3 移行、既存 component の Chakra 化、breaking change 対応 (codemod / provider / color mode / prop rename / styleConfig→recipe 変換) |
| `chakra-ui-refactor` | 既存 Chakra コードのリファクタリング (token 化 / recipe 抽出 / compound component 整理) |

**起動方法**: メインから `Skill` tool で起動、または subagent prompt に「`chakra-ui-builder` skill を使え」と明示。

### B. Subagent 委譲時の注意

subagent 経由で本 project を触る場合:
- **AGENTS.md と本 CLAUDE.md を最初に Read** させる prompt にする (規範前提を共有)
- `src/lib/domain/` を触る subagent には「Domain 層のコメントは why を必ず記述 (AGENTS.md §3.6 参照)」と明示
- Chakra 関係の subagent には上記 skill 利用を明示
- **`MOCK_MODE=true`** 前提で動作確認させる (credential なしでも全機能動く設計)

### C. Slash command (optional、ECC / hirai-method harness 利用時のみ)

利用者が ECC (Everything Claude Code) または hirai-method harness を install している場合、以下の slash command が役立ちます。**harness を使っていない場合は無視**してください (本テンプレートは harness 非依存)。

| command | 用途 |
|---|---|
| `/verify` | 変更を実 dev server + agent-browser で起動して動作確認 |
| `/code-review` | 現 diff を review (correctness / reuse / simplification) |
| `/security-review` | security 観点で diff を review |
| `/run` | project の dev server / build / test を起動 |

これらは Claude Code 公式 skill であり、harness 入れなくても利用可能 (ただし本テンプレートはこれらに依存していない)。

### D. context7 MCP 活用

Chakra UI / Next.js / Supabase / zod 等の **library 仕様確認は context7 MCP を default 利用**してください (training data outdated 回避、推測実装禁止)。

```
context7 → library 仕様確認
WebFetch → 公式 doc fallback
```

### E. Plan Mode 活用

破壊的変更 (Domain 層の Entity 構造変更 / DI container 配線変更 / migration 追加など) を加える前は **Plan Mode** に入り、影響範囲を提示してから実装してください。

---

## まとめ

- **規範本体**: [AGENTS.md](./AGENTS.md) を読む
- **Claude Code 固有**: 本書 (skill 利用 / subagent prompt / context7)
- **harness 利用者**: 自身の harness 規範 (`.claude/rules/` 等) を本書より優先 (project 個別の選択)

質問があれば AGENTS.md の §「How to ask」section を参照してください。
