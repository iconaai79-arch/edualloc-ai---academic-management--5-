# System Infrastructure & Architecture

This document provides a high-level overview of the **EduAlloc AI** infrastructure, including the frontend, backend, database, and external integrations.

## 1. System Overview

EduAlloc AI is built as a modern web application with a decoupled architecture:
- **Frontend**: Single Page Application (SPA) built with React and Tailwind CSS.
- **Backend**: Serverless Functions (Node.js/TypeScript) for secure integrations and business logic.
- **Database**: Supabase (PostgreSQL) for data persistence, authentication, and real-time features.
- **Integrations**: Third-party services for payments (M-Pesa), messaging (SMS), and notifications (Email).

---

## 2. Infrastructure Components

### A. Frontend (React SPA)
- **Framework**: React 18+
- **Styling**: Tailwind CSS for responsive and modern UI.
- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback).
- **Client**: Supabase JS Client for direct database interaction following RLS (Row Level Security) policies.
- **Deployment**: Optimized for Vercel, Netlify, or static hosting.

### B. Backend (Serverless Functions)
The backend is located in the `/api` directory and consists of TypeScript-based serverless functions that handle sensitive operations:
- **`api/integrations.ts`**: Central hub for SMS (ABMIS, Safaricom), Email (Nodemailer), and M-Pesa STK Push initialization.
- **`api/mpesa-callback.ts`**: Secure webhook endpoint that receives payment notifications from Safaricom Daraja API.
- **`api/execute_sql.ts`**: (Restricted) Managed utility for schema initialization and migrations.

### C. Database (Supabase / PostgreSQL)
- **Engine**: PostgreSQL 15+
- **Features Used**:
    - **Tables**: Normalized schema for Institutions, Users, Academic structures, and Finance.
    - **JSONB**: Used for flexible metadata storage in transactions and settings.
    - **RLS (Row Level Security)**: Ensures multi-tenancy by isolating data between different institutions.
    - **Functions/Triggers**: (Future) For automated status updates and audit logs.

### D. External Services
| Service | Provider | Purpose |
| :--- | :--- | :--- |
| **Database/Auth** | Supabase | Storage, User Auth, and PostgreSQL hosting. |
| **Payment Gateway** | Safaricom (M-Pesa) | STK Push payments for subscriptions and school fees via Daraja API. |
| **SMS Gateway** | Various (ABMIS/Africa's Talking) | Notifications for attendance, fees, and system alerts. |
| **Email Service** | SMTP (Nodemailer) | Invoicing, password resets, and official communication. |

---

## 3. Communication Flow

### Payment Flow (M-Pesa)
1. **Initiation**: User clicks "Pay" -> Frontend calls `/api/integrations` (initiateStkPush).
2. **Push**: Serverless function requests STK Push from Safaricom.
3. **User Action**: User enters PIN on their phone.
4. **Callback**: Safaricom sends Result to `/api/mpesa-callback`.
5. **Processing**: Callback handler updates `mpesa_transactions`, creates `receipts`, and extends `subscriptions`.
6. **UI Sync**: Frontend polls `/api/apiService.ts` (checkMpesaStatus) to show success to the user.

### Data Security
- **API Keys**: Stored in Environment Variables (`SUPABASE_SERVICE_ROLE_KEY`, `MPESA_CONSUMER_SECRET`) and never exposed to the frontend.
- **Multi-Tenancy**: Every database query is filtered by `institution_id` either via the application layer or Supabase RLS.

---

## 4. Environment Variables

Key variables required for the infrastructure to function:
```env
# Supabase
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# M-Pesa
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_PAYBILL=...

# Application
APP_URL=https://your-domain.com
```

---

## 5. Scalability
- **Horizontal Scaling**: Serverless functions automatically scale based on request volume.
- **Database Scaling**: Supabase (PostgreSQL) handles concurrent connections and large datasets efficiently.
- **CDN**: Frontend assets are served via global CDNs for low latency.
