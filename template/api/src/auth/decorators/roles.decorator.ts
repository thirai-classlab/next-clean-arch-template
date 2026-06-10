import { SetMetadata } from '@nestjs/common'
import type { Role } from '@shared/domain/value-objects/role'

export const ROLES_KEY = 'roles'

/**
 * @Roles decorator — attach required Role(s) to a controller or handler.
 * Consumed by RolesGuard to check req.user.role against the metadata.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
