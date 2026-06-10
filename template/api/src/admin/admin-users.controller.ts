import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UsersService } from '../users/users.service'

/**
 * Admin-only user management endpoints.
 * Demonstrates JwtAuthGuard + RolesGuard(@Roles('admin')) composition.
 * Returns 401 when no valid JWT cookie is present.
 * Returns 403 when authenticated user's role !== 'admin'.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /admin/users
   * Requires: JwtAuthGuard (authenticated) + @Roles('admin').
   * Returns array of { id, email, role, status }.
   */
  @Get('users')
  @Roles('admin')
  async listUsers() {
    const users = await this.usersService.findAll()
    return users.map(({ id, email, role, status }) => ({ id, email, role, status }))
  }
}
