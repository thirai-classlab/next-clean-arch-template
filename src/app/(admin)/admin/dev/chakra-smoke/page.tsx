/**
 * /admin/dev/chakra-smoke — Phase 1 smoke surface
 *
 * Minimal page to verify:
 *   1. ChakraProvider + theme system are wired correctly
 *   2. Linear accent (#2A6FDB / oklch(55% 0.18 250)) renders on the button
 *   3. Inter font is active
 *   4. No SSR/hydration flash
 *
 * This page is dev-only and will be removed when the component gallery
 * is rebuilt with Chakra in Phase 6.
 */

import { Button, Text, VStack, Heading, Box } from '@chakra-ui/react'

interface TokenRow {
  label: string
  token: string
}

const TOKEN_ROWS: TokenRow[] = [
  { label: 'bg.base',            token: 'bg.base' },
  { label: 'bg.elevated',        token: 'bg.elevated' },
  { label: 'bg.sunken',          token: 'bg.sunken' },
  { label: 'status.danger',      token: 'status.danger' },
  { label: 'status.success',     token: 'status.success' },
  { label: 'status.warning',     token: 'status.warning' },
]

export default function ChakraSmokePage() {
  return (
    <Box p="8" maxW="480px">
      <VStack align="start" gap="6">
        <Heading size="lg" fontFamily="sans" color="fg.default">
          Chakra v3 — Phase 1 smoke
        </Heading>

        <Text color="fg.muted" fontSize="md" fontFamily="sans">
          Provider is wired. Token system is active. If the button below is
          Linear blue (oklch 55% 0.18 250 ≈ #2A6FDB), theming is working.
        </Text>

        {/* Accent button — should render Linear blue */}
        <Button
          bg="accent.default"
          color="white"
          borderRadius="md"
          px="6"
          py="3"
          fontFamily="sans"
          fontSize="sm"
          fontWeight="semibold"
          _hover={{ bg: 'accent.hover' }}
        >
          Chakra OK — Linear accent
        </Button>

        {/* Token grid — visual check of semantic token resolution */}
        <VStack align="start" gap="2" w="full">
          {TOKEN_ROWS.map(({ label, token }) => (
            <Box key={label} display="flex" alignItems="center" gap="3">
              <Box
                w="24px"
                h="24px"
                borderRadius="sm"
                bg={token}
                border="1px solid"
                borderColor="border.default"
                flexShrink={0}
              />
              <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                {token}
              </Text>
            </Box>
          ))}
        </VStack>
      </VStack>
    </Box>
  )
}
