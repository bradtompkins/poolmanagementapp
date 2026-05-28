# Project Structure

## Current Layout

```
poolmanagementapp/
├── .kiro/
│   ├── specs/
│   │   └── pool-management-app/   # Spec: requirements, design, tasks
│   └── steering/                  # AI assistant guidance files
├── app/                           # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/     # NextAuth.js handler
│   │   ├── sessions/
│   │   │   ├── checkin/           # POST /api/sessions/checkin
│   │   │   └── checkout/          # POST /api/sessions/checkout
│   │   │   └── route.ts           # GET /api/sessions
│   │   └── sse/                   # GET /api/sse (Server-Sent Events)
│   ├── checkout/                  # Check-out form page
│   ├── status/                    # Pool status page
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Check-in form page (root route)
├── components/                    # Shared React components
│   └── ReturningMemberPrompt.tsx  # Returning member modal dialog
├── lib/                           # Server-side service and utility modules
│   ├── auth.ts                    # getServerSession wrapper + resolveRole helper
│   ├── prisma.ts                  # Shared PrismaClient singleton
│   ├── session-service.ts         # SessionService: checkIn, checkOut, getActiveSessions
│   ├── sse-broadcaster.ts         # SSEBroadcaster singleton
│   └── validation.ts              # Zod schemas + validateCheckIn/validateCheckOut
├── prisma/
│   ├── migrations/                # Prisma migration history
│   ├── schema.prisma              # Database schema (Session, User, UserRole)
│   └── seed.ts                    # Dev seed: admin + staff users
├── public/                        # Static assets
├── tests/
│   ├── integration/               # End-to-end flow tests (check-in, check-out, SSE)
│   ├── pbt/                       # Property-based tests (fast-check, Properties 1–9)
│   └── unit/                      # Unit tests co-located by module
├── .env.example                   # Environment variable template (commit this)
├── .env.local                     # Local secrets (do NOT commit)
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## Conventions

- **App Router**: All pages live under `app/`. Route handlers use `route.ts` files.
- **Service layer**: Business logic lives in `lib/` — never directly in route handlers.
- **Unit tests**: Co-located with source files using `.test.ts` suffix (e.g., `lib/validation.test.ts`), or placed in `tests/unit/`.
- **PBT tests**: All property-based tests go in `tests/pbt/`, one file per property.
- **Integration tests**: Full-flow tests go in `tests/integration/`.
- **Prisma client**: Always import from `lib/prisma.ts` — never instantiate `PrismaClient` directly in route handlers.
- **Environment variables**: Use `.env.example` as the template. Copy to `.env.local` for local development. Never commit `.env.local`.
- **Path alias**: `@/` maps to the project root (matches `tsconfig.json` and `vitest.config.ts`).

## Rationale

- `lib/` is used instead of `src/` to align with Next.js App Router conventions where `app/` is the primary source directory.
- SSE is handled via a Route Handler in `app/api/sse/route.ts` using the Web Streams API, which is natively supported in Next.js App Router.
- The `prisma.config.ts` at the root configures the Prisma CLI for migrations and seeding.
