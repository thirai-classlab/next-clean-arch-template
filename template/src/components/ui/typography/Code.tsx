/**
 * Code — Chakra UI v3 (Phase 5 migration)
 *
 * Recipe convention: same pattern as primitive/Button.tsx.
 *   1. inline mode → Chakra `Code` factory (renders semantic <code>).
 *   2. block mode  → Chakra `Box` wrapper containing a native <pre><code>
 *      structure (consumers / tests rely on the pre>code shape and on the
 *      <code> carrying data-language). The <pre> is styled via Chakra props.
 *   3. Copy button → Chakra `IconButton` with the same aria-label state machine.
 *   4. Linear-theme surfaces via semantic tokens (bg.sunken, fg.default,
 *      border.default, etc.) — no raw var() / oklch / hex.
 *   5. Public API (inline / language / copyable / className / children) is
 *      unchanged. "use client" required (stateful copy + Chakra factories).
 */
'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Box, Code as ChakraCode, IconButton } from '@chakra-ui/react'
import { cn } from '@/lib/utils/cn'

export interface CodeProps {
  /** true: renders as inline <code>, false (default): renders as <pre><code> block */
  inline?: boolean
  /** Language hint for future syntax highlighting integration */
  language?: string
  /** Show copy button (block mode only) */
  copyable?: boolean
  className?: string
  children: string
}

export function Code({
  inline = false,
  language,
  copyable = false,
  className,
  children,
}: CodeProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (inline) {
    return (
      <ChakraCode
        className={cn(className)}
        data-language={language}
        fontFamily="mono"
        fontSize="sm"
        bg="bg.sunken"
        color="fg.default"
        borderRadius="sm"
        px="1"
        py="0.5"
      >
        {children}
      </ChakraCode>
    )
  }

  return (
    <Box
      position="relative"
      bg="bg.sunken"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="border.default"
    >
      <Box
        as="pre"
        className={cn(className)}
        overflowX="auto"
        p="4"
        margin={0}
        bg="transparent"
      >
        <ChakraCode
          data-language={language}
          fontFamily="mono"
          fontSize="sm"
          bg="transparent"
          color="fg.default"
          px={0}
        >
          {children}
        </ChakraCode>
      </Box>
      {copyable && (
        <IconButton
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'コピー完了' : 'クリップボードにコピー'}
          variant="outline"
          size="xs"
          position="absolute"
          top="2"
          right="2"
          bg="bg.elevated"
          borderColor="border.default"
          color="fg.muted"
          borderRadius="sm"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </IconButton>
      )}
    </Box>
  )
}
