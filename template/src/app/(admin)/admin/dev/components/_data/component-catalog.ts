// apps/web/src/app/(admin)/admin/dev/components/_data/component-catalog.ts
//
// SSoT for the component visual gallery on /admin/dev/components.
//
// Each entry describes how the gallery renders a single component:
//   - `id`         stable kebab-case key for tests + URL anchors
//   - `name`       display name (PascalCase as rendered in import statements)
//   - `category`   one of the 7 layer groupings (used for section headings)
//   - `status`     "implemented" → renders the visual preview
//                  "placeholder" → renders a 🚧 card (future task)
//                  "official-only" → Chakra v3 official component not yet wrapped; links to docs
//   - `phase`      origin phase tag — "A" (typography + primitive) / "B" (composite) /
//                  "C" (feedback + layout + domain) / "future" (nav + shell, task-5+) /
//                  "chakra-v3" (official-only entries from Chakra UI v3 snippet catalog)
//   - `snippet`    copy/pasteable TSX example shown under each preview
//   - `description` 1-2 line summary for the card header
//
// Categories total 56 implemented/placeholder + 43 official-only = 99 entries.
//
// The 41 "implemented" entries (Phase A/B/C) compose from real component imports
// in the GalleryClient — including the 5 task-5 Admin Panel client islands
// (UsersTable / UserRoleControl / AllowListManager / AuditLogTable /
// PendingApprovalsTable) and the 3 task-32 shell components (Sidebar / Topbar /
// AppShell). The 15 "placeholder" entries (Nav/Shell) are reserved for future
// expansion / Template work. The 43 "official-only" entries cover the remaining
// Chakra UI v3 snippet catalog components not yet wrapped in this project.

export type ComponentCategory =
  | 'typography'
  | 'primitive'
  | 'composite'
  | 'feedback'
  | 'layout'
  | 'domain'
  | 'nav-shell'

export type ComponentStatus = 'implemented' | 'placeholder' | 'official-only'

export type ComponentPhase = 'A' | 'B' | 'C' | 'future' | 'chakra-v3'

/**
 * Indicates the underlying UI library for this component.
 *
 * - `'chakra'`  — wraps or composes Chakra UI v3 (`@chakra-ui/react`) primitives.
 * - `'custom'`  — implemented without Chakra; uses Linear design-token CSS variables,
 *                 Radix UI primitives, or plain React.
 * - `'chakra-partial'` — the component system (Form) uses Chakra for inner
 *                        sub-components (Field in FormField) but the outer
 *                        wrapper itself does not import `@chakra-ui/react` directly.
 */
export type ComponentProvider = 'chakra' | 'custom' | 'chakra-partial'

export interface ComponentCatalogEntry {
  readonly id: string
  readonly name: string
  readonly category: ComponentCategory
  readonly status: ComponentStatus
  readonly phase: ComponentPhase
  readonly snippet: string
  readonly description: string
  /**
   * The underlying UI library.
   * Set to `'chakra'` when the component imports `@chakra-ui/react`.
   * Set to `'custom'` when implemented with plain CSS / Radix / Linear tokens only.
   * Set to `'chakra-partial'` when Chakra is used only in sub-components.
   */
  readonly provider: ComponentProvider
  /**
   * URL to the official Chakra UI v3 documentation for this component.
   * Defined only when `provider` is `'chakra'` or `'chakra-partial'`.
   * Also defined for `'official-only'` entries pointing directly to Chakra docs.
   */
  readonly referenceUrl?: string
  /**
   * Relative path (from the `_previews/` directory root) to the preview component
   * file for this entry. Defined only for `'official-only'` entries.
   *
   * Example: `'_previews/typography/blockquote'`
   *
   * Stage 2 batch subagents will replace each placeholder file at this path with
   * the real Chakra v3 component preview. Stage 1 installs placeholder files only.
   */
  readonly officialPreviewPath?: string
}

/** Short display title for each category (used in section headings and nav tabs). */
export const CATEGORY_LABELS: Record<ComponentCategory, string> = Object.freeze({
  typography: 'タイポグラフィ',
  primitive: 'プリミティブ',
  composite: 'コンポジット',
  feedback: 'フィードバック',
  layout: 'レイアウト',
  domain: 'ドメイン',
  'nav-shell': 'ナビゲーション / シェル',
})

