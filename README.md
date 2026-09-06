# PeoplePay360 (Odoo HRMS 360)

A full-stack HR Management + Payroll system inspired by Odoo's HR/Payroll suite. It covers the employee lifecycle end-to-end: departments, employees, contracts, work schedules, attendance, time-off, and a rule-based payroll engine that generates, validates, and emails PDF payslips.

**Stack:** React (Vite) frontend · Node.js/Express REST API · PostgreSQL via Prisma ORM · JWT auth · Puppeteer PDF generation · Nodemailer email delivery.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Roles & Permissions](#roles--permissions)

---

## Features

### 👥 Employee & Organization Management
- Full CRUD for **Employees**, including manager hierarchy (reports-to chain), department, job position, employee type (full-time/part-time/contract), and status (active/inactive).
- **Departments** with parent/sub-department hierarchy.
- Per-employee **profile** view (`My Profile`) and detail pages for HR staff.
- **Working Schedules** — define weekly working patterns (day, start/end time, break minutes) with auto-computed total weekly hours; assignable to employees and contracts.
- **Contracts** — start/end dates, wage, job position, linked schedule and salary structure, contract state machine (`draft → active → expired/cancelled`). A **PostgreSQL EXCLUDE constraint** (applied via `afterMigrate.js`) guarantees an employee can never have two overlapping *active* contracts at the database level — not just app-level validation.

### ⏱ Attendance
- Self-service **check-in / check-out** widget for employees.
- Automatic worked-hours calculation, status tagging (present/late/overtime/etc.), and missing-checkout detection.
- HR/Admin **global attendance list** with manual correction support (tracked with `correctedBy`).

### 🌴 Time Off
- Configurable **Time Off Types** (e.g. paid leave, sick leave) with per-type rules: whether it requires an allocation, requires approval, and whether it affects payroll.
- **Allocations** — HR grants a balance (allocated/remaining) to an employee, with an approval workflow.
- **Requests** — employees request time off against an allocation; HR/managers approve, refuse, or the employee can cancel a pending request.
- Dedicated approvals queue for HR Managers/Admins.

### 💰 Payroll Engine
- **Salary Structures** — reusable templates of salary rules assigned to contracts.
- **Salary Rules** — each rule is `fixed`, `percentage-of-another-rule`, or a custom **formula** evaluated with `mathjs`. A sandboxed formula validator only allows arithmetic over previously-computed rule codes (no arbitrary function calls), so payroll formulas can't do anything unsafe. Rules are sequenced so later rules can reference earlier computed totals (e.g. `NET = GROSS - TAX`).
- Live **rule preview** endpoint so HR can test a formula against a sample wage before saving.
- **Payruns** — batch payroll runs for a period and salary structure:
  - pick eligible employees (active contracts in the period),
  - **compute** payslips for every employee via the salary engine,
  - surface **payroll warnings** (e.g. missing contract, negative net pay) with severity levels that must be resolved/acknowledged,
  - **validate** the run, then **mark as paid**,
  - **delete** draft runs.
- **Payslips** — itemized line-by-line breakdown (basic, allowances, deductions, gross, net), downloadable as a **PDF** (rendered server-side with Puppeteer from an HTML payslip template with company logo).
- **Email delivery** — send generated payslip PDFs to employees' work email via Nodemailer (uses an Ethereal test SMTP account in development, so every send has a **preview link** instead of hitting real inboxes); every attempt is logged in `EmailDeliveryLog` with status/error for auditability.
- **Payroll Dashboard** — KPIs, salary cost by department, salary trend over time, attendance and time-off overview, and active alerts, all rendered as charts.

### 🔐 Auth & Access Control
- JWT-based auth with short-lived **access tokens** (15 min, httpOnly cookie or Bearer header) and longer-lived **refresh tokens** (3 days, hashed at rest, revocable).
- **Role-based access control** (RBAC) enforced both in the API (`requireRole` middleware) and in the frontend (route guards + conditional UI).
- **User management** screen (Admin-only) to create logins and link them to employee records.

### 📊 Dashboard
- KPI cards, salary-by-department and salary-trend charts (Recharts), attendance and time-off overview widgets, and system alerts — all fed by dedicated `/api/dashboard/*` aggregation endpoints.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 (Vite build tooling) |
| Routing | React Router v6 |
| HTTP client | Axios |
| Charts | Recharts |
| Icons | lucide-react |
| Backend runtime | Node.js + Express 4 |
| ORM / migrations | Prisma 5 (`@prisma/client`) |
| Database | PostgreSQL |
| Auth | JSON Web Tokens (`jsonwebtoken`), password hashing (`bcryptjs`), httpOnly cookies (`cookie-parser`) |
| Payroll formula engine | `mathjs` (sandboxed expression evaluation) |
| PDF generation | Puppeteer (headless Chromium → payslip PDFs) |
| Email delivery | Nodemailer (Ethereal test SMTP in dev) |
| Dev tooling | nodemon (backend hot reload), Vite dev server (frontend) |

---

## Roles & Permissions

| Role | Access |
|---|---|
| **Admin** | Full access to everything, including User Management |
| **HR Manager** | Employees, Departments, Schedules, Contracts (full write), Time Off approvals/allocations/types |
| **HR Payroll Manager** | Payroll module (structures, rules, payruns, payslips, dashboard) + can mark payruns paid / resolve warnings |
| **HR Payroll User** | Payroll module (structures, rules, payruns, payslips, dashboard) with lighter write access |
| **Employee** | My Profile, self attendance check-in/out, submit & view own time-off requests |

Enforcement happens twice: the **API** rejects unauthorized calls via `authenticate` + `requireRole` middleware, and the **frontend** hides/redirects routes a role shouldn't see via `ProtectedRoute`.

