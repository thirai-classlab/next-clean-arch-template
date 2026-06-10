// src/lib/mock-data.ts — Seed data for the Recall.ai POC mock store.
// Port: docs/design-import/project/app/data.jsx + app2/data2.jsx
//
// All names/strings are fictional sample data — no real customer names.

import type { Bot, Feature, WebhookType } from '@/types/recall'

// ─── Bots (4 fictional ClassLab. use-cases) ──────────────────
export const SEED_BOTS: Bot[] = [
  {
    id: 'bot_3f9a2c8e',
    name: '商談-アクメ商事 定例',
    useCase: '商談録画',
    platform: 'Zoom',
    meetingUrl: 'zoom.us/j/8429103…',
    transcriptionProvider: 'deepgram',
    realtimeMode: 'low_latency',
    participants: ['佐藤 PM', 'アクメ 山田部長', 'アクメ 田中CS'],
    status: 'in_call',
    startedAt: '12:30',
    durationSec: 1320,
  },
  {
    id: 'bot_7c4b1d92',
    name: '高3-A組 数学 4限',
    useCase: 'オンライン授業',
    platform: 'Google Meet',
    meetingUrl: 'meet.google.com/abc-defg-hij',
    transcriptionProvider: 'recallai',
    realtimeMode: 'accuracy',
    participants: ['須藤先生', '生徒 ×34'],
    status: 'in_call',
    startedAt: '12:00',
    durationSec: 2280,
  },
  {
    id: 'bot_5e2a9f1b',
    name: '朝会-プロダクトチーム',
    useCase: '社内議事録',
    platform: 'Microsoft Teams',
    meetingUrl: 'teams.microsoft.com/l/meetup…',
    transcriptionProvider: 'recallai',
    realtimeMode: 'low_latency',
    participants: ['西田EM', '河村iOS', '小池BE', '林QA', '+4'],
    status: 'joining',
    startedAt: '12:43',
    durationSec: 12,
  },
  {
    id: 'bot_8d1f6e34',
    name: 'CS 品質-1月-#0214',
    useCase: 'コールセンター',
    platform: 'Webex',
    meetingUrl: 'webex.com/meet/cs-quality',
    transcriptionProvider: 'assemblyai',
    realtimeMode: 'accuracy',
    participants: ['オペ 中野', '顧客 (匿名)'],
    status: 'done',
    startedAt: '11:42',
    durationSec: 1560,
  },
]

// ─── Transcript seed (botId, speaker, text) ──────────────────
export interface TranscriptSeedLine {
  bot: string
  speaker: string
  text: string
}

export const TRANSCRIPT_SEED: TranscriptSeedLine[] = [
  { bot: 'bot_3f9a2c8e', speaker: 'アクメ 山田部長', text: '本日はお時間いただきありがとうございます。' },
  { bot: 'bot_3f9a2c8e', speaker: '佐藤 PM',         text: 'こちらこそ、よろしくお願いいたします。' },
  { bot: 'bot_7c4b1d92', speaker: '須藤先生',        text: 'では、二次関数の最大最小の問題に入ります。' },
  { bot: 'bot_3f9a2c8e', speaker: 'アクメ 山田部長', text: '先日いただいた提案ですが、社内で前向きに検討しています。' },
  { bot: 'bot_5e2a9f1b', speaker: '西田EM',          text: '今週の優先タスクは在庫リコンサイル機能のリリースです。' },
  { bot: 'bot_3f9a2c8e', speaker: '佐藤 PM',         text: '導入時のサポート体制も含めて、改めて資料お送りします。' },
  { bot: 'bot_7c4b1d92', speaker: '須藤先生',        text: '頂点の座標が x = -b / 2a になりますね。' },
  { bot: 'bot_3f9a2c8e', speaker: 'アクメ 田中CS',   text: '請求まわりの API 仕様について確認したい点があります。' },
  { bot: 'bot_5e2a9f1b', speaker: '河村iOS',         text: 'iOS 側は明日 PR を出せそうです、レビューお願いします。' },
  { bot: 'bot_3f9a2c8e', speaker: '佐藤 PM',         text: 'はい、Webhook の retry ポリシーも合わせてご説明しますね。' },
  { bot: 'bot_7c4b1d92', speaker: '須藤先生',        text: 'ここで b の符号に注意してください、よくミスする所です。' },
  { bot: 'bot_5e2a9f1b', speaker: '小池BE',          text: 'バックエンドは spec 確定待ちなので、午後に同期したいです。' },
  { bot: 'bot_3f9a2c8e', speaker: 'アクメ 山田部長', text: '価格についてはエンタープライズ枠での検討になります。' },
  { bot: 'bot_3f9a2c8e', speaker: '佐藤 PM',         text: '承知しました。年間契約での試算をお出しします。' },
  { bot: 'bot_7c4b1d92', speaker: '須藤先生',        text: 'では次のスライドをご覧ください。' },
  { bot: 'bot_5e2a9f1b', speaker: '林QA',            text: 'E2E test の Playwright 移行は今週中に完了予定です。' },
  { bot: 'bot_3f9a2c8e', speaker: 'アクメ 田中CS',   text: '本番デプロイのタイミングも含めてご相談させてください。' },
]