/**
 * One-sentence "when to use" description shown beneath each category section
 * heading and in the sticky nav tooltip.
 */
export const CATEGORY_DESCRIPTIONS: Record<ComponentCategory, string> = Object.freeze({
  typography:
    'Heading / Text / Code / Link — 全 surface で階層とトーンを確立するタイポグラフィプリミティブ。',
  primitive:
    '原子的インタラクションコントロール (Button / Input / Select / Switch / Checkbox / RadioGroup / Textarea / IconButton) — 上位パターンを組み立てる基盤。',
  composite:
    '複合 component (Table / Form / Modal / Drawer / Tabs / Tooltip / Popover) — プリミティブを組み合わせた一般的 UX パターン、フルキーボード + ARIA 対応。',
  feedback:
    'ステータス通知 surface (Toast / Alert / Spinner / Skeleton / EmptyState / ErrorBoundary) — 非同期処理とエラー状態でユーザーを案内。',
  layout:
    'スペーシング・配置プリミティブ (Stack / Inline / Grid / Container / Spacer) — 視覚的 chrome を追加せずリズムとフローを制御。',
  domain:
    'Recall.ai 固有の component (BotStatusBadge / TranscriptBubble / RecallEventCard) — ビジネスドメインのセマンティクスをデザインシステムに直接実装。',
  'nav-shell':
    'ナビゲーション・シェル component — Sidebar / Topbar / AppShell は task-32 で実装済み、残り 15 個は placeholder (将来拡張 / Template 用に予約済み)。',
})

export const CATEGORY_ORDER: ReadonlyArray<ComponentCategory> = Object.freeze([
  'typography',
  'primitive',
  'composite',
  'feedback',
  'layout',
  'domain',
  'nav-shell',
])

/** Base URL for Chakra UI v3 component documentation. */
const CHAKRA_DOCS = 'https://chakra-ui.com/docs/components'

