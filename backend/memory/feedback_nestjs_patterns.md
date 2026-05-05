---
name: NestJS Project Patterns for Inheritance System
description: Patterns and conventions established in the inheritance distribution backend
type: feedback
---

Always use AuthUser type (not Request.user directly) from src/auth/auth-user.ts when accessing user in services.

**Why:** The project consistently passes AuthUser to services instead of the raw JWT payload, keeping type safety clean.

**How to apply:** Service methods take (dto, user: AuthUser) not (dto, req: Request). Controllers extract request.user and pass it.

JWT secret must be consistent: auth.module.ts and jwt.guard.ts both use process.env.JWT_SECRET. The .env file has JWT_SECRET set. Never use different hardcoded fallbacks between signing and verification.

**Why:** A previous bug had guard using '' and auth module using 'mohammed123' as fallbacks, breaking all API calls.

Add import 'dotenv/config' as FIRST import in main.ts to guarantee env vars load before module configuration.

**Why:** JwtModule.register() runs at module configuration time, before service constructors. If dotenv loads late, JWT_SECRET is undefined during module setup.

PrismaModule is @Global() so don't import it in feature modules - PrismaService is available everywhere.
