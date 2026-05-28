# Implementation Plan: Pool Management App

## Overview

Build a Next.js App Router web application for pool facility check-in/check-out management with real-time occupancy tracking, role-based visibility, and durable session persistence.

## Tasks

- [x] 1. Project Scaffolding and Configuration
  - Initialize Next.js project with TypeScript and App Router in the workspace root
  - Install all required dependencies: prisma, @prisma/client, next-auth, bcryptjs, zod, fast-check, vitest, @vitejs/plugin-react, msw
  - Initialize Prisma and configure DATABASE_URL in .env.example
  - Create .env.local template with DATABASE_URL, NEXTAUTH_SECRET, and NEXTAUTH_URL placeholders
  - Configure vitest.config.ts with jsdom environment and path aliases matching tsconfig.json
  - Update tech.md and structure.md steering files to reflect the finalized stack and folder layout
  - **Requirements**: All

- [x] 2. Database Schema and Prisma Setup
  - Write prisma/schema.prisma with Session model (id, name, membershipNumber, phoneNumber, partySize, isPrivate, checkedInAt, checkedOutAt, isActive) and User model with UserRole enum (ADMIN, STAFF, PUBLIC)
  - Add composite indexes @@index([membershipNumber, isActive]) and @@index([isActive]) to the Session model
  - Create initial migration and generate Prisma client
  - Create lib/prisma.ts singleton that exports a shared PrismaClient instance safe for Next.js hot-reload
  - Create prisma/seed.ts that creates one admin and one staff user for development
  - **Requirements**: Requirements 1, 3, 9

- [x] 3. Validation Service
  - Create lib/validation.ts with Zod schemas for CheckInInput: name non-empty string, membershipNumber numeric-only string, phoneNumber exactly 10 digits, partySize integer 1-20 inclusive, isPrivate boolean
  - Add CheckOutInput Zod schema: membershipNumber numeric string
  - Export validateCheckIn and validateCheckOut functions returning typed data or structured ValidationError[]
  - Write unit tests in tests/unit/validation.test.ts covering all valid and invalid field combinations for every rule
  - **Requirements**: Requirements 1, 10

- [x] 4. Session Service
  - Create lib/session-service.ts implementing checkIn(data: CheckInInput): Promise<Session> using a Prisma transaction
  - Implement checkOut(membershipNumber: string): Promise<CheckOutResult> setting checkedOutAt and isActive=false in a transaction; return not_found if no active session exists
  - Implement findActiveSession(membershipNumber: string): Promise<Session | null>
  - Implement getActiveSessions(role: UserRole): Promise<SessionView[]> filtering private sessions and phone numbers per the role visibility matrix: public sees only non-private sessions without phone numbers; staff sees all sessions without phone numbers; admin sees all sessions with phone numbers
  - Write unit tests in tests/unit/session-service.test.ts with a mocked Prisma client covering all four methods and all role-filtering combinations
  - **Requirements**: Requirements 1, 2, 3, 4, 5, 6, 7, 9

- [x] 5. SSE Broadcaster
  - Create lib/sse-broadcaster.ts with a singleton SSEBroadcaster class implementing subscribe(clientId, role, writer), unsubscribe(clientId), and broadcast(event: PoolStatusEvent)
  - broadcast() iterates all connected clients, filters SessionView[] per each client's role, and writes SSE-formatted event strings to each client's WritableStreamDefaultWriter
  - Handle write errors per client gracefully by removing disconnected clients without crashing the broadcaster
  - Write unit tests in tests/unit/sse-broadcaster.test.ts covering subscribe/unsubscribe, broadcast delivery, and role-based filtering per client
  - **Requirements**: Requirements 5, 6, 7, 8

- [x] 6. NextAuth Configuration and Role Resolution
  - Create app/api/auth/[...nextauth]/route.ts with NextAuth handler using the Credentials provider
  - Configure Credentials provider to look up a User record by email and validate a bcryptjs-hashed password
  - Add role to the NextAuth JWT and session callbacks so session.user.role is available in all route handlers
  - Create lib/auth.ts exporting getServerSession wrapper and a resolveRole(session): UserRole helper returning 'public' for unauthenticated requests
  - **Requirements**: Requirements 6, 7

- [x] 7. API Route — Check-In (POST /api/sessions/checkin)
  - Create app/api/sessions/checkin/route.ts parsing and validating request body with validateCheckIn; return HTTP 400 with structured field errors on validation failure
  - Call findActiveSession; if active session exists for the membership number return HTTP 409 with { status: 'already_checked_in', sessionId } so the client can show the Returning Member Prompt
  - Call sessionService.checkIn(data) in a try/catch; return HTTP 201 with the created session on success; return HTTP 500 on database error without confirming success
  - After successful check-in call sseBroadcaster.broadcast() with the updated active session list
  - **Requirements**: Requirements 1, 2, 8, 9, 10

- [x] 8. API Route — Check-Out (POST /api/sessions/checkout)
  - Create app/api/sessions/checkout/route.ts parsing and validating request body with validateCheckOut; return HTTP 400 on validation failure
  - Call sessionService.checkOut(membershipNumber); return HTTP 200 with { status: 'checked_out' } on success; return HTTP 404 with { status: 'not_found' } if no active session
  - Return HTTP 500 on database error without marking the session inactive
  - After successful check-out call sseBroadcaster.broadcast() with the updated active session list
  - **Requirements**: Requirements 3, 8, 9