export const COMPONENT_CATALOG: ReadonlyArray<ComponentCatalogEntry> = Object.freeze([
  // ─── Typography (Phase A) ────────────────────────────────────────────────
  {
    id: 'heading',
    name: 'Heading',
    category: 'typography',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/heading`,
    snippet: '<Heading level={1}>Page Title</Heading>',
    description: 'h1-h6 セマンティック見出し、視覚サイズ上書きとアクセントカラートークン対応。',
  },
  {
    id: 'text',
    name: 'Text',
    category: 'typography',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/text`,
    snippet: '<Text size="md" weight="regular" color="default">Body copy.</Text>',
    description: '4 サイズ / 4 ウェイト / 5 カラー、デザイントークン経由、polymorphic root 対応。',
  },
  {
    id: 'code',
    name: 'Code',
    category: 'typography',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/code`,
    snippet: '<Code language="ts" copyable>const x = 1</Code>',
    description: 'インライン or ブロックコード、クリップボードコピー対応。',
  },
  {
    id: 'link',
    name: 'Link',
    category: 'typography',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/link`,
    snippet: '<Link href="/dashboard">Open dashboard</Link>',
    description: '外部 URL 自動判定 (target=_blank + アイコン)、Next.js ルートとの自動分岐。',
  },

  // ─── Primitive (Phase A) ─────────────────────────────────────────────────
  {
    id: 'button',
    name: 'Button',
    category: 'primitive',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/button`,
    snippet: '<Button variant="solid">Save</Button>',
    description: '4 バリアント (solid / outline / ghost / link) + 3 サイズ + ローディング状態。',
  },
  {
    id: 'icon-button',
    name: 'IconButton',
    category: 'primitive',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/icon-button`,
    snippet: '<IconButton icon={Search} aria-label="Search" />',
    description: 'アイコンのみのボタン — aria-label 必須、Button バリアントと同仕様。',
  },
  {
    id: 'input',
    name: 'Input',
    category: 'primitive',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/input`,
    snippet: '<Input label="Email" hint="we never share it" />',
    description: 'テキスト入力、label / hint / error / prefix / suffix スロット付き。',
  },
  {
    id: 'textarea',
    name: 'Textarea',
    category: 'primitive',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/textarea`,
    snippet: '<Textarea label="Notes" autoResize />',
    description: '複数行テキスト入力、コンテンツに合わせた自動リサイズ対応。',
  },
  {
    id: 'select',
    name: 'Select',
    category: 'primitive',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/native-select`,
    snippet: '<Select options={opts} placeholder="Choose" />',
    description: 'Radix Select をデザイントークンでラップ — キーボードアクセシブルなリストボックス。',
  },
  {
    id: 'switch',
    name: 'Switch',
    category: 'primitive',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/switch`,
    snippet: '<Switch label="Enable notifications" />',
    description: 'ON/OFF トグル、label 付き、2 サイズ、制御・非制御両対応。',
  },
  {
    id: 'radio',
    name: 'RadioGroup',
    category: 'primitive',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/radio-group`,
    snippet: '<RadioGroup name="plan" items={items} />',
    description: 'Radix RadioGroup ベースの単一選択グループ。',
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    category: 'primitive',
    status: 'implemented',
    phase: 'A',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/checkbox`,
    snippet: '<Checkbox label="I agree" />',
    description: '2 状態チェックボックス、indeterminate (aria-checked="mixed") 対応。',
  },

  // ─── Composite (Phase B) ─────────────────────────────────────────────────
  {
    id: 'table',
    name: 'Table',
    category: 'composite',
    status: 'implemented',
    phase: 'B',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/table`,
    snippet: '<Table columns={cols} data={rows} keyExtractor={r => r.id} />',
    description: 'ソート可能カラム、ページネーション、empty / loading スロット、アクセシブルヘッダー。',
  },
  {
    id: 'form',
    name: 'Form',
    category: 'composite',
    status: 'implemented',
    phase: 'B',
    provider: 'chakra-partial',
    referenceUrl: `${CHAKRA_DOCS}/field`,
    snippet: '<Form schema={schema} onSubmit={fn}><FormField name="x"><Input /></FormField></Form>',
    description: 'React Hook Form + zod resolver、FormField が aria-* を自動接続。',
  },
  {
    id: 'modal',
    name: 'Modal',
    category: 'composite',
    status: 'implemented',
    phase: 'B',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/dialog`,
    snippet: '<Modal open={open} onOpenChange={set} title="Confirm">...</Modal>',
    description: 'Radix dialog ラッパー — フォーカストラップ、Escape で閉じる、サイズバリアント付き。',
  },
  {
    id: 'drawer',
    name: 'Drawer',
    category: 'composite',
    status: 'implemented',
    phase: 'B',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/drawer`,
    snippet: '<Drawer open={open} onOpenChange={set} side="right" title="Filters">...</Drawer>',
    description: 'サイドシート、prefers-reduced-motion 対応、2 方向 × 3 サイズ。',
  },
  {
    id: 'tooltip',
    name: 'Tooltip',
    category: 'composite',
    status: 'implemented',
    phase: 'B',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/tooltip`,
    snippet: '<Tooltip content="Save (⌘S)"><Button>Save</Button></Tooltip>',
    description: 'キーボードフォーカス対応 Tooltip、単一子要素トリガーをラップ。',
  },
  {
    id: 'popover',
    name: 'Popover',
    category: 'composite',
    status: 'implemented',
    phase: 'B',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/popover`,
    snippet: '<Popover trigger={<Button>Menu</Button>} content={<div>...</div>} />',
    description: 'モーダルでないフローティング surface — ESC + 外部クリックで閉じる。',
  },
  {
    id: 'tabs',
    name: 'Tabs',
    category: 'composite',
    status: 'implemented',
    phase: 'B',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/tabs`,
    snippet: '<Tabs items={items} defaultValue="a" variant="underline" />',
    description: 'Underline / pill バリアント — Radix 経由の ARIA APG タブパターン。',
  },

  // ─── Feedback (Phase C — Step 1) ─────────────────────────────────────────
  {
    id: 'toast',
    name: 'Toast (useToast)',
    category: 'feedback',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/toaster`,
    snippet: "const toast = useToast()\ntoast.success('Saved')",
    description: 'Chakra v3 Toaster ラッパー — 4 セマンティックバリアント、グローバル <Toaster /> 1 箇所マウント。',
  },
  {
    id: 'alert',
    name: 'Alert',
    category: 'feedback',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/alert`,
    snippet: '<Alert variant="info" title="Heads up">Body text…</Alert>',
    description: '静的 role="alert" バナー — 4 バリアント + 任意の dismiss。',
  },
  {
    id: 'spinner',
    name: 'Spinner',
    category: 'feedback',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/spinner`,
    snippet: '<Spinner size="md" label="Loading bots…" />',
    description: 'アクセシブルなローディングインジケーター — prop 経由で aria-label 必須。',
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    category: 'feedback',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/skeleton`,
    snippet: '<Skeleton width="100%" height="1rem" />\n<SkeletonText noOfLines={2} />\n<SkeletonCircle size="12" />',
    description: 'パルスアニメーション付きローディングプレースホルダー — 矩形 + SkeletonText + SkeletonCircle。',
  },
  {
    id: 'empty-state',
    name: 'EmptyState',
    category: 'feedback',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/empty-state`,
    snippet: '<EmptyState title="No bots yet" description="Create one to start." />',
    description: '"データなし" 中央表示 surface — アイコン / 説明 / アクション 任意付き。',
  },
  {
    id: 'error-boundary',
    name: 'ErrorBoundary',
    category: 'feedback',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/alert`,
    snippet: '<ErrorBoundary onError={log}>{children}</ErrorBoundary>',
    description: 'React クラス境界 — デフォルト Alert フォールバックまたはカスタム render prop。',
  },

  // ─── Layout (Phase C — Step 2-A) ─────────────────────────────────────────
  {
    id: 'stack',
    name: 'Stack',
    category: 'layout',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/stack`,
    snippet: '<Stack gap={16}><A /><B /></Stack>',
    description: '縦方向 flex レイアウト、トークン整合 gap (4/8/12/16/24/32/48/64)。',
  },
  {
    id: 'inline',
    name: 'Inline',
    category: 'layout',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/stack`,
    snippet: '<Inline gap={8} wrap>{children}</Inline>',
    description: '横方向 flex、デフォルト wrap でモバイルフレンドリーな行レイアウト。',
  },
  {
    id: 'grid',
    name: 'Grid',
    category: 'layout',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/grid`,
    snippet: '<Grid cols={3} gap={16}>{cards}</Grid>',
    description: 'CSS grid プリミティブ、トークン gap と 1/2/3/4/5/6/12 カラム対応。',
  },
  {
    id: 'container',
    name: 'Container',
    category: 'layout',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/container`,
    snippet: '<Container maxWidth="lg" padding="md">{children}</Container>',
    description: '最大幅中央揃えラッパー — 6 幅 × 4 パディングプリセット。',
  },
  {
    id: 'spacer',
    name: 'Spacer',
    category: 'layout',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/spacer`,
    snippet: '<Spacer size={16} axis="y" />',
    description: '親 gap が柔軟でない場合の単一目的装飾スペーサー。',
  },

  // ─── Domain (Phase C — Step 2-B, recall-poc specific) ────────────────────
  {
    id: 'bot-status-badge',
    name: 'BotStatusBadge',
    category: 'domain',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/badge`,
    snippet: '<BotStatusBadge status="in_call_recording" />',
    description: 'Recall.ai bot ライフサイクル 7 状態、トーン / アイコン / パルス マッピング付き。',
  },
  {
    id: 'transcript-bubble',
    name: 'TranscriptBubble',
    category: 'domain',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/box`,
    snippet: '<TranscriptBubble speaker="A" text="hello" timestamp={d} confidence={0.9} />',
    description: '1 トランスクリプトセグメントのチャットバブル surface — 低信頼度警告付き。',
  },
  {
    id: 'recall-event-card',
    name: 'RecallEventCard',
    category: 'domain',
    status: 'implemented',
    phase: 'C',
    provider: 'chakra',
    referenceUrl: `${CHAKRA_DOCS}/card`,
    snippet: '<RecallEventCard event={evt} onAction={handle} />',
    description: 'Recall.ai webhook イベント 1 件のカード — 既知タイプはアイコンに解決。',
  },

  // ─── Domain: task-5 Admin Panel client islands ───────────────────────────
  // These 5 components are the admin-panel data islands implemented in task-5
  // Step 5 (apps/web/src/app/(admin)/admin/**/_components/). They are real
  // 'use client' components driven by props + audited Server Actions. The
  // gallery preview passes static demo rows and the Server Action mutations are
  // never triggered on render (they fire only inside click handlers), so no DB /
  // Supabase env is required to display them.
  {
    id: 'admin-users-table',
    name: 'UsersTable',
    category: 'domain',
    status: 'implemented',
    phase: 'C',
    provider: 'custom',
    snippet: '<UsersTable rows={rows} />',
    description:
      'Admin user 一覧 (TanStack DataTable) — inline role 変更 Select + status バッジ。task-5。',
  },
  {
    id: 'admin-user-role-control',
    name: 'UserRoleControl',
    category: 'domain',
    status: 'implemented',
    phase: 'C',
    provider: 'custom',
    snippet: '<UserRoleControl userId={id} currentRole="member" />',
    description:
      'User 詳細ページの role 変更コントロール — staged-save (選択 → 保存)。task-5。',
  },
  {
    id: 'admin-allow-list-manager',
    name: 'AllowListManager',
    category: 'domain',
    status: 'implemented',
    phase: 'C',
    provider: 'custom',
    snippet: '<AllowListManager rows={rows} />',
    description:
      'Allow list CRUD — 追加 (Modal + Input) + 削除 (confirm)、Table 表示。task-5。',
  },
  {
    id: 'admin-audit-log-table',
    name: 'AuditLogTable',
    category: 'domain',
    status: 'implemented',
    phase: 'C',
    provider: 'custom',
    snippet: '<AuditLogTable rows={rows} />',
    description:
      '監査ログ Table (読取専用、直近 30 日) — actor / action / target ページネーション。task-5。',
  },
  {
    id: 'admin-pending-approvals-table',
    name: 'PendingApprovalsTable',
    category: 'domain',
    status: 'implemented',
    phase: 'C',
    provider: 'custom',
    snippet: '<PendingApprovalsTable rows={rows} />',
    description:
      '承認待ちユーザー Table — 行ごとに承認 / 拒否ボタン (audited Server Action)。task-5。',
  },

  // ─── Nav / Shell (task-5/template 実装済 3 件 + 15 placeholder) ───────────
  // Sidebar / Topbar / AppShell are implemented in `apps/web/src/components/shell/`
  // (task-32 Chakra v3 port) and rendered live in the gallery preview.
  // The remaining 15 are reserved for Phase 2 (Template / Future Expansion).
  ...nav_shell_implemented(),
  ...nav_shell_placeholders(),

  // ─── Chakra UI v3 Official-Only entries ───────────────────────────────────
  // These entries cover all Chakra UI v3 snippet catalog components that have
  // not yet been wrapped in this project. They link to the official Chakra docs
  // so developers can browse the full v3 component surface from this gallery.
  // Status = "official-only" → rendered with 📚 badge + dimmed card.
  ...chakra_official_only(),
])

/**
 * Nav/Shell components already implemented in `apps/web/src/components/shell/`
 * (task-32 Chakra v3 port). Rendered live in the gallery preview registry.
 * Phase 'C' (not 'future') so they satisfy the implemented-entry phase contract.
 */
function nav_shell_implemented(): ReadonlyArray<ComponentCatalogEntry> {
  const implemented: Array<[string, string, string]> = [
    ['nav-sidebar', 'Sidebar', 'メインナビゲーションレール — workspace バッジ + 検索 + グループ化リンク + user footer。'],
    ['nav-topbar', 'Topbar', 'トップアプリバー — パンくず + auth アクション + ColorMode トグル + MOCK バッジ + レイテンシ。'],
    ['nav-app-shell', 'AppShell', 'Sidebar + Topbar + メイン surface を組み合わせたレスポンシブシェル。'],
  ]
  return implemented.map(([id, name, description]) => ({
    id,
    name,
    category: 'nav-shell' as ComponentCategory,
    status: 'implemented' as ComponentStatus,
    phase: 'C' as ComponentPhase,
    provider: 'chakra' as ComponentProvider,
    referenceUrl: `${CHAKRA_DOCS}/box`,
    snippet: `<${name} />`,
    description,
  }))
}

function nav_shell_placeholders(): ReadonlyArray<ComponentCatalogEntry> {
  const placeholders: Array<[string, string, string]> = [
    ['nav-breadcrumb', 'Breadcrumb', 'ネスト管理ルート向けのパス認識パンくずトレイル。'],
    ['nav-command-palette', 'CommandPalette', '⌘K パレット — アクション / ナビゲーション / 検索。'],
    ['nav-menu', 'NavMenu', 'グループ化された宛先へのドロップダウンナビゲーション。'],
    ['nav-user-menu', 'UserMenu', 'Topbar 内のアバター + ロール + サインアウトメニュー。'],
    ['nav-account-switcher', 'AccountSwitcher', 'マルチテナント アカウント / ワークスペース切替。'],
    ['nav-notification-center', 'NotificationCenter', 'システム + Recall イベント向けインボックス surface。'],
    ['nav-help-popover', 'HelpPopover', 'コンテキスト依存のインラインヘルプ / ショートカットヒント。'],
    ['nav-page-header', 'PageHeader', 'ページレベルのタイトル + アクションストリップ。'],
    ['nav-section-header', 'SectionHeader', 'カード / セクションタイトル、任意 CTA 付き。'],
    ['nav-footer', 'Footer', 'マーケティング / ドキュメントフッター — 著作権 + リンク。'],
    ['nav-tab-bar-mobile', 'TabBarMobile', 'モバイルルート切替用ボトムタブバー。'],
    ['nav-stepper', 'Stepper', '複数ステップフローインジケーター (サインアップ / セットアップウィザード)。'],
    ['nav-toolbar', 'Toolbar', 'テーブル / ボード向けの密度対応アクションツールバー。'],
    ['nav-overflow-menu', 'OverflowMenu', 'ケバブ "more" メニュー — 補助アクションを折りたたみ。'],
    ['nav-locale-switcher', 'LocaleSwitcher', 'i18n 言語セレクター — 将来拡張用。'],
  ]
  return placeholders.map(([id, name, description]) => ({
    id,
    name,
    category: 'nav-shell' as ComponentCategory,
    status: 'placeholder' as ComponentStatus,
    phase: 'future' as ComponentPhase,
    provider: 'custom' as ComponentProvider,
    snippet: `// 🚧 ${name} — to be implemented in task-5 / template / future expansion.`,
    description,
  }))
}

