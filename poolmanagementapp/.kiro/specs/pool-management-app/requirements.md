# Requirements Document

## Introduction

The Pool Management App is a web application that enables members to check in and out of a pool facility, tracks real-time occupancy, and provides role-based visibility into session data. Members submit arrival and departure information through a form-based interface. Staff and admins have elevated access to private session data and contact information. A public-facing pool status page displays current occupancy and non-private member sessions, updating in real time.

## Glossary

- **System**: The Pool Management App web application
- **Member**: A registered pool facility user who can check in and out
- **Session**: A single check-in record representing a member's current or past visit
- **Party_Size**: The number of people in a member's group, including the member
- **Membership_Number**: A numeric identifier uniquely associated with a member
- **Private_Session**: A session marked by the member to hide their personal details from the public status page
- **Pool_Status_Page**: The publicly accessible page displaying current occupancy and checked-in members
- **Admin**: A user with the highest privilege role; can view all session data including private sessions and phone numbers
- **Staff**: A user with elevated privilege; can view all sessions including private ones but not phone numbers
- **Public_User**: An unauthenticated or non-privileged visitor to the Pool_Status_Page
- **Validator**: The system component responsible for validating form input
- **Check_In_Form**: The form submitted by a member to register their arrival
- **Returning_Member_Prompt**: The dialog shown when a member with an active session attempts to check in again
- **SSE**: Server-Sent Events, the real-time push mechanism used to update the Pool_Status_Page
- **ORM**: Object-Relational Mapper (Prisma) used to interact with the PostgreSQL database

---

## Requirements

### Requirement 1: Member Check-In

**User Story:** As a member, I want to register my arrival at the pool by submitting a form, so that my visit is recorded and I appear on the pool status page.

#### Acceptance Criteria

1. THE Check_In_Form SHALL collect the member's full name, Membership_Number, phone number, Party_Size, and an optional private session flag.
2. WHEN a member submits the Check_In_Form, THE Validator SHALL reject any submission where the Membership_Number contains non-numeric characters.
3. WHEN a member submits the Check_In_Form, THE Validator SHALL reject any submission where the phone number is not exactly 10 digits.
4. WHEN a member submits the Check_In_Form, THE Validator SHALL reject any submission where the Party_Size is not a positive integer between 1 and 20 inclusive.
5. WHEN a member submits a valid Check_In_Form and no active Session exists for that Membership_Number, THE System SHALL persist the Session to the database before returning a success response.
6. WHEN a member submits a valid Check_In_Form and no active Session exists for that Membership_Number, THE System SHALL display a confirmation to the member.
7. IF the database write fails during check-in, THEN THE System SHALL return an error response and SHALL NOT display a success confirmation.

---

### Requirement 2: Returning Member Detection

**User Story:** As a member, I want the system to detect if I am already checked in, so that I can choose to continue my session or check out instead of creating a duplicate record.

#### Acceptance Criteria

1. WHEN a member submits the Check_In_Form with a Membership_Number that already has an active Session, THE System SHALL display the Returning_Member_Prompt instead of creating a new Session.
2. WHEN the Returning_Member_Prompt is displayed, THE System SHALL present the member with two options: "Continue Session" and "Check Out".
3. WHEN a member selects "Continue Session" from the Returning_Member_Prompt, THE System SHALL dismiss the prompt and retain the existing active Session unchanged.
4. WHEN a member selects "Check Out" from the Returning_Member_Prompt, THE System SHALL record the check-out time and mark the Session as inactive.
5. WHEN the Returning_Member_Prompt has been displayed for 60 seconds without a member response, THE System SHALL automatically dismiss the prompt and retain the existing active Session unchanged.

---

### Requirement 3: Member Check-Out

**User Story:** As a member, I want to record my departure from the pool, so that the occupancy count is updated and my session is closed.

#### Acceptance Criteria

1. WHEN a member submits a check-out request with a valid Membership_Number that has an active Session, THE System SHALL persist the check-out timestamp to the database before returning a success response.
2. WHEN a check-out is successfully persisted, THE System SHALL mark the Session as inactive.
3. WHEN a check-out is successfully persisted, THE Pool_Status_Page SHALL reflect the updated occupancy within 3 seconds.
4. IF a member submits a check-out request for a Membership_Number with no active Session, THEN THE System SHALL return an informational message indicating no active session was found.
5. IF the database write fails during check-out, THEN THE System SHALL return an error response and SHALL NOT mark the Session as inactive.

---

### Requirement 4: Private Sessions

**User Story:** As a member, I want to mark my session as private, so that my personal information is hidden from the public pool status page.

#### Acceptance Criteria

1. THE Check_In_Form SHALL include an opt-in toggle or checkbox allowing the member to mark their Session as private.
2. WHEN a member checks in with the private flag enabled, THE System SHALL store the private flag as true on the Session record.
3. WHILE a Session is marked as private, THE System SHALL exclude that Session's member name and party size from data returned to Public_Users on the Pool_Status_Page.
4. WHILE a Session is marked as private, THE System SHALL include that Session's full details in data returned to Admin and Staff users.
5. WHILE a Session is marked as private, THE System SHALL include that Session's Party_Size in the total occupancy count displayed to all users.

