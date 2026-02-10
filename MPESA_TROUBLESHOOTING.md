# M-Pesa 500 Error Troubleshooting Guide

## Common Causes of 500 Error

### 1. Missing Environment Variables
**Error:** "Database service unavailable"

**Solution:**
Check that these environment variables are set in your hosting platform (Vercel/etc):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # ⚠️ CRITICAL for callback handler
```

**How to check:**
- Go to your Vercel dashboard
- Navigate to your project > Settings > Environment Variables
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set

### 2. Missing M-Pesa Configuration
**Error:** "M-Pesa configuration is missing"

**Solution:**
Configure M-Pesa credentials in the application:

1. Login as Super Admin
2. Go to: **Settings > System Settings**
3. Scroll to **M-Pesa Configuration**
4. Enter:
   - Consumer Key
   - Consumer Secret
   - Paybill Number
   - Passkey
   - Environment (sandbox/production)
5. Click **Save**

### 3. Authentication Issues
**Error:** "Unauthorized: Session invalid"

**Solution:**
- Log out and log back in
- Clear browser cache
- Check if your session has expired

### 4. Supabase Connection Failed
**Error:** Various database errors

**Solution:**
- Check Supabase dashboard for service status
- Verify Supabase URL and keys are correct
- Check if Row Level Security (RLS) policies are blocking access

---

## Diagnostic Steps

### Step 1: Check Browser Console
Open browser DevTools (F12) and look for:

```
[M-Pesa Client] Initiating payment request...
[M-Pesa Client] Response status: 500
[M-Pesa Client] Response data: { error: "..." }
```

The response data will tell you the exact error.

### Step 2: Check Backend Logs
If deployed on Vercel:

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Deployments**
4. Click on the latest deployment
5. Click **Functions** tab
6. Look for `/api/integrations` logs

Look for these log messages:
- `[M-Pesa] Initiating STK Push...`
- `[M-Pesa] Config incomplete:` (shows which credentials are missing)
- `[M-Pesa] Target Environment:` (shows sandbox/production)

### Step 3: Test Supabase Connection
Run this in browser console:

```javascript
// Test if Supabase is accessible
const testSupabase = async () => {
  const response = await fetch('/api/integrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'test' })
  });
  console.log('Status:', response.status);
  console.log('Response:', await response.json());
};
testSupabase();
```

### Step 4: Check System Settings
Run this in browser console:

```javascript
// Check if M-Pesa config exists
const checkConfig = async () => {
  const settings = await apiService.fetchCompanySettings();
  console.log('M-Pesa Config:', settings?.mpesaConfig);
  console.log('Has Consumer Key:', !!settings?.mpesaConfig?.consumerKey);
  console.log('Has Consumer Secret:', !!settings?.mpesaConfig?.consumerSecret);
  console.log('Has Paybill:', !!settings?.mpesaConfig?.paybillNumber);
  console.log('Has Passkey:', !!settings?.mpesaConfig?.passkey);
};
checkConfig();
```

---

## Specific Error Messages

### "Database service unavailable"
**Cause:** `SUPABASE_SERVICE_ROLE_KEY` not set in environment variables

**Fix:**
```bash
# In Vercel CLI
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Or add in Vercel Dashboard:
# Settings > Environment Variables > Add
```

### "M-Pesa configuration is missing"
**Cause:** No M-Pesa credentials in `system_settings` table

**Fix:**
1. Login as Super Admin
2. Configure M-Pesa in System Settings UI
3. Make sure to click **Save**

### "M-Pesa credentials incomplete"
**Cause:** Some M-Pesa credentials are missing

**Fix:**
Check backend logs to see which specific credential is missing:
```
[M-Pesa] Config incomplete: { 
  paybillNumber: true, 
  hasKey: false,  // ❌ Consumer Key missing
  hasSecret: true, 
  hasPasskey: true 
}
```

### "Unauthorized: Session invalid"
**Cause:** User session expired or invalid

**Fix:**
- Log out and log back in
- Check if you're logged in as the correct user

### "Daraja Auth Failed"
**Cause:** Invalid M-Pesa Consumer Key/Secret

**Fix:**
- Verify credentials in Safaricom Daraja Portal
- Make sure you're using the correct environment (sandbox vs production)
- Check for typos in credentials

---

## Quick Fixes

### Fix 1: Redeploy with Environment Variables
```bash
# Set environment variable
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Redeploy
vercel --prod
```

### Fix 2: Reconfigure M-Pesa
1. Login as Super Admin
2. Go to System Settings
3. Delete existing M-Pesa config
4. Re-enter all credentials
5. Save

### Fix 3: Check Supabase RLS Policies
Make sure `system_settings` table has proper RLS policies:

```sql
-- Allow authenticated users to read system settings
CREATE POLICY "Allow authenticated read" ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update system settings
CREATE POLICY "Allow authenticated update" ON system_settings
  FOR UPDATE
  TO authenticated
  USING (true);
```

---

## Still Getting 500 Error?

### Collect This Information:

1. **Browser Console Logs:**
   - Copy the `[M-Pesa Client]` logs
   - Copy any error messages

2. **Backend Logs (Vercel):**
   - Copy the `/api/integrations` function logs
   - Look for `[M-Pesa]` prefixed messages

3. **Configuration Status:**
   ```javascript
   // Run in browser console
   const settings = await apiService.fetchCompanySettings();
   console.log('M-Pesa Config exists:', !!settings?.mpesaConfig);
   console.log('Environment:', settings?.mpesaConfig?.environment);
   ```

4. **Network Tab:**
   - Open DevTools > Network
   - Filter by "integrations"
   - Click on the failed request
   - Copy the Response body

### Share This Information:
Provide the collected logs and we can diagnose the exact issue.

---

## Prevention

To avoid 500 errors in the future:

1. ✅ Always set `SUPABASE_SERVICE_ROLE_KEY` in production
2. ✅ Configure M-Pesa credentials before testing
3. ✅ Test in sandbox environment first
4. ✅ Monitor backend logs during testing
5. ✅ Keep credentials up to date

---

## Testing Checklist

Before testing M-Pesa:

- [ ] Supabase connection working
- [ ] Logged in as valid user
- [ ] M-Pesa credentials configured in System Settings
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in environment
- [ ] Callback URL registered in Daraja Portal
- [ ] Using correct environment (sandbox/production)
- [ ] Phone number in correct format (254XXXXXXXXX)

---

## Need Help?

If you're still stuck, run this diagnostic script in the browser console:

```javascript
const diagnose = async () => {
  console.log('=== M-PESA DIAGNOSTIC ===');
  
  // 1. Check Supabase
  const dbTest = await apiService.testDatabaseConnection();
  console.log('1. Database:', dbTest.status);
  
  // 2. Check Session
  const session = apiService.getSession();
  console.log('2. Logged in:', !!session);
  console.log('   User:', session?.name);
  console.log('   Role:', session?.role);
  
  // 3. Check M-Pesa Config
  const settings = await apiService.fetchCompanySettings();
  const mpesa = settings?.mpesaConfig;
  console.log('3. M-Pesa Config:', !!mpesa);
  if (mpesa) {
    console.log('   Consumer Key:', mpesa.consumerKey ? '✓' : '✗');
    console.log('   Consumer Secret:', mpesa.consumerSecret ? '✓' : '✗');
    console.log('   Paybill:', mpesa.paybillNumber ? '✓' : '✗');
    console.log('   Passkey:', mpesa.passkey ? '✓' : '✗');
    console.log('   Environment:', mpesa.environment);
  }
  
  console.log('=== END DIAGNOSTIC ===');
};

diagnose();
```

This will show you exactly what's missing!
