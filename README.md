# SyncSpace — Enterprise Resource Reservation Management System

SyncSpace is an enterprise-grade resource reservation platform built to streamline and safeguard the scheduling of organizational facilities, collaborative meeting rooms, specialized laboratory equipment, hot desks, and company vehicles. 

SyncSpace guarantees **zero double-bookings** through an atomic conflict detection engine, enforces automated turnover buffers, supports multi-tier administrative approval workflows, and provides real-time cross-resource scheduling matrices.

---

## 1. Key Features

### 1.1. Discovery & Smart Catalog
* **Instant Filtering & Full-Text Search:** Search resources by name, location, equipment specification, or room code (`CR-01`, `LAB-03`). Filter dynamically by category pill, capacity threshold, availability status, or sort order.
* **Asset Detail View:** High-resolution photography, seat limits, physical location maps, buffer requirements, and active maintenance advisories.

### 1.2. Collision-Proof Reservation Engine
* **Atomic Overlap Validation:** Prevents concurrent race conditions and double-bookings at the database layer using transactional isolation and mathematical interval overlap logic (`startTime < existingEnd AND endTime > existingStart`).
* **Turnover Buffers:** Automatically incorporates configurable maintenance/cleaning buffers (e.g., 15 minutes) between bookings to ensure resources are prepped before subsequent sessions.
* **Strict Business Rules:** Rejects past timestamps, enforces a 15-minute minimum duration, limits sessions to a maximum of 8 hours, and enforces a 90-day maximum advance booking window.
* **UTC Native Storage with Local Hydration:** All reservations and maintenance windows are stored strictly in UTC ISO 8601 format in PostgreSQL and dynamically rendered in the client's local timezone.

### 1.3. Multi-Tier Administrative Approval Hub
* **Automated vs. Moderated Booking:** Resources flagged with `requiresApproval` automatically route reservation requests into a `PENDING` queue.
* **One-Click Decisions with Feedback:** Administrators can approve requests to `CONFIRMED` or reject them with mandatory feedback notes detailing the operational reason.
* **Real-Time Notification Badges:** Dynamic badge counts in navigation indicate pending requests requiring immediate review.

### 1.4. Visual Schedule & Master Timeline Matrix
* **Member Day Schedule (`/schedule`):** Interactive 30-minute time slot picker showing real-time slot occupancy, past time slot locking, and instant booking modal integration.
* **Admin Master Calendar (`/admin/calendar`):** 12-hour cross-resource Gantt matrix displaying concurrent reservations, turnover buffers, and maintenance intervals with left-pinned sticky asset headers.

### 1.5. Maintenance Mode & Incident Logging
* **Instant Operational Toggle:** Administrators can place any asset into `MAINTENANCE` with an operational downtime reason.
* **Incident History:** Full audit trail tracking incident reasons, technicians, scheduled service start/end windows, and service notes.

### 1.6. Role-Based Access Control (RBAC) & Persona Switching
* **Interactive Role Switcher:** Toggle seamlessly between `ADMIN` and `MEMBER` via the global top navigation bar to test permissions, approval workflows, and administrative dashboards.

---

## 2. Architecture & Technology Stack

```text
[ Browser / Client Viewports (Mobile, Tablet, Desktop) ]
                           |
                           v
        [ Next.js 16 App Router (React 19 Server Components) ]
                           |
        +------------------+------------------+
        |                                     |
        v                                     v
[ Server Actions (Mutations) ]       [ Server Components (Queries) ]
  - createReservation                  - getResourcesWithFilters
  - cancelReservation                  - getMasterCalendarMatrix
  - approveReservation / reject        - getAdminDashboardMetrics
  - toggleMaintenanceMode              - getAvailableSlots
        |                                     |
        +------------------+------------------+
                           |
                           v
          [ Zod Validation & Conflict Engine ]
          - Mathematical interval overlap check
          - Buffer duration padding
          - Business rules validation
                           |
                           v
               [ Prisma ORM 6.4.1 Client ]
                           |
                           v
             [ PostgreSQL 16 Database ]
          - Composite Index: [resourceId, startTime, endTime]
          - UTC timestamptz storage
          - ON DELETE CASCADE referential integrity
```

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.4.0 (App Router, Webpack) | React 19 Server Components, zero-bundle-size server rendering, native Server Actions. |
| **Language** | TypeScript 5 (Strict Mode) | End-to-end type safety spanning database models, server actions, and UI components. |
| **Database** | PostgreSQL 16 | ACID compliance, transactional concurrency isolation, robust timestamp indexing. |
| **ORM** | Prisma ORM 6.4.1 | Type-safe schema generation, declarative migrations, automated relations and seeding. |
| **Styling** | Tailwind CSS v4 & Lucide Icons | Utility-first styling with modern dark mode support and SVG icon sets. |
| **Validation** | Zod v4 | Runtime schema parsing and input sanitization on all client-server boundaries. |

