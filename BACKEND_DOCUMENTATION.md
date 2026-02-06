
# EduAi System Backend Documentation

## 1. Architecture Overview
The EduAi platform utilizes a modern serverless architecture designed for high scalability and multi-tenant isolation.

- **Frontend**: React 19 (ES6 Modules)
- **API Runtime**: Node.js 20+ (Vercel Serverless Functions)
- **Primary Database**: PostgreSQL (Hosted via Supabase)
- **AI Intelligence**: Google Gemini API (Pro and Flash models)
- **Payment Gateway**: Safaricom M-Pesa Daraja API (PRODUCTION READY)
- **Communication**: SMTP (Email) and ABMIS/Zettatel SMS Gateway

---

## 2. Data Models (PostgreSQL Schema)

### 2.1 Core Tenancy
- **`institutions`**: The root entity. Stores branding (logos, colors), subscription status (`trial`, `active`, `suspended`), and global configuration.
- **`system_settings`**: Global platform-wide settings managed by the Super Admin.

### 2.2 User Management
- **`users`**: Unified table for all roles. 
  - *Attributes*: `role`, `expertise` (array), `unavailability` (JSONB), `enrolled_subject_ids` (array).

### 2.3 Academic Registry
- **`departments`**: Organizational units within an institution.
- **`courses`**: Academic programs or School Grades.
- **`subjects`**: Specific units of learning. Contains `lesson_structure` (JSONB) defining weekly period requirements.
- **`allocation_requests`**: Requests from lecturers to teach specific subjects.

### 2.4 Scheduling
- **`timetable_entries`**: Maps `day`, `start_time`, `end_time` to a `subject`, `lecturer`, and `room`.

---

## 3. API Architecture

Endpoints are structured under `/api` and executed as stateless serverless functions.

### 3.1 Resource Endpoints
- `GET /api/allocations`: Fetches requests for a specific tenant.
- `POST /api/allocations`: Submits new lecturer requests.
- `PATCH /api/allocations`: Updates status (Approve/Reject).

### 3.2 Integration Gateway (`/api/integrations`)
Handles all external third-party handshakes.

#### M-Pesa STK Push Workflow (PRODUCTION):
1. **Automatic Token Fetching**: The API uses the `consumerKey` and `consumerSecret` to call Safaricom's production OAuth endpoint:
   ```typescript
   const auth = Buffer.from(`${key}:${secret}`).toString('base64');
   const res = await fetch("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
       headers: { "Authorization": `Basic ${auth}` }
   });
   const { access_token } = await res.json();
   ```
2. **STK Push Request**: The `access_token` is then automatically injected into the `Authorization` header for the push request to `https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest`:
   ```typescript
   headers: { "Authorization": `Bearer ${access_token}` }
   ```

---

## 4. Business Logic: The AI Orchestrator

The system utilizes `geminiService.ts` to bridge data and reasoning.

### 4.1 Timetable Generation Algorithm
1. **Context Loading**: Gathers approved allocations, lesson structures, and constraints.
2. **Neural Optimization**: `gemini-3-pro-preview` finds a zero-conflict solution.
3. **Validation**: JSON output is validated before being persisted to `timetable_entries`.

---

## 5. Security & Isolation
- **Tenant Isolation**: Every SQL query is filtered by `institution_id`.
- **Credential Storage**: Sensitive keys are stored as Vercel environment variables.
- **Audit Trail**: Administrative changes are recorded in the `activity_log`.
