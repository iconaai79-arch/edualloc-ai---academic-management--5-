# M-Pesa Integration Deployment Checklist

## Prerequisites

### 1. Safaricom Daraja API Account
- [ ] Register at [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
- [ ] Create an app (Sandbox or Production)
- [ ] Note down:
  - Consumer Key
  - Consumer Secret
  - Paybill Number (Business Short Code)
  - Passkey

### 2. Domain & Hosting
- [ ] Domain configured (e.g., `eduai.co.ke`)
- [ ] HTTPS enabled (required by Safaricom)
- [ ] Vercel/hosting platform configured

---

## Configuration Steps

### Step 1: Configure Callback URL in Daraja Portal
1. Login to [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
2. Go to your app settings
3. Register callback URL:
   ```
   https://your-domain.com/api/mpesa-callback
   ```
   **Example:** `https://eduai.co.ke/api/mpesa-callback`

### Step 2: Configure Environment Variables
Add to your `.env` or hosting platform:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: M-Pesa can also be configured via UI
# But you can set defaults here
```

### Step 3: Configure M-Pesa in Super Admin UI
1. Login as Super Admin
2. Navigate to: **Settings > System Settings > M-Pesa Configuration**
3. Enter:
   - **Consumer Key:** `your_consumer_key`
   - **Consumer Secret:** `your_consumer_secret`
   - **Paybill Number:** `174379` (or your business short code)
   - **Passkey:** `your_passkey`
   - **Environment:** `production` (or `sandbox` for testing)
4. Click **Save**

---

## Testing

### Sandbox Testing (Development)
1. Use Sandbox credentials from Daraja Portal
2. Test phone numbers:
   - **Phone:** `254708374149`
   - **PIN:** Any 4 digits
3. Monitor logs in Vercel dashboard

### Production Testing
1. Use Production credentials
2. Test with real Kenyan phone number (254XXXXXXXXX)
3. Use real M-Pesa account with sufficient balance
4. Monitor:
   - Vercel logs for backend processing
   - Database `mpesa_transactions` table
   - Institution `status` and `subscription_ends_at` fields

---

## Verification Checklist

### After Deployment
- [ ] Callback URL is accessible (test: `curl https://your-domain.com/api/mpesa-callback`)
- [ ] Callback URL registered in Daraja Portal
- [ ] M-Pesa credentials configured in Super Admin UI
- [ ] Database has `mpesa_transactions` table
- [ ] Database has `institutions` table with `status` and `subscription_ends_at` fields

### Test Payment Flow
- [ ] User can open PayNowModal
- [ ] User can select plan (Monthly/Yearly)
- [ ] User can enter phone number
- [ ] STK Push is sent to phone
- [ ] User receives M-Pesa prompt
- [ ] After payment, transaction status updates to 'completed'
- [ ] Institution status changes to 'active'
- [ ] Subscription end date is extended

---

## Monitoring

### Key Database Queries

**Check pending transactions:**
```sql
SELECT * FROM mpesa_transactions 
WHERE status = 'pending' 
ORDER BY timestamp DESC;
```

**Check completed transactions:**
```sql
SELECT * FROM mpesa_transactions 
WHERE status = 'completed' 
ORDER BY timestamp DESC 
LIMIT 10;
```

**Check institution subscription status:**
```sql
SELECT id, name, status, subscription_ends_at 
FROM institutions 
WHERE id = 'your-institution-id';
```

### Logs to Monitor
- `[M-Pesa]` - STK Push initiation
- `[M-Pesa Callback]` - Payment callback processing
- `✅ ACCOUNT REACTIVATED` - Successful reactivation
- `❌ Payment FAILED` - Failed payments

---

## Troubleshooting

### Issue: STK Push not received
**Possible Causes:**
- Invalid phone number format (must be 254XXXXXXXXX)
- Phone is off or out of network
- Invalid M-Pesa credentials

**Solution:**
- Verify phone number format
- Check M-Pesa credentials in Super Admin settings
- Check backend logs for error messages

### Issue: Callback not received
**Possible Causes:**
- Callback URL not registered in Daraja Portal
- Callback URL not accessible (HTTPS required)
- Firewall blocking Safaricom IPs

**Solution:**
- Verify callback URL is registered
- Test callback URL accessibility: `curl https://your-domain.com/api/mpesa-callback`
- Check Vercel logs for incoming requests

### Issue: Account not reactivated
**Possible Causes:**
- Callback received but processing failed
- Database update failed
- Missing SUPABASE_SERVICE_ROLE_KEY

**Solution:**
- Check `[M-Pesa Callback]` logs for errors
- Verify SUPABASE_SERVICE_ROLE_KEY is set
- Check database permissions

### Issue: Transaction stuck in 'pending'
**Possible Causes:**
- User cancelled payment
- Callback not received
- Network timeout

**Solution:**
- Check transaction status in Daraja Portal
- Use STK Query API to check status (implemented in `queryStkStatus`)
- Frontend polls status automatically (20 attempts, 3s intervals)

---

## Security Best Practices

1. **Never commit credentials to Git**
   - Use environment variables
   - Store in Vercel/hosting platform secrets

2. **Use HTTPS only**
   - Safaricom requires HTTPS for callbacks
   - Ensure SSL certificate is valid

3. **Validate callback source**
   - Consider IP whitelisting for Safaricom IPs
   - Validate callback structure

4. **Use Service Role Key carefully**
   - Only use in backend (api/mpesa-callback.ts)
   - Never expose to frontend

5. **Handle idempotency**
   - Safaricom may send callback multiple times
   - Check transaction status before processing

---

## Support & Resources

- **Safaricom Daraja Portal:** https://developer.safaricom.co.ke/
- **Daraja API Documentation:** https://developer.safaricom.co.ke/Documentation
- **Daraja Support:** apisupport@safaricom.co.ke
- **Test Credentials:** Available in Daraja Portal sandbox

---

## Quick Start Commands

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### Test Callback Locally (using ngrok)
```bash
# Install ngrok
npm i -g ngrok

# Start local server
npm run dev

# Expose local server
ngrok http 3000

# Use ngrok URL as callback URL in Daraja Portal
# Example: https://abc123.ngrok.io/api/mpesa-callback
```

---

## Success Indicators

When everything is working correctly, you should see:

1. ✅ User receives STK Push on phone
2. ✅ User enters PIN and confirms
3. ✅ Backend logs show: `[M-Pesa Callback] ✅ Payment SUCCESSFUL`
4. ✅ Backend logs show: `[M-Pesa Callback] ✅ ACCOUNT REACTIVATED`
5. ✅ Database shows transaction status = 'completed'
6. ✅ Database shows institution status = 'active'
7. ✅ User can immediately access the system

**The entire flow is automatic - no manual intervention needed!** 🎉
