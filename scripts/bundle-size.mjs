/**
 * Bundle size measurement script for Phase A components.
 *
 * Usage: node scripts/bundle-size.mjs
 * Requires: pnpm build must be run first (.next/ directory must exist)
 *
 * DoD: Primitive chunk < 30KB gzip (accepted-risk Phase A #8:
 *   strict CI gate deferred to Phase C with @next/bundle-analyzer)
 */
import { readdir, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createGzip } from 'node:zlib'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { PassThrough } from 'node:stream'

const CHUNKS_DIR = join(process.cwd(), '.next', 'static', 'chunks')
const THRESHOLD_KB = 30

async function getGzipSize(filePath) {
  let size = 0
  const pass = new PassThrough()
  pass.on('data', (chunk) => { size += chunk.length })
  await pipeline(
    createReadStream(filePath),
    createGzip(),
    pass,
  )
  return size
}

async function listJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const sub = await listJsFiles(join(dir, entry.name))
      files.push(...sub)
    } else if (entry.name.endsWith('.js')) {
      files.push(join(dir, entry.name))
    }
  }
  return files
}

async function main() {
  let files
  try {
    files = await listJsFiles(CHUNKS_DIR)
  } catch {
    console.error('ERROR: .next/static/chunks not found. Run pnpm build first.')
    process.exit(1)
  }

  console.log('\n── Bundle Size Report (gzip) ─────────────────────────────')
  console.log(`  Scanning: ${CHUNKS_DIR}`)
  console.log(`  Files found: ${files.length}`)
  console.log('')

  const results = []
  for (const file of files) {
    const rawStat = await stat(file)
    const gzipBytes = await getGzipSize(file)
    const rawKB = (rawStat.size / 1024).toFixed(1)
    const gzipKB = (gzipBytes / 1024).toFixed(1)
    const shortName = file.replace(CHUNKS_DIR + '/', '')
    results.push({ shortName, rawKB: parseFloat(rawKB), gzipKB: parseFloat(gzipKB) })
  }

  // Sort by gzip size descending
  results.sort((a, b) => b.gzipKB - a.gzipKB)

  let totalGzip = 0
  for (const r of results) {
    totalGzip += r.gzipKB
    const flag = r.gzipKB > THRESHOLD_KB ? ' ⚠️  OVER 30KB' : ''
    console.log(`  ${r.shortName.padEnd(55)} raw=${r.rawKB}KB  gz=${r.gzipKB}KB${flag}`)
  }

  console.log('')
  console.log(`  Total gzip: ${totalGzip.toFixed(1)} KB across ${results.length} chunks`)
  console.log(`  Threshold (primitive chunk DoD): < ${THRESHOLD_KB} KB gzip`)
  console.log('')

  // Report largest chunk (proxy for primitive chunk size check)
  const largest = results[0]
  if (largest) {
    console.log(`  Largest chunk: ${largest.shortName} (${largest.gzipKB} KB gz)`)
    if (largest.gzipKB <= THRESHOLD_KB) {
      console.log('  STATUS: PASS — all chunks within 30KB gzip threshold')
    } else {
      console.log(`  STATUS: INFO — largest chunk ${largest.gzipKB} KB exceeds 30KB`)
      console.log('    (Strict gate deferred to Phase C with @next/bundle-analyzer)')
    }
  }
  console.log('──────────────────────────────────────────────────────────\n')
}

main()
