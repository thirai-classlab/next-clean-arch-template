import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

type PrismaUserRecord = {
  id: string
  email: string
  role: string
  status: string
  name: string | null
  image: string | null
}

type UserFindUnique = {
  findUnique(args: { where: { email?: string; id?: string } }): Promise<PrismaUserRecord | null>
  findMany(): Promise<PrismaUserRecord[]>
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<PrismaUserRecord | null> {
    const delegate = this.prisma.user as unknown as UserFindUnique
    return delegate.findUnique({ where: { email } })
  }

  async findById(id: string): Promise<PrismaUserRecord | null> {
    const delegate = this.prisma.user as unknown as UserFindUnique
    return delegate.findUnique({ where: { id } })
  }

  async findAll(): Promise<PrismaUserRecord[]> {
    const delegate = this.prisma.user as unknown as UserFindUnique
    return delegate.findMany()
  }
}