---

### Requirement 5: Pool Status Page — Public View

**User Story:** As a public user, I want to view the current pool occupancy and non-private member sessions, so that I can see how busy the pool is before visiting.

#### Acceptance Criteria

1. THE Pool_Status_Page SHALL display the total number of currently checked-in members across all active Sessions.
2. THE Pool_Status_Page SHALL display the total Party_Size count across all active Sessions as the current occupancy figure.
3. WHEN the Pool_Status_Page is viewed by a Public_User, THE System SHALL display only Sessions where the private flag is false, showing member name and party size.
4. WHEN the Pool_Status_Page is viewed by a Public_User, THE System SHALL NOT display phone numbers for any Session.
5. WHEN a Session becomes inactive due to check-out, THE Pool_Status_Page SHALL update to remove that Session within 3 seconds via SSE.
6. WHEN a new Session is created via check-in, THE Pool_Status_Page SHALL update to include that Session within 3 seconds via SSE.

---

### Requirement 6: Pool Status Page — Admin and Staff View

**User Story:** As a staff member or admin, I want to see all sessions including private ones, so that I can accurately manage pool occupancy and member safety.

#### Acceptance Criteria

1. WHEN the Pool_Status_Page is viewed by a Staff user, THE System SHALL display all active Sessions including those marked as private.
2. WHEN the Pool_Status_Page is viewed by a Staff user, THE System SHALL NOT display phone numbers for any Session.
3. WHEN the Pool_Status_Page is viewed by an Admin user, THE System SHALL display all active Sessions including those marked as private.
4. WHEN the Pool_Status_Page is viewed by an Admin user, THE System SHALL display the phone number for each Session.
5. WHEN a Session is marked as private and viewed by Staff or Admin, THE System SHALL visually distinguish it from non-private Sessions.

---

### Requirement 7: Role-Based Access Control

**User Story:** As a system administrator, I want role-based access control enforced on all data endpoints, so that sensitive member information is only accessible to authorized users.

#### Acceptance Criteria

1. THE System SHALL support three roles: admin, staff, and public.
2. WHEN an unauthenticated request is made to an endpoint that returns phone numbers, THE System SHALL return a 401 or 403 response.
3. WHEN a staff-authenticated request is made to the pool status data endpoint, THE System SHALL return all Sessions but SHALL omit phone numbers.
4. WHEN an admin-authenticated request is made to the pool status data endpoint, THE System SHALL return all Sessions including phone numbers.
5. WHEN a public or unauthenticated request is made to the pool status data endpoint, THE System SHALL return only non-private Sessions and SHALL omit phone numbers.
6. IF a request is made with an invalid or expired authentication token, THEN THE System SHALL return a 401 response.

---

### Requirement 8: Real-Time Updates via SSE

**User Story:** As a pool status page viewer, I want the page to update automatically when members check in or out, so that I always see current occupancy without refreshing.

#### Acceptance Criteria

1. THE System SHALL provide an SSE endpoint that pushes events to connected clients when a Session is created or updated.
2. WHEN a check-in or check-out event occurs, THE System SHALL emit an SSE event to all connected clients within 3 seconds.
3. WHEN an SSE client receives an event, THE Pool_Status_Page SHALL update the displayed occupancy and member list without a full page reload.
4. WHEN an SSE connection is established by a Public_User, THE System SHALL filter emitted events to exclude private Session details.
5. WHEN an SSE connection is established by a Staff user, THE System SHALL include all Session details except phone numbers in emitted events.
6. WHEN an SSE connection is established by an Admin user, THE System SHALL include all Session details including phone numbers in emitted events.

---

### Requirement 9: Data Persistence Guarantee

**User Story:** As a pool operator, I want all check-in and check-out data to be reliably persisted before any success response is returned, so that no session data is lost due to timing issues.

#### Acceptance Criteria

1. WHEN a check-in request is processed, THE System SHALL complete the database write via the ORM before sending an HTTP success response.
2. WHEN a check-out request is processed, THE System SHALL complete the database write via the ORM before sending an HTTP success response.
3. IF a database write fails for any reason, THEN THE System SHALL return an HTTP 500 error response and SHALL NOT send a success response.
4. THE System SHALL use database transactions for check-in and check-out operations to ensure atomicity.

---

### Requirement 10: Input Validation

**User Story:** As a system operator, I want all form inputs validated before processing, so that invalid data never reaches the database.

#### Acceptance Criteria

1. WHEN a Check_In_Form is submitted, THE Validator SHALL verify that the member name is a non-empty string.
2. WHEN a Check_In_Form is submitted, THE Validator SHALL verify that the Membership_Number contains only numeric characters.
3. WHEN a Check_In_Form is submitted, THE Validator SHALL verify that the phone number consists of exactly 10 numeric digits.
4. WHEN a Check_In_Form is submitted, THE Validator SHALL verify that the Party_Size is an integer with a value between 1 and 20 inclusive.
5. IF any validation rule fails, THEN THE Validator SHALL return a descriptive error message identifying the specific field and rule that was violated.
6. IF any validation rule fails, THEN THE System SHALL NOT persist any data to the database.
