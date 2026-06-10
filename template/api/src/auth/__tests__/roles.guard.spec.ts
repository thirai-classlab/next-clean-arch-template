import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from '../guards/roles.guard'

function makeContext(role?: string): ExecutionContext {
  return {
    getHandler: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: role ? { role } : undefined,
      }),
    }),
  } as unknown as ExecutionContext
}

describe('RolesGuard', () => {
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
  })

  it('allows access when no @Roles() metadata is set', () => {
    // Arrange
    jest.spyOn(reflector, 'get').mockReturnValue(undefined)
    const guard = new RolesGuard(reflector)
    const context = makeContext('member')

    // Act
    const result = guard.canActivate(context)

    // Assert
    expect(result).toBe(true)
  })

  it('allows access when user role matches @Roles() requirement', () => {
    // Arrange
    jest.spyOn(reflector, 'get').mockReturnValue(['admin'])
    const guard = new RolesGuard(reflector)
    const context = makeContext('admin')

    // Act
    const result = guard.canActivate(context)

    // Assert
    expect(result).toBe(true)
  })

  it('throws ForbiddenException when user role does not match', () => {
    // Arrange
    jest.spyOn(reflector, 'get').mockReturnValue(['admin'])
    const guard = new RolesGuard(reflector)
    const context = makeContext('member')

    // Act & Assert
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when user has no role', () => {
    // Arrange
    jest.spyOn(reflector, 'get').mockReturnValue(['admin'])
    const guard = new RolesGuard(reflector)
    const context = makeContext(undefined)

    // Act & Assert
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })

  it('allows access when user has one of multiple required roles', () => {
    // Arrange
    jest.spyOn(reflector, 'get').mockReturnValue(['admin', 'viewer'])
    const guard = new RolesGuard(reflector)
    const context = makeContext('viewer')

    // Act
    const result = guard.canActivate(context)

    // Assert
    expect(result).toBe(true)
  })
})
