// @ts-nocheck
/**
 * Supabase Edge Function: equity-biller-api
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements Equity Bank Biller Integration API Specification:
 *   1. JWT Authentication (/api/token or /token)
 *   2. Biller Customer Validation (/validation)
 *   3. Biller Payment Notification (/notification)
 *
 * Deploy: supabase functions deploy equity-biller-api --no-verify-jwt
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Simple WebCrypto-based JWT signing & verification helper
const JWT_SECRET = Deno.env.get("EQUITY_BILLER_JWT_SECRET") || "equity-biller-default-jwt-secret-2026";
const BILLER_USER = Deno.env.get("EQUITY_BILLER_USERNAME") || "equity_biller_user";
const BILLER_PASS = Deno.env.get("EQUITY_BILLER_PASSWORD") || "EquityBiller@2026!";

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const raw = atob(base64);
  const result = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    result[i] = raw.charCodeAt(i);
  }
  return result;
}

async function signJwt(payload: Record<string, unknown>, expiresInSeconds: number = 86400): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const encodedHeader = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(enc.encode(JSON.stringify(fullPayload)));

  const message = `${encodedHeader}.${encodedPayload}`;
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${message}.${encodedSignature}`;
}

async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const message = `${headerB64}.${payloadB64}`;
    const enc = new TextEncoder();
    const key = await getCryptoKey();
    const sig = base64UrlDecode(sigB64);

    const valid = await crypto.subtle.verify("HMAC", key, sig, enc.encode(message));
    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null; // Expired

    return payload;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, "");

  // Initialize Supabase Client with Admin credentials
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION ENDPOINT: POST /api/token or POST /token
    // -------------------------------------------------------------------------
    if (pathname.endsWith("/token") || pathname.endsWith("/api/token")) {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: corsHeaders,
        });
      }

      let body: any = {};
      try {
        body = await req.json();
      } catch {
        // Fallback to query/url search params
      }

      const username = body.username || url.searchParams.get("username");
      const password = body.password || url.searchParams.get("password");

      // Verify credentials
      if (username !== BILLER_USER || password !== BILLER_PASS) {
        return new Response(
          JSON.stringify({ responseCode: "401", responseMessage: "Invalid credentials" }),
          { status: 401, headers: corsHeaders }
        );
      }

      // Generate Access (24h) & Refresh (30 days) tokens
      const accessToken = await signJwt({ sub: username, role: "biller" }, 86400);
      const refreshToken = await signJwt({ sub: username, type: "refresh" }, 30 * 86400);

      return new Response(
        JSON.stringify({
          access: accessToken,
          refresh: refreshToken,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Authorization Verification for protected endpoints (/validation, /notification)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ responseCode: "401", responseMessage: "Unauthorized: Missing Bearer Token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decodedToken = await verifyJwt(token);
    if (!decodedToken) {
      return new Response(
        JSON.stringify({ responseCode: "401", responseMessage: "Unauthorized: Invalid or expired token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // -------------------------------------------------------------------------
    // 2. VALIDATION ENDPOINT: POST /validation
    // -------------------------------------------------------------------------
    if (pathname.endsWith("/validation")) {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: corsHeaders,
        });
      }

      const body = await req.json();
      const billNumber = body.billNumber;
      const amount = parseFloat(body.amount ?? "0") || 0;

      if (!billNumber) {
        return new Response(
          JSON.stringify({
            responseCode: "400",
            responseMessage: "billNumber parameter is required",
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Call database RPC equity_biller_validate
      const { data, error } = await supabase.rpc("equity_biller_validate", {
        p_bill_number: String(billNumber),
        p_amount: amount,
      });

      if (error) {
        console.error("Equity Biller Validation Error:", error);
        // Fallback response format as per guide
        return new Response(
          JSON.stringify({
            customerName: `Customer ${billNumber}`,
            billNumber: String(billNumber),
            amount: String(amount || "0"),
            description: "Success",
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          customerName: data.customerName || `Customer ${billNumber}`,
          billNumber: String(data.billNumber || billNumber),
          amount: String(data.amount ?? "0"),
          description: data.description || "Success",
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // -------------------------------------------------------------------------
    // 3. NOTIFICATION ENDPOINT: POST /notification
    // -------------------------------------------------------------------------
    if (pathname.endsWith("/notification")) {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: corsHeaders,
        });
      }

      const body = await req.json();
      const { billNumber, amount, bankReference, transactionDate } = body;

      if (!billNumber || !amount || !bankReference) {
        return new Response(
          JSON.stringify({
            responseCode: "400",
            responseMessage: "Missing required fields (billNumber, amount, bankReference)",
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      const numericAmount = parseFloat(String(amount)) || 0;

      // Execute RPC equity_biller_notify
      const { data, error } = await supabase.rpc("equity_biller_notify", {
        p_bill_number: String(billNumber),
        p_amount: numericAmount,
        p_bank_reference: String(bankReference),
        p_transaction_date: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
        p_raw_payload: body,
      });

      if (error) {
        console.error("Equity Biller Notification RPC Error:", error);
        return new Response(
          JSON.stringify({
            responseCode: "500",
            responseMessage: "Internal Server Error",
          }),
          { status: 500, headers: corsHeaders }
        );
      }

      // data contains { responseCode: "200" | "400", responseMessage: "Success" | "Duplicate transaction" }
      const statusHttp = data?.responseCode === "400" ? 400 : 200;

      return new Response(
        JSON.stringify({
          responseCode: String(data?.responseCode || "200"),
          responseMessage: String(data?.responseMessage || "Success"),
        }),
        { status: statusHttp, headers: corsHeaders }
      );
    }

    // Unmatched path
    return new Response(
      JSON.stringify({
        responseCode: "404",
        responseMessage: "Endpoint Not Found. Valid routes: /token, /validation, /notification",
      }),
      { status: 404, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Equity Biller Edge Function Error:", err);
    return new Response(
      JSON.stringify({
        responseCode: "500",
        responseMessage: err?.message || "Internal Server Error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
