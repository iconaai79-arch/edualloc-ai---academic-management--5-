# M-Pesa Payment Flow for Tenant Subscription

## Overview
This document explains how the M-Pesa integration works for **automatic tenant subscription payments and account reactivation**.

## Purpose
The main purpose of the M-Pesa integration is to:
1. **Send STK Push** to tenant's phone for payment
2. **Automatically reactivate** the tenant's account upon successful payment
3. **Extend subscription** period based on the selected plan (monthly/yearly)

---

## Complete Payment Flow

### Step 1: User Initiates Payment
**Location:** `src/components/PayNowModal.tsx`

1. Tenant selects a subscription plan (Monthly or Yearly)
2. Enters their M-Pesa phone number (format: 254XXXXXXXXX)
3. Enters their name
4. Clicks "Pay" button

### Step 2: STK Push Request
**Location:** `api/integrations.ts` (action: `initiateStkPush`)

**Process:**
1. Frontend calls `apiService.initiateMpesaPayment()`
2. Backend authenticates with Safaricom Daraja API
3. Backend sends STK Push request to tenant's phone
4. A **pending transaction** is created in `mpesa_transactions` table with:
   - `checkout_request_id`: Unique identifier from Safaricom
   - `status`: 'pending'
   - `metadata`: Contains subscription plan info (monthly/yearly)
   - `institution_id`: The tenant's institution ID
   - `amount`: Payment amount
   - `phone_number`: Tenant's phone number

**Response:**
- User receives M-Pesa PIN prompt on their phone
- Frontend shows "STK Push Sent! Enter your M-Pesa PIN on your phone"

### Step 3: User Completes Payment
**User Action:**
1. User receives M-Pesa prompt on their phone
2. User enters their M-Pesa PIN
3. User confirms payment

### Step 4: Safaricom Sends Callback
**Location:** `api/mpesa-callback.ts`

**When:** Immediately after user confirms or cancels payment

**Callback Structure:**
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "...",
      "CheckoutRequestID": "ws_CO_...",
      "ResultCode": "0",  // 0 = success, other = failed
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 500 },
          { "Name": "MpesaReceiptNumber", "Value": "QGR7..." },
          { "Name": "TransactionDate", "Value": 20260210143000 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}
```

### Step 5: Automatic Account Reactivation
**Location:** `api/mpesa-callback.ts`

**If Payment Successful (ResultCode = "0"):**

1. **Update Transaction Status**
   ```typescript
   // Mark transaction as completed
   UPDATE mpesa_transactions 
   SET status = 'completed', 
       transaction_id = 'QGR7...' // M-Pesa receipt number
   WHERE checkout_request_id = 'ws_CO_...'
   ```

2. **Calculate Subscription Extension**
   ```typescript
   const days = metadata.plan === 'monthly' ? 30 : 365;
   ```

3. **Reactivate Account & Extend Subscription**
   ```typescript
   // Get current subscription end date
   const currentEnd = institution.subscription_ends_at || new Date();
   
   // Extend from whichever is later: current end or now
   const baseDate = Math.max(currentEnd.getTime(), Date.now());
   const newEndDate = new Date(baseDate + (days * 24 * 60 * 60 * 1000));
   
   // Update institution
   UPDATE institutions 
   SET status = 'active',  // ✅ REACTIVATE ACCOUNT
       subscription_ends_at = newEndDate
   WHERE id = institution_id
   ```

**If Payment Failed:**
```typescript
// Mark transaction as failed
UPDATE mpesa_transactions 
SET status = 'failed'
WHERE checkout_request_id = 'ws_CO_...'
```

### Step 6: Frontend Polling (Optional)
**Location:** `src/components/PayNowModal.tsx`

While waiting for callback, frontend can poll transaction status:
```typescript
// Poll every 3 seconds, max 40 attempts (~2 minutes)
const { status } = await apiService.checkMpesaStatus(checkoutRequestId);