---

## 3. Database Architecture & ER Diagram

SyncSpace relies on five core entities designed for maximum referential integrity and sub-millisecond query performance.

```
erDiagram
    USER ||--o{ RESERVATION : places
    CATEGORY ||--o{ RESOURCE : contains
    RESOURCE ||--o{ RESERVATION : booked_in
    RESOURCE ||--o{ MAINTENANCE_LOG : undergoes

    USER {
        string id PK "UUID"
        string email UK "Unique Email"
        string name "User Name"
        string role "ADMIN or MEMBER"
        string department "Department"
    }

    CATEGORY {
        string id PK "UUID"
        string name UK "Category Title"
        string slug UK "URL slug"
        string iconName "Lucide icon"
    }

    RESOURCE {
        string id PK "UUID"
        string categoryId FK "Category reference"
        string name "Resource Title"
        string code UK "Unique short code"
        int capacity "Capacity limit"
        string status "AVAILABLE, MAINTENANCE, RETIRED"
        boolean requiresApproval "Approval flag"
        int bufferMinutes "Turnover buffer"
    }

    RESERVATION {
        string id PK "UUID"
        string resourceId FK "Resource reference"
        string userId FK "User reference"
        datetime startTime "UTC interval start"
        datetime endTime "UTC interval end"
        string status "PENDING, CONFIRMED, CANCELLED, REJECTED"
        string rejectionReason "Admin feedback"
    }

    MAINTENANCE_LOG {
        string id PK "UUID"
        string resourceId FK "Resource reference"
        datetime startTime "UTC service start"
        datetime endTime "UTC service end"
        string reason "Maintenance reason"
        string status "SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED"
    }
```

---

## 4. Test Personas & Credentials

SyncSpace provides a pre-configured organizational seed dataset. Authentication role state is managed interactively through the top-bar role selector.

| Name | Email | Role | Department | Testing Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Sarah Jenkins** | `admin@syncspace.io` | `ADMIN` | Operations & Facilities | Approval queue management, resource CRUD, maintenance triggers, and master calendar. |
| **Alex Morgan** | `alex.member@syncspace.io` | `MEMBER` | Software Engineering | Self-service booking, pending status verification, and reservation cancellation. |
| **Elena Rodriguez**| `elena.rodriguez@syncspace.io` | `MEMBER` | Product Design | Multi-user booking conflict validation and schedule inspection. |
| **David Kim** | `david.kim@syncspace.io` | `MEMBER` | Data Science & AI | High-demand GPU compute server reservation scenarios. |

---

## 5. Step-by-Step Setup Guide

### 5.1. Prerequisites
* **Node.js:** `v20.x` or `v22.x` (LTS recommended)
* **PostgreSQL:** Local installation or Docker container
* **Git:** Version control

### 5.2. Clone & Install Dependencies
```bash
git clone https://github.com/DilumPal/Resource-Resevation-System.git
cd "Resource Resevation System"
npm install
```

### 5.3. Environment Configuration
Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Ensure `DATABASE_URL` points to your PostgreSQL database:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/resource_reservation_db?schema=public"
NEXT_PUBLIC_APP_NAME="SyncSpace Resource Reservation System"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5.4. Start PostgreSQL via Docker (Optional)
If you do not have a local PostgreSQL instance running, use the provided `docker-compose.yml`:

```bash
docker compose up -d
```

### 5.5. Database Migration & Seeding
Push the Prisma schema to PostgreSQL and populate the database with users, categories, resources, reservations, and maintenance logs:

```bash
npx prisma db push
npx prisma db seed
```

### 5.6. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5.7. Production Build
To create an optimized production build:
```bash
npm run build
npm run start
```

---

## 6. Automated Verification & Test Suites

SyncSpace includes automated test suites covering all business logic, timezone standardization, conflict algorithms, and server actions.

### 6.1. Run Business Rules & Limits Test
```bash
npm test
```
*Validates past booking rejection, 15-minute minimum duration, 8-hour maximum limit, inverted ranges, and 90-day advance booking horizon.*

### 6.2. Run All Automated Test Suites
```bash
npm run test:all
```

Individual test suites can also be executed directly:

| Test Suite | Execution Command | Coverage |
| :--- | :--- | :--- |
| **Business Rules** | `npx tsx src/lib/booking/business-rules.test.ts` | Enforces duration limits, past booking guards, and advance constraints. |
| **Timezone & UTC** | `npx tsx src/lib/timezone.test.ts` | Verifies UTC ISO storage, offset math, and cross-timezone day boundaries. |
| **Conflict Engine** | `npx tsx src/lib/booking/conflict-engine.test.ts` | Validates collision logic, buffer padding, and maintenance conflicts. |
| **Resource CRUD** | `npx tsx src/actions/crud.test.ts` | Validates resource creation, updates, and archival soft-deletes. |
| **Approval Hub** | `npx tsx src/actions/approval.test.ts` | Validates approve/reject state transitions and feedback logging. |
| **Maintenance** | `npx tsx src/actions/maintenance.test.ts` | Validates maintenance toggles, reason capture, and schedule conflicts. |
| **Master Calendar** | `npx tsx src/actions/calendar.test.ts` | Validates timeline matrix slot mapping and resource occupancy queries. |

