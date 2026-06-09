// apps/web/src/app/auth/pending-approval/page.tsx
// task-5 Step 1: Pending approval landing page for users awaiting admin allow-list approval.
// task-37 Step 1: login 専用画面化 (ConditionalShell が /auth/* を bare 描画) +
//   raw inline style → Chakra semantic token 換装 (chakra-ui-migrate skill)。
//   機能ロジック (sign-out form POST) は維持し、見た目のみ Chakra 化する。
//
// draft 08 §「Auth pages」採用: 非 @classlab.co.jp domain かつ allow_list 未登録 user は
// sign-in flow 完了直後に本 page へ redirect される (Step 2 で Auth Hook 経由実装)。
//
// Step 1 scaffold 段階では UI のみ。実際の redirect logic と
// public.users.status check は Step 2 (domain check Hook) で実装する。

import { Box, Card } from '@chakra-ui/react'
import { Heading } from '@/components/ui/typography/Heading'
import { Text } from '@/components/ui/typography/Text'
import { Button } from '@/components/ui/primitive/Button'

export default function PendingApprovalPage() {
  return (
    <Box
      as="main"
      display="flex"
      minHeight="100vh"
      alignItems="center"
      justifyContent="center"
      p="6"
    >
      <Card.Root
        maxW="lg"
        w="full"
        bg="bg.elevated"
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="lg"
        boxShadow="md"
      >
        <Card.Body p="8" textAlign="center" aria-labelledby="pending-heading">
          <Heading level={6} as="h1" id="pending-heading">
            承認待ち
          </Heading>
          <Box mt="3" mb="4">
            <Text color="muted">
              アカウントは作成されましたが、管理者の承認が必要です。
              承認されると本サービスをご利用いただけます。
            </Text>
          </Box>
          <Text size="sm" color="muted">
            承認状況については管理者にお問い合わせください。
          </Text>

          <Box mt="6">
            <form action="/auth/sign-out" method="POST">
              <Button type="submit" variant="outline">
                サインアウト
              </Button>
            </form>
          </Box>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
