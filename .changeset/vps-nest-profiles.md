---
"@takuma-hirai/create-app": minor
---

Add vps-nest-postgres and vps-nest-mariadb deploy profiles: NestJS API owns authentication (Passport credentials + Google OAuth + JWT cookie + RolesGuard + domain hook), Next.js front-end verifies the Nest-issued JWT in Edge middleware. Same dual-Prisma data layer.