// ─── Webhook type frequencies (Recall.ai 準拠) ───────────────
export interface WebhookTypeFreq {
  type: WebhookType
  freq: number
  label: string
}

export const WEBHOOK_TYPES: WebhookTypeFreq[] = [
  { type: 'transcript.data',        freq: 0.45, label: 'transcript.data' },
  { type: 'bot.status_change',      freq: 0.25, label: 'bot.status_change' },
  { type: 'recording.done',         freq: 0.10, label: 'recording.done' },
  { type: 'transcript.partial',     freq: 0.15, label: 'transcript.partial' },
  { type: 'bot.permission_denied',  freq: 0.05, label: 'bot.permission_denied' },
]

// ─── Feature catalog (Home rail / Sidebar) ───────────────────
export const FEATURES: Feature[] = [
  { id: 'F01', code: 'meeting',    name: 'Meeting Bot',   route: '/bots',          desc: '6+ platform 統一 API',  tag: 'capture',  highlight: true },
  { id: 'F04', code: 'transcribe', name: 'Transcription', route: '/transcription', desc: '内蔵 / Deepgram / AWS', tag: 'process' },
  { id: 'F05', code: 'realtime',   name: 'Realtime',      route: '/realtime',      desc: 'low_latency / accuracy', tag: 'process', highlight: true },
  { id: 'F06', code: 'calendar',   name: 'Calendar',      route: '/calendar',      desc: 'Google / Outlook 自動投入', tag: 'integrate' },
  { id: 'F07', code: 'breakout',   name: 'Breakout',      route: '/breakout',      desc: 'Recall.ai 唯一機能',     tag: 'process',  badge: 'UNIQUE' },
  { id: 'F08', code: 'output',     name: 'Media Output',  route: '/media-output',  desc: 'Bot から発話',           tag: 'output' },
  { id: 'F09', code: 'recording',  name: 'Recordings',    route: '/recordings',    desc: 'mp4 / mp3 / per-speaker', tag: 'output' },
  { id: 'F11', code: 'webhook',    name: 'Webhooks',      route: '/webhooks',      desc: 'log + state machine',     tag: 'output', highlight: true },
  { id: 'F02', code: 'desktop',    name: 'Desktop SDK',   route: '/desktop-sdk',   desc: 'Mac / Windows 仕様',     tag: 'capture',  stub: true },
  { id: 'F03', code: 'mobile',     name: 'Mobile SDK',    route: '/mobile-sdk',    desc: 'iOS / Android 仕様',     tag: 'capture',  stub: true },
  { id: 'F10', code: 'compliance', name: 'Compliance',    route: '/compliance',    desc: 'SOC2 / ISO / HIPAA',     tag: 'ref',      stub: true },
]

// ─── Bot name pool (used by tick to spin up fresh joining bots) ──
export const FRESH_BOT_NAMES = [
  '朝会-プロダクト 2',
  '面談-候補者#0312',
  '商談-ベータ建設',
  'CS品質-#0218',
] as const

export const FRESH_BOT_PLATFORMS: ReadonlyArray<Bot['platform']> = [
  'Google Meet',
  'Zoom',
  'Microsoft Teams',
  'Webex',
]

export const FRESH_BOT_USECASES = [
  '社内議事録',
  '社内議事録',
  '商談録画',
  'コールセンター',
] as const