---

## 7. Key Architectural & Design Decisions

### 7.1. Atomic Conflict Prevention vs. Optimistic UI
* **Design Decision:** Conflict checks occur at two distinct stages: (1) client-side in the `BookingModal` for immediate user feedback, and (2) inside the atomic server action `createReservation`.
* **Rationale:** Client-side checks improve user experience by preventing invalid form submissions. However, server-side transactional checks are mandatory to eliminate race conditions when two users click book at the exact same millisecond.

### 7.2. UTC Standardization with Localized Hydration
* **Design Decision:** The PostgreSQL database strictly stores timestamps as UTC ISO strings (`timestamptz`). Client components receive ISO strings and format them dynamically using browser `Intl.DateTimeFormat`.
* **Rationale:** Storing local server times creates ambiguity across Daylight Saving Time (DST) shifts and distributed teams. Standardizing on UTC guarantees universal chronological consistency.

### 7.3. Buffer Minutes Architecture
* **Design Decision:** Resources define an optional `bufferMinutes` integer (e.g., 15 minutes). The conflict engine expands the collision check interval:
  $$\text{Effective Start} = \text{Reservation Start} - \text{Buffer}$$
  $$\text{Effective End} = \text{Reservation End} + \text{Buffer}$$
* **Rationale:** Facilities require turnover, cleaning, and tech resets between meetings. Hardcoding buffers into the conflict equation guarantees that reservations cannot be booked back-to-back without sufficient turnaround.

### 7.4. Server Actions over REST / tRPC
* **Design Decision:** Next.js Server Actions are used for all mutations (`createReservation`, `cancelReservation`, `approveReservation`, `toggleMaintenanceMode`).
* **Rationale:** Server Actions eliminate API routing boilerplate, provide end-to-end TypeScript type inference directly from Prisma models, and execute directly within the Node.js server runtime without exposing public API endpoints.

---

## 8. Repository File Structure

```text
Resource Resevation System/
├── docs/
│   └── ER_DIAGRAM.md               # Complete database schema & ER diagram documentation
├── prisma/
│   ├── schema.prisma               # Prisma data models, enums, indexes, and relations
│   └── seed.ts                     # Database seeder with realistic organizational datasets
├── public/                         # Static assets and icons
├── src/
│   ├── actions/                    # Next.js Server Actions
│   │   ├── approval.ts             # Reservation approval and rejection workflows
│   │   ├── calendar.ts             # Master calendar matrix queries
│   │   ├── crud.ts                 # Resource create, edit, and archive handlers
│   │   ├── maintenance.ts          # Maintenance mode toggles and log recording
│   │   └── reservations.ts         # Atomic reservation booking and cancellation
│   ├── app/                        # Next.js App Router pages
│   │   ├── layout.tsx              # Root layout with responsive navbar and role switcher
│   │   ├── page.tsx                # Home: Catalog grid, category filters, and search
│   │   ├── admin/                  # Admin Hub: Analytics, approvals, and resource CRUD
│   │   ├── admin/calendar/         # Master Calendar: Cross-resource 12-hour matrix
│   │   ├── my-reservations/        # Member reservation management tabbed view
│   │   ├── resources/[id]/         # Detailed resource asset view
│   │   └── schedule/               # Interactive 30-minute day scheduling grid
│   ├── components/                 # Reusable UI components
│   │   ├── admin/                  # AnalyticsDashboard, ApprovalHub, MasterCalendar, ResourceModal
│   │   ├── booking/                # BookingModal, ConflictWarning, DurationPicker
│   │   ├── common/                 # Navigation, TimeDisplay, ThemeToggle, RoleSwitcher
│   │   ├── resources/              # ResourceCard, ResourceFilters, ResourceGrid
│   │   └── schedule/               # VisualSchedule, TimeSlotGrid
│   ├── context/                    # React Context providers (RoleContext, ThemeContext)
│   └── lib/                        # Shared utility functions and domain logic
│       ├── prisma.ts               # Singleton Prisma client instance
│       ├── timezone.ts             # UTC conversion and localized formatting helpers
│       ├── utils.ts                # Tailwind class mergers and UI formatters
│       └── booking/
│           ├── business-rules.ts   # Duration limits, past time, and advance policies
│           └── conflict-engine.ts  # Mathematical interval collision engine
├── docker-compose.yml              # PostgreSQL container configuration
├── package.json                    # Project dependencies and script commands
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # Main project documentation
```

---
