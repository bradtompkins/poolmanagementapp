# Product Overview

**Pool Management App** is a web application for managing member check-ins and check-outs at a pool facility.

## Core Features

- **Member Check-In**: Members register their arrival by submitting a form with name, membership number, phone number, and party size.
- **Member Check-Out**: Members record their departure; the pool status updates in real time.
- **Returning Member Detection**: If a member is already checked in, the system prompts them to continue their session or check out.
- **Private Sessions**: Members can hide their information from the public pool status page.
- **Pool Status Page**: Displays currently checked-in members with occupancy metrics. Admins/staff see all records including private sessions; public users see only non-private records.
- **Role-Based Visibility**: Admin and staff roles have elevated access to private session data and phone numbers.

## Key Business Rules

- Party size must be a positive integer between 1 and 20.
- Membership numbers must be numeric; phone numbers must be exactly 10 digits.
- All check-in/check-out data must be persisted to a database before a success response is returned.
- Pool status page updates must reflect check-out within 3 seconds.
- Unanswered "Continue Session / Check Out" prompts auto-dismiss after 60 seconds.

## Target Users

- **Members**: Check in and out, optionally mark sessions as private.
- **Staff**: View all sessions including private ones; manage pool occupancy.
- **Admins**: Full access including phone numbers and private session data.
- **Public**: View non-private pool status and occupancy metrics.
