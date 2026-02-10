# M-Pesa Integration Infrastructure

This document details the architecture, implementation, and security of the M-Pesa payment integration within EduAlloc AI.

## 1. Integration Logic Flow

The integration uses Safaricom's **Daraja API (v2)** to facilitate STK Push (Lipa Na M-Pesa Online) payments.

### Step 1: Authentication (OAuth 2.0)
- The system generates an access token using the `Consumer Key` and `Consumer Secret`.
- Token generation is handled securely in `api/integrations.ts`.
- Tokens are cached/requested per initiation to ensure validity.

### Step 2: Initiation (STK Push)
- **Frontend**: The `PayNowModal.tsx` collects the phone number and amount.
- **Backend API**: Calls the `/api/integrations` endpoint with action `initiateStkPush`.
- **Database Entry**: A record is created in `mpesa_transactions` with status `pending` and `checkout_request_id`.
- **Safaricom Request**: The backend sends a request to `https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest` (or Production URL) including the `BusinessShortCode`, `Password` (Base64 of ShortCode + Passkey + Timestamp), and `CallBackURL`.

### Step 3: Callback Processing (M-Pesa Webhook)
- Once the user enters their PIN, Safaricom sends a POST request to `api/mpesa-callback.ts`.
- **Validation**: The handler matches the `CheckoutRequestID` received from Safaricom with the pending record in our database.
- **Data Extraction**: The handler extracts `MpesaReceiptNumber`, `Amount`, and `TransactionDate` from the `CallbackMetadata`.

### Step 4: Side-Effects & Business Logic
Based on the `metadata` passed during initiation:
- **Subscription Renewal**: If `metadata.type === 'subscription'`, the system calculates the new expiry date and updates the `institutions` table.
- **Invoice Payment**: If `metadata.type === 'invoice'`, it marks the `invoice` as `paid` and automatically generates a `receipt` record.

### Step 5: Frontend Updates (Polling)
- The frontend doesn't wait indefinitely for the webhook.
- It uses `apiService.checkMpesaStatus(checkoutRequestId)` to poll the database every 3 seconds for up to 60 seconds.
- Once the status changes from `pending` to `completed` (updated by the callback), the UI provides instant success feedback.

---

## 2. Database Schema (`mpesa_transactions`)

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Internal unique ID. |
| `transaction_id` | TEXT | Safaricom's `MpesaReceiptNumber` (e.g., RKJ32G4H5). |
| `checkout_request_id` | TEXT (Unique) | Links initiation to callback. |
| `institution_id` | TEXT (FK) | References the institution making the payment. |
| `amount` | DECIMAL | The transaction amount. |
| `phone_number` | TEXT | The payer's phone number. |
| `status` | TEXT | `pending`, `completed`, or `failed`. |
| `metadata` | JSONB | Stores intent (e.g., `{type: "invoice", invoiceId: "..."}`). |
| `timestamp` | TIMESTAMP | When the transaction was confirmed. |

---

## 3. Security Measures

1.  **Server-Side Execution**: All M-Pesa credentials (Consumer Key, Consumer Secret, Passkey) are kept on the server environment. The frontend never sees these.
2.  **HTTPS Webhooks**: Safaricom callbacks are only accepted over secure HTTPS connections.
3.  **Atomic Updates**: Database transactions are used to ensure that a confirmed payment always results in the corresponding service (subscription or receipt) being updated correctly.
4.  **Phone Normalization**: Input phone numbers are automatically cleaned to the `2547XXXXXXXX` format required by Daraja.

---

## 4. Environment Configuration

To enable M-Pesa, the following environment variables must be populated:
```env
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_PASSKEY=your_passkey
MPESA_PAYBILL_OR_TILL=your_shortcode
MPESA_CALLBACK_URL=https://your-api.com/api/mpesa-callback
```

---

## 5. Manual Reconciliation
In cases where a callback is missed (e.g., network timeout), administrators can manually check the `mpesa_transactions` table using the `CheckoutRequestID` to reconcile payments against the Safaricom portal.
