'use client'
// src/app/(admin)/admin/users/[id]/_components/UserRoleControl.tsx
// task-5 Step 5 — client island: role change control on the user detail page.
// Step 8 Phase C-followup: added data-testid="role-select" on Select,
// data-testid="save-role-button" on explicit Save button.
// Changed from auto-save (immediate on select change) to staged-save
// (user picks role, then clicks Save to commit).

import * as React from 'react'
import { Select, type SelectOption } from '@/components/ui/primitive/Select'
import { Btn } from '@/components/ui/Btn'
import { useToast } from '@/components/ui/feedback'
import type { Role } from '@/lib/domain/value-objects/role'
import { changeUserRole } from '../../../_lib/admin-actions'

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'admin', label: 'admin' },
  { value: 'member', label: 'member' },
  { value: 'viewer', label: 'viewer' },
]

export function UserRoleControl({
  userId,
  currentRole,
}: {
  userId: string
  currentRole: Role
}) {
  const [role, setRole] = React.useState<Role>(currentRole)
  const [pending, startTransition] = React.useTransition()
  const toast = useToast()

  const isDirty = role !== currentRole

  const onSave = () => {
    startTransition(async () => {
      const result = await changeUserRole(userId, role)
      if ('error' in result) {
        toast.error(`Role 変更失敗: ${result.error}`)
        setRole(currentRole)
      } else {
        toast.success('Role を変更しました')
      }
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <Select
        data-testid="role-select"
        label="Role"
        options={ROLE_OPTIONS}
        value={role}
        disabled={pending}
        onValueChange={(value) => setRole(value as Role)}
      />
      <Btn
        data-testid="save-role-button"
        variant="primary"
        size="sm"
        disabled={pending || !isDirty}
        onClick={onSave}
      >
        保存
      </Btn>
    </div>
  )
}
