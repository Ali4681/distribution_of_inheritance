---
name: Inheritance Distribution Backend Project
description: NestJS backend for Islamic inheritance distribution per Syrian Personal Status Law - current state and architecture
type: project
---

NestJS + PostgreSQL + Prisma ORM backend for distributing inheritance (توزيع الميراث) per Syrian Personal Status Law.

**Why:** The user is building a complete system to calculate and distribute inheritance assets among family members according to Syrian law, reducing family disputes.

**How to apply:** When helping with this project, know the full stack is complete as a backend MVP. Frontend is NOT built.

Key facts:
- Runs on PORT=8000 (default), global prefix /api
- JWT_SECRET is set in .env as "inheritance-system-secret-2026"
- Database: PostgreSQL at localhost:5432/postgres (credentials in .env)
- Build command: npm.cmd run build
- Dev command: npm.cmd run dev

Modules:
- /api/auth: signup, signin, edit/:id
- /api/cases: CRUD for inheritance cases
- /api/family-members: CRUD family tree members
- /api/heirs: POST calculate/:caseId, GET ?caseId=, DELETE case/:caseId
- /api/blocked-heirs: GET ?caseId=
- /api/reports: POST cases/:caseId/pdf?language=AR|EN, GET
- /api/users: Admin CRUD (GET, GET/:id, PATCH/:id, DELETE/:id), GET me

Case fields: deceasedName, deathDate, totalEstate, funeralCosts, debts, mandatoryWill, optionalWill, currency
Distributable estate = totalEstate - funeralCosts - debts - mandatoryWill - optionalWill

Inheritance engine: src/heirs/inheritance-calculator.ts (950 lines)
- References Syrian law articles (260-297)
- Handles: fixed shares, residuary, awl, radd, dhu al-arham
- Extended RelationType enum: SON_OF_SON, DAUGHTER_OF_SON, FULL_BROTHER, FULL_SISTER, PATERNAL_BROTHER, PATERNAL_SISTER, MATERNAL_BROTHER, MATERNAL_SISTER, PATERNAL_UNCLE_FULL, PATERNAL_UNCLE_PATERNAL, MATERNAL_UNCLE, MATERNAL_AUNT
