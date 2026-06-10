import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role } from '@shared/domain/value-objects/role'
import { ROLES_KEY } from '../decorators/roles.decorator'

interface RequestWithUser {
  user?: { role?: string }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>(ROLES_KEY, context.getHandler())

    // No @Roles() metadata → handler is accessible by any authenticated user.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const userRole = request.user?.role

    if (!userRole || !requiredRoles.includes(userRole as Role)) {
      throw new ForbiddenException('Insufficient role')
    }

    return true
  }
}
