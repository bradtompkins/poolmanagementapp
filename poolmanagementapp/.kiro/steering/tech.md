# Tech Stack

## Stack

- **Language**: TypeScript (strict mode)
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL via Prisma ORM (v7)
- **Auth**: NextAuth.js v4 (Credentials provider, bcryptjs password hashing)
- **Validation**: Zod
- **Real-time**: Server-Sent Events (SSE) via Next.js Route Handlers
- **Hosting**: Vercel (recommended) or any Node.js host

## Key Libraries

| Package | Purpose |
|---|---|
| `next` | Framework (App Router, Route Handlers) |
| `next-auth` | Authentication and session management |
| `prisma` / `@prisma/client` | ORM and database access |
| `bcryptjs` | Password hashing for credentials auth |
| `zod` | Runtime input validation |
| `fast-check` | Property-based testing |
| `vitest` | Test runner |
| `@vitejs/plugin-react` | React support in Vitest |
| `@vitest/coverage-v8` | Code coverage |
| `msw` | HTTP mocking for client-side tests |

## Common Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests (single run)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Lint
npm run lint

# Prisma: generate client after schema changes
npx prisma generate

# Prisma: create and apply a migration
npx prisma migrate dev --name <migration-name>

# Prisma: seed the database
npx prisma db seed
```

## Code Style

- Keep functions small and single-purpose
- Prefer explicit over implicit
- Use TypeScript strict mode — no `any` types
- Use consistent naming: camelCase for variables/functions, PascalCase for components/types
- Write tests alongside new features
- Co-locate unit tests with source files using `.test.ts` suffix; place PBT tests in `tests/pbt/`

## Environment Variables

See `.env.example` for required variables. Copy to `.env.local` for local development.

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Secret for NextAuth.js JWT signing (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` — Canonical URL of the deployment (e.g., `http://localhost:3000`)
