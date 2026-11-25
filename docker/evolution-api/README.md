# EduAI WhatsApp Dual-Engine Setup Guide (Meta Cloud API + Evolution / Baileys QR)

EduAI supports **both** WhatsApp engines simultaneously with **automatic failover**:
- If your primary engine fails (e.g. Meta 24-hour session window expires or Evolution VPS restarts), `/api/integrations?action=sendWhatsApp` automatically retries via the secondary engine.

---

## Option 1: Meta Cloud API (Official, Zero Server, Instant on Vercel)

1. Open [Meta for Developers](https://developers.facebook.com/) → Create or open your Business App → **WhatsApp → API Setup**.
2. Copy:
   - **Phone Number ID**
   - **WhatsApp Business Account ID (WABA ID)**
   - **Permanent System User Access Token** (Business Settings → System Users → Generate Token with `whatsapp_business_messaging` + `whatsapp_business_management`).
3. In **EduAI Super Admin → WhatsApp Gateway**:
   - Select **META CLOUD API**, paste the 3 values, and click **Save Configuration**.
   - *(Optional)* Also set `META_WA_ACCESS_TOKEN`, `META_WA_PHONE_NUMBER_ID`, and `META_WA_VERIFY_TOKEN` in Vercel Environment Variables so OTPs and HR alerts can use them globally.
4. In Meta Developer Portal → **WhatsApp → Configuration → Webhook**:
   - **Callback URL**: `https://portal.eduai.co.ke/api/whatsapp-webhook`
   - **Verify Token**: `eduai_wa_verify_2026` (or your `META_WA_VERIFY_TOKEN`)
   - Subscribe to the **`messages`** field.

---

## Option 2: Evolution / Baileys (QR Code Pairing with Any Normal WhatsApp Phone)

Vercel serverless functions cannot keep persistent WhatsApp Web sockets open, so host Evolution API on any small Docker VPS (Contabo/Hetzner/DigitalOcean), Railway, or Render:

### Quick Deploy on a Linux VPS
```bash
cd docker/evolution-api
export EVOLUTION_SERVER_URL="https://wa.eduai.co.ke"   # or http://YOUR_VPS_IP:8080
export EVOLUTION_API_KEY="$(openssl rand -hex 32)"
echo "Save this API Key for EduAI: $EVOLUTION_API_KEY"
docker compose up -d
```

### Connect to EduAI Super Admin
1. Go to **Super Admin → WhatsApp Gateway → EVOLUTION / BAILEYS**.
2. Enter:
   - **Gateway Base URL**: `https://wa.eduai.co.ke` (or `http://YOUR_VPS_IP:8080`)
   - **API Key / Global Token**: exact `EVOLUTION_API_KEY` from above
   - **Global Instance Name**: `eduai_master`
3. Click **Save Configuration**, then click **Auto-Provision / Sync Instance**.
4. The live **QR Code** will appear in **Device Pairing Station** — scan with WhatsApp → *Linked Devices*.
5. *(Optional)* Set `VITE_PLATFORM_GATEWAY_URL=https://wa.eduai.co.ke`, `EVOLUTION_API_URL`, and `EVOLUTION_API_KEY` in Vercel so the **Use Platform-Hosted Gateway** toggle auto-fills automatically.