/**
 * Chakra UI v3 official-only entries — components in the Chakra v3 snippet
 * catalog that are not yet wrapped in this project.
 *
 * Format: [id, name, category, description]
 *
 * These are sourced from `npx @chakra-ui/cli snippet list` (60 snippets total).
 * Entries that are already implemented/placeholder in the catalog are excluded.
 */
function chakra_official_only(): ReadonlyArray<ComponentCatalogEntry> {
  // prettier-ignore
  const entries: Array<[string, string, ComponentCategory, string]> = [
    // ── Typography ──────────────────────────────────────────────────────────
    ['chakra-blockquote',  'Blockquote',     'typography', '引用や pull quote 用のスタイル付き blockquote。'],
    ['chakra-kbd',         'Kbd',            'typography', 'キーボードショートカット表示、monospace スタイル。'],
    ['chakra-mark',        'Mark',           'typography', 'ハイライト / マーク付きインラインテキスト。'],
    ['chakra-prose',       'Prose',          'typography', 'リッチテキスト prose コンテナ、Tailwind スタイルタイポグラフィ。'],

    // ── Primitive (Forms) ────────────────────────────────────────────────────
    ['chakra-checkbox-card',   'CheckboxCard',   'primitive', 'カードスタイルのチェックボックスオプション — 通常 Checkbox の視覚的代替。'],
    ['chakra-color-picker',    'ColorPicker',    'primitive', 'スウォッチプリセット付き HSL/HEX フルカラーピッカー。'],
    ['chakra-combobox',        'Combobox',       'primitive', 'ドロップダウンオプションリスト付きオートコンプリート入力。'],
    ['chakra-file-upload',     'FileUpload',     'primitive', 'ドラッグ & ドロップまたはクリックで参照するファイル入力。'],
    ['chakra-input-group',     'InputGroup',     'primitive', '左右アドオンと要素スロット付き Input。'],
    ['chakra-link-button',     'LinkButton',     'primitive', 'Button スタイルのアンカー要素 — フォームセマンティクスなしのナビゲーション。'],
    ['chakra-native-select',   'NativeSelect',   'primitive', 'Chakra トークンでスタイリングされたブラウザネイティブ <select>。'],
    ['chakra-number-input',    'NumberInput',    'primitive', 'ステッパーの増減ボタン付き数値入力。'],
    ['chakra-password-input',  'PasswordInput',  'primitive', '表示/非表示トグルボタン付きパスワードフィールド。'],
    ['chakra-pin-input',       'PinInput',       'primitive', '4〜8 桁の OTP/PIN 入力を個別のセルに分割。'],
    ['chakra-radio-card',      'RadioCard',      'primitive', 'カードスタイルの単一選択オプション — RadioGroup の視覚的代替。'],
    ['chakra-rating',          'Rating',         'primitive', '半星・読み取り専用モード付きスター評価入力。'],
    ['chakra-segmented-control', 'SegmentedControl', 'primitive', '相互排他的な選択肢のトグルボタングループ (タブバースタイル)。'],
    ['chakra-slider',          'Slider',         'primitive', 'シングルサム or デュアルサムのレンジスライダー。'],
    ['chakra-stepper-input',   'StepperInput',   'primitive', '+/- ステッパーボタン付きコンパクト数値入力。'],
    ['chakra-tags-input',      'TagsInput',      'primitive', 'バックスペース削除対応のマルチバリュー タグ/チップ入力。'],
    ['chakra-toggle',          'Toggle',         'primitive', 'アクセシブルな 2 状態 pressed/unpressed ボタン。'],

    // ── Composite ────────────────────────────────────────────────────────────
    ['chakra-accordion',       'Accordion',      'composite', '折りたたみセクション、アニメーション付きパネル展開。'],
    ['chakra-carousel',        'Carousel',       'composite', 'スクロール可能カルーセル、prev/next ナビゲーション付き。'],
    ['chakra-data-list',       'DataList',       'composite', 'key-value 定義リスト、メタデータ / 詳細パネル用。'],
    ['chakra-floating-panel',  'FloatingPanel',  'composite', 'ドラッグ可能 + リサイズ可能なフローティングオーバーレイパネル。'],
    ['chakra-hover-card',      'HoverCard',      'composite', 'hover でトリガー、click 不要のプレビュー popover。'],
    ['chakra-menu',            'Menu',           'composite', 'キーボードナビゲーション付きドロップダウン コンテキスト/アクション メニュー。'],
    ['chakra-rich-text-editor', 'RichTextEditor', 'composite', 'Tiptap ベースの WYSIWYG エディター、ツールバースニペット付き。'],
    ['chakra-select',          'Select',         'composite', 'リストボックススタイルの Select (Chakra v3 非ネイティブ)、検索対応。'],
    ['chakra-splitter',        'Splitter',       'composite', 'ドラッグハンドル付きリサイズ可能分割ペインレイアウト。'],
    ['chakra-steps',           'Steps',          'composite', '縦レイアウト任意対応の複数ステップウィザードインジケーター。'],
    ['chakra-timeline',        'Timeline',       'composite', 'コネクターライン付き縦方向イベントタイムライン。'],
    ['chakra-toggle-tip',      'ToggleTip',      'composite', 'クリックでトグルする Tooltip バリアント (WCAG 2.5.3 準拠)。'],

    // ── Feedback ─────────────────────────────────────────────────────────────
    ['chakra-action-bar',      'ActionBar',      'feedback',  '一括選択 / 選択アイテムアクション用コンテキストアクションバー。'],
    ['chakra-close-button',    'CloseButton',    'feedback',  'Toast / Alert / Modal / タグ向けアクセシブル dismiss ボタン。'],
    ['chakra-progress',        'Progress',       'feedback',  'indeterminate アニメーション付き水平プログレスバー。'],
    ['chakra-progress-circle', 'ProgressCircle', 'feedback',  'パーセントラベル付き円形プログレスインジケーター。'],
    ['chakra-stat',            'Stat',           'feedback',  'ラベル / 値 / デルタ / ヘルプテキスト付き KPI stat タイル。'],
    ['chakra-status',          'Status',         'feedback',  'システムヘルス向けセマンティックステータスインジケーター (ドット + ラベル)。'],

    // ── Layout ───────────────────────────────────────────────────────────────
    ['chakra-clipboard',       'Clipboard',      'layout',    'アイコンボタンと成功フィードバック付きクリップボードコピーコントロール。'],
    ['chakra-color-mode',      'ColorMode',      'layout',    'next-themes ColorModeProvider をラップするライト/ダークモードトグル。'],
    ['chakra-field',           'Field',          'layout',    'ラベル / ヘルパーテキスト / エラーメッセージスロット付きフォームフィールドラッパー。'],
    ['chakra-qr-code',         'QrCode',         'layout',    'URL と短い文字列用 QR コードジェネレーターコンポーネント。'],

    // ── Navigation ───────────────────────────────────────────────────────────
    ['chakra-avatar',          'Avatar',         'nav-shell', 'フォールバックイニシャルとプレゼンスインジケーター付きユーザーアバター。'],
    ['chakra-breadcrumb',      'Breadcrumb',     'nav-shell', 'セパレーターと省略対応のパスパンくずトレイル。'],
    ['chakra-pagination',      'Pagination',     'nav-shell', 'prev/next とレンジコントロール付きページ番号ナビゲーション。'],
  ]

  // Map ComponentCategory to the _previews/ subdirectory name.
  // 'nav-shell' uses 'nav-shell' to mirror the category key.
  const CATEGORY_SUBDIR: Record<ComponentCategory, string> = {
    typography: 'typography',
    primitive: 'primitive',
    composite: 'composite',
    feedback: 'feedback',
    layout: 'layout',
    domain: 'domain',
    'nav-shell': 'nav-shell',
  }

  return entries.map(([id, name, category, description]) => ({
    id,
    name,
    category,
    status: 'official-only' as ComponentStatus,
    phase: 'chakra-v3' as ComponentPhase,
    provider: 'chakra' as ComponentProvider,
    referenceUrl: `${CHAKRA_DOCS}/${id.replace(/^chakra-/, '').replace(/-/g, '-')}`,
    snippet: `// See official Chakra UI v3 docs:\n// https://chakra-ui.com/docs/components/${id.replace(/^chakra-/, '')}`,
    description,
    officialPreviewPath: `_previews/${CATEGORY_SUBDIR[category]}/${id}`,
  }))
}

/**
 * Aggregate counts for the hero header — pre-computed so the page renders
 * deterministically without recomputing on every request.
 */
export interface CatalogSummary {
  readonly total: number
  readonly implemented: number
  readonly placeholder: number
  readonly officialOnly: number
  readonly byPhase: Readonly<Record<ComponentPhase, number>>
}

export function summarizeCatalog(
  entries: ReadonlyArray<ComponentCatalogEntry> = COMPONENT_CATALOG,
): CatalogSummary {
  const byPhase: Record<ComponentPhase, number> = { A: 0, B: 0, C: 0, future: 0, 'chakra-v3': 0 }
  let implemented = 0
  let placeholder = 0
  let officialOnly = 0
  for (const entry of entries) {
    byPhase[entry.phase] += 1
    if (entry.status === 'implemented') {
      implemented += 1
    } else if (entry.status === 'official-only') {
      officialOnly += 1
    } else {
      placeholder += 1
    }
  }
  return Object.freeze({
    total: entries.length,
    implemented,
    placeholder,
    officialOnly,
    byPhase: Object.freeze(byPhase),
  })
}

export const CATALOG_SUMMARY: CatalogSummary = summarizeCatalog()
