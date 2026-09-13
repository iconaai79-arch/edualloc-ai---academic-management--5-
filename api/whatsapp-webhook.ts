import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabase client factory
const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

/**
 * Meta WhatsApp Cloud API Webhook Handler
 * 
 * 1. Verification (GET):
 *    Meta verifies callback URL by sending:
 *    hub.mode = "subscribe"
 *    hub.challenge = "<random_integer>"
 *    hub.verify_token = "<user_configured_token>"
 * 
 * 2. Event Delivery (POST):
 *    Meta pushes message status updates (sent, delivered, read) and inbound messages.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hub-Signature, X-Hub-Signature-256');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ─── 1. META WEBHOOK VERIFICATION (GET) ───
    if (req.method === 'GET') {
        const mode = (req.query['hub.mode'] || req.query['mode'] || '').toString();
        const token = (req.query['hub.verify_token'] || req.query['verify_token'] || '').toString();
        const challenge = (req.query['hub.challenge'] || req.query['challenge'] || '').toString();

        console.log(`[Meta WhatsApp Webhook] Verification request received. Mode: ${mode}, Token: ${token ? `${token.substring(0, 8)}...` : 'EMPTY'}`);

        if (mode === 'subscribe' && token) {
            // Verify against environment variable, or stored configs, or accept valid non-empty tokens during onboarding
            const expectedToken = process.env.META_WA_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
            
            let isAuthorized = true;
            if (expectedToken && token !== expectedToken) {
                // If expected token is set, check if token matches any institution's whatsapp_configs
                const supabase = getSupabase();
                if (supabase) {
                    const { data } = await supabase
                        .from('whatsapp_configs')
                        .select('api_key')
                        .eq('api_key', token)
                        .maybeSingle();
                    isAuthorized = Boolean(data);
                } else {
                    isAuthorized = false;
                }
            }

            if (isAuthorized) {
                console.log(`[Meta WhatsApp Webhook] Verification successful! Challenge returned: ${challenge}`);
                // Meta requires the response to be HTTP 200 with the raw challenge string
                res.setHeader('Content-Type', 'text/plain');
                return res.status(200).send(challenge);
            } else {
                console.warn(`[Meta WhatsApp Webhook] Verification token mismatch: received ${token}`);
                return res.status(403).send('Verification token mismatch');
            }
        }

        return res.status(400).send('Invalid verification parameters');
    }

    // ─── 2. META EVENT NOTIFICATIONS & INCOMING MESSAGES (POST) ───
    if (req.method === 'POST') {
        try {
            const body = req.body || {};
            console.log('[Meta WhatsApp Webhook] Inbound event received:', JSON.stringify(body).slice(0, 300));

            // Validate Meta WhatsApp object
            if (body.object === 'whatsapp_business_account' || Array.isArray(body.entry)) {
                const supabase = getSupabase();

                for (const entry of (body.entry || [])) {
                    for (const change of (entry.changes || [])) {
                        const value = change.value;
                        if (!value) continue;

                        const phoneNumberId = value.metadata?.phone_number_id;

                        // ── Handle Inbound Messages ──
                        if (Array.isArray(value.messages)) {
                            for (const msg of value.messages) {
                                const senderPhone = msg.from;
                                const msgType = msg.type || 'text';
                                const content = msg.text?.body || msg.caption || `[${msgType} message]`;
                                const messageId = msg.id;

                                console.log(`[Meta WhatsApp Webhook] Inbound message from ${senderPhone}: ${content}`);

                                if (supabase) {
                                    // Identify institution by phone_number_id if possible, or fallback to 'global'
                                    let institutionId = 'global';
                                    if (phoneNumberId) {
                                        const { data: cfg } = await supabase
                                            .from('whatsapp_configs')
                                            .select('institution_id')
                                            .eq('meta_phone_number_id', phoneNumberId)
                                            .maybeSingle();
                                        if (cfg?.institution_id) institutionId = cfg.institution_id;
                                    }

                                    try {
                                        await supabase.from('whatsapp_logs').insert({
                                            id: `wamsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                                            institution_id: institutionId,
                                            recipient: senderPhone,
                                            message_type: 'text',
                                            content: `[INCOMING] ${content}`,
                                            status: 'delivered',
                                            created_at: new Date().toISOString()
                                        });
                                    } catch (logErr: any) {
                                        console.warn('[Meta WhatsApp Webhook] Failed to log inbound msg:', logErr);
                                    }
                                }
                            }
                        }

                        // ── Handle Outbound Delivery Status Updates (sent, delivered, read, failed) ──
                        if (Array.isArray(value.statuses)) {
                            for (const statusItem of value.statuses) {
                                const status = statusItem.status; // sent, delivered, read, failed
                                const recipientId = statusItem.recipient_id;
                                console.log(`[Meta WhatsApp Webhook] Delivery status for ${recipientId}: ${status}`);

                                if (supabase && (status === 'delivered' || status === 'failed')) {
                                    try {
                                        // Update recent logs to reflect real-time delivery
                                        await supabase
                                            .from('whatsapp_logs')
                                            .update({ 
                                                status: status === 'delivered' ? 'delivered' : 'failed',
                                                error_message: statusItem.errors ? JSON.stringify(statusItem.errors) : undefined
                                            })
                                            .eq('recipient', recipientId)
                                            .order('created_at', { ascending: false })
                                            .limit(1);
                                    } catch (_) {}
                                }
                            }
                        }
                    }
                }

                // Always return HTTP 200 to acknowledge receipt to Meta
                return res.status(200).send('EVENT_RECEIVED');
            }

            return res.status(200).send('OK');
        } catch (err: any) {
            console.error('[Meta WhatsApp Webhook] Error processing event:', err);
            // Return 200 to avoid Meta webhook retries on parse bugs
            return res.status(200).send('EVENT_ERROR');
        }
    }

    return res.status(405).send('Method Not Allowed');
}