if (status === 'completed') {
  // Show success message
  // Reload user data to reflect active subscription
}
```

---

## Database Schema

### mpesa_transactions Table
```sql
CREATE TABLE mpesa_transactions (
    id TEXT PRIMARY KEY,
    transaction_id TEXT UNIQUE NOT NULL,        -- M-Pesa receipt number
    checkout_request_id TEXT UNIQUE,            -- Safaricom checkout ID
    institution_id TEXT NOT NULL,               -- Tenant institution
    amount DECIMAL(12, 2) NOT NULL,             -- Payment amount
    phone_number TEXT NOT NULL,                 -- Payer's phone
    payer_name TEXT,                            -- Payer's name
    timestamp TIMESTAMP WITH TIME ZONE,         -- Transaction time
    status TEXT NOT NULL,                       -- pending/completed/failed
    metadata JSONB                              -- { type: 'subscription', plan: 'monthly' }
);
```

### institutions Table (Relevant Fields)
```sql
CREATE TABLE institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'trial',                -- trial/active/suspended
    subscription_ends_at TIMESTAMP,             -- Subscription expiry date
    trial_ends_at TIMESTAMP,
    ...
);
```

---

## Configuration Requirements

### Environment Variables
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# M-Pesa Credentials (stored in system_settings table)
# These are configured via Super Admin settings
```

### System Settings (Super Admin)
The M-Pesa configuration is stored in `system_settings` table:
```json
{
  "mpesa_config": {
    "consumer_key": "your_consumer_key",
    "consumer_secret": "your_consumer_secret",
    "paybill_number": "174379",
    "passkey": "your_passkey",
    "environment": "production"  // or "sandbox"
  }
}
```

### Callback URL Configuration
**Important:** Register this callback URL in your Safaricom Daraja account:
```
https://your-domain.com/api/mpesa-callback
```

---

## Payment Scenarios

### Scenario 1: New Subscription (Trial Expired)
- **Before:** `status = 'trial'`, `subscription_ends_at = null`
- **After Payment:** `status = 'active'`, `subscription_ends_at = now + 30 days`

### Scenario 2: Renewal Before Expiry
- **Before:** `status = 'active'`, `subscription_ends_at = 2026-02-20`
- **After Payment:** `status = 'active'`, `subscription_ends_at = 2026-03-22` (extended from current end)

### Scenario 3: Renewal After Expiry
- **Before:** `status = 'suspended'`, `subscription_ends_at = 2026-02-01` (expired)
- **After Payment:** `status = 'active'`, `subscription_ends_at = now + 30 days` (reactivated)

### Scenario 4: Yearly Subscription
- **Before:** `status = 'active'`, `subscription_ends_at = 2026-02-20`
- **After Payment:** `status = 'active'`, `subscription_ends_at = 2027-02-20` (extended by 365 days)

---

## Testing

### Sandbox Testing
Use Safaricom's sandbox credentials and test phone numbers:
- **Test Phone:** 254708374149
- **Test PIN:** Any 4 digits

### Production Testing
1. Configure production credentials in Super Admin settings
2. Use real Kenyan phone numbers (254XXXXXXXXX)
3. Monitor callback logs in Vercel/server logs

---

## Error Handling

### Common Errors

1. **"Configuration Error"**
   - **Cause:** M-Pesa credentials not configured
   - **Solution:** Configure in Super Admin > System Settings > M-Pesa

2. **"Auth Failed"**
   - **Cause:** Invalid consumer key/secret
   - **Solution:** Verify credentials with Safaricom

3. **"Transaction not found"**
   - **Cause:** Callback received for unknown transaction
   - **Solution:** Check database for pending transactions

4. **"Push rejected by gateway"**
   - **Cause:** Invalid phone number or insufficient funds
   - **Solution:** Verify phone number format and balance

---

## Monitoring & Logs

### Backend Logs
All M-Pesa operations are logged with prefixes:
- `[M-Pesa]` - STK Push initiation
- `[M-Pesa Callback]` - Callback processing

### Key Log Messages
```
[M-Pesa Callback] ✅ Payment SUCCESSFUL
[M-Pesa Callback] ✅ Transaction updated to COMPLETED
[M-Pesa Callback] ✅ ACCOUNT REACTIVATED
[M-Pesa Callback] ✅ Subscription extended by 30 days
```

---

## Security Considerations

1. **Service Role Key:** Used in callback for database operations (bypasses RLS)
2. **Callback Validation:** Consider adding IP whitelisting for Safaricom IPs
3. **Idempotency:** Callback may be sent multiple times - handle gracefully
4. **Transaction IDs:** Use unique IDs to prevent duplicate processing

---

## Summary

The M-Pesa integration provides a **fully automated payment and reactivation flow**:

1. ✅ Tenant initiates payment from PayNowModal
2. ✅ STK Push sent to tenant's phone
3. ✅ Tenant enters M-Pesa PIN and confirms
4. ✅ Safaricom sends callback to our server
5. ✅ **Account automatically reactivated**
6. ✅ **Subscription automatically extended**
7. ✅ Tenant can immediately access the system

**No manual intervention required!** 🎉