- [x] 9. API Routes — Sessions GET and SSE
  - Create app/api/sessions/route.ts resolving role via resolveRole, calling getActiveSessions(role), returning JSON; return HTTP 401/403 for requests to phone-number-inclusive data from insufficient roles
  - Create app/api/sse/route.ts resolving role, subscribing the client to sseBroadcaster, sending current pool state immediately on connect, streaming events until client disconnects
  - Implement Last-Event-ID reconnection: on reconnect send the current pool state as the first event so the client is never stale
  - Set correct SSE response headers: Content-Type text/event-stream, Cache-Control no-cache, Connection keep-alive
  - **Requirements**: Requirements 5, 6, 7, 8

- [x] 10. Check-In Form Page
  - Create app/page.tsx as the Check-In page with a form collecting name, membership number, phone number, party size, and an isPrivate checkbox
  - Implement client-side form state with useState; submit via fetch POST to /api/sessions/checkin
  - On HTTP 409 (already checked in) display the ReturningMemberPrompt component
  - On HTTP 201 display a success confirmation message; on HTTP 400 display per-field validation error messages; on HTTP 500 display a generic error message
  - **Requirements**: Requirements 1, 2, 10

- [x] 11. Returning Member Prompt Component
  - Create components/ReturningMemberPrompt.tsx as a modal dialog with "Continue Session" and "Check Out" buttons and a visible 60-second countdown timer
  - Implement 60-second auto-dismiss with setTimeout; on timeout dismiss the prompt and retain the existing session with no API call
  - "Continue Session" button dismisses the prompt immediately with no API call
  - "Check Out" button calls POST /api/sessions/checkout with the membership number then dismisses the prompt and shows a check-out confirmation
  - **Requirements**: Requirement 2

- [x] 12. Check-Out Form Page
  - Create app/checkout/page.tsx with a form collecting only the membership number
  - Submit via fetch POST to /api/sessions/checkout
  - On success display a departure confirmation; on HTTP 404 display an informational message that no active session was found; on HTTP 500 display a generic error message
  - **Requirements**: Requirement 3

- [x] 13. Pool Status Page
  - Create app/status/page.tsx as a client component that fetches initial session data from /api/sessions on mount
  - Connect to /api/sse using EventSource; update displayed sessions and occupancy on each received event without a full page reload
  - Display total occupancy (sum of all active party sizes including private) and total checked-in member count prominently
  - For public view render only non-private sessions showing name and party size; for Staff/Admin visually distinguish private sessions with a badge or different row style; for Admin display phone numbers
  - Handle SSE disconnection with automatic reconnect using Last-Event-ID header
  - **Requirements**: Requirements 4, 5, 6, 7, 8

- [x] 14. Property-Based Tests
  - Create tests/pbt/property1.test.ts: generate valid CheckInInput, call checkIn(), verify DB record matches all input fields (Property 1: valid check-in creates persisted active session)
  - Create tests/pbt/property2.test.ts: generate invalid CheckInInput with at least one bad field, call checkIn(), verify session count unchanged (Property 2: invalid inputs rejected without side effects)
  - Create tests/pbt/property3.test.ts: generate active session + checkout request, verify only that session is closed and no others modified (Property 3: check-out closes correct session)
  - Create tests/pbt/property4.test.ts: generate arbitrary set of active sessions, verify occupancy equals sum of party sizes (Property 4: occupancy equals sum of active party sizes)
  - Create tests/pbt/property5.test.ts: generate mixed sessions, request as public role, verify no private sessions and no phone numbers in response (Property 5: public role never receives private session data)
  - Create tests/pbt/property6.test.ts: generate mixed sessions, request as admin and staff, verify all sessions and phone numbers present (Property 6: admin and staff receive all session data)
  - Create tests/pbt/property7.test.ts: generate existing active session, submit check-in with same membership number, verify active session count stays at 1 (Property 7: returning member detection prevents duplicate active sessions)
  - Create tests/pbt/property8.test.ts: generate active session + prompt timeout simulation, verify session remains active and unchanged (Property 8: Session_Prompt timeout leaves session unchanged)
  - Create tests/pbt/property9.test.ts: generate valid CheckInInput, call checkIn(), retrieve session from DB, verify all fields match submitted values (Property 9: check-in data round-trip preserves all fields)
  - Each test tagged with // Feature: pool-management-app, Property N: <property_text> and runs minimum 100 iterations
  - **Requirements**: All

- [x] 15. Integration Tests
  - Create tests/integration/checkin-flow.test.ts: full check-in then GET /api/sessions and verify session appears in response
  - Create tests/integration/checkout-flow.test.ts: check-in then check-out then verify session removed from active list
  - Create tests/integration/role-filtering.test.ts: verify public/staff/admin API responses match the visibility matrix for all fields
  - Create tests/integration/sse-broadcast.test.ts: verify SSE event is emitted within 3 seconds of check-in and check-out events
  - **Requirements**: All

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4"] },
    { "wave": 5, "tasks": ["5", "6"] },
    { "wave": 6, "tasks": ["7", "8", "9"] },
    { "wave": 7, "tasks": ["10", "12", "13"] },
    { "wave": 8, "tasks": ["11"] },
    { "wave": 9, "tasks": ["14"] },
    { "wave": 10, "tasks": ["15"] }
  ]
}
```

## Notes

- Tasks 1–6 are foundational and must be completed in order before UI and API tasks begin.
- Tasks 7, 8, and 9 can be developed in parallel once Tasks 1–6 are complete.
- Tasks 10, 11, 12, and 13 can be developed in parallel once their respective API routes are ready.
- Tasks 14 and 15 depend on all service and API layers being complete.
- The Prisma migration (Task 2.3) requires a running PostgreSQL instance; use a local Docker container or a cloud dev database.
- NextAuth credentials provider uses bcryptjs for password hashing; seed script creates dev users with known passwords.
