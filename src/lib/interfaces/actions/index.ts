// src/lib/interfaces/actions/index.ts
// Barrel for admin user-management Server Actions (draft 06 §4.2).

export {
  approveUserAction,
  type ApproveUserActionResult,
} from './approve-user.action'
export {
  rejectUserAction,
  type RejectUserActionResult,
} from './reject-user.action'
export {
  changeUserRoleAction,
  type ChangeUserRoleActionResult,
} from './change-user-role.action'
export {
  addAllowedUserAction,
  type AddAllowedUserActionResult,
} from './add-allowed-user.action'
