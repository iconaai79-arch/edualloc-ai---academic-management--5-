// @ts-nocheck
/**
 * Supabase Edge Function: im-bank-api
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements I&M Bank B2B / Business Connect Integration API Specifications:
 *   1. Customer/Bill Validation: POST /im-validate/:institutionId or POST /validation
 *   2. Payment Notification Webhook: POST /im-notify/:institutionId or POST /notification
 *
 * Deploy Command:
 *   supabase functions deploy im-bank-api --no-verify-jwt
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathName = url.pathname;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract Institution ID from URL path or query parameter
    // e.g. /im-bank-api/im-validate/inst_123 or /im-validate?institutionId=inst_123
    let institutionId = url.searchParams.get("institutionId") || url.searchParams.get("tenantId") || "";
    
    const pathSegments = pathName.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    const secondLastSegment = pathSegments.length > 1 ? pathSegments[pathSegments.length - 2] : "";

    if (!institutionId && lastSegment && lastSegment !== "im-bank-api" && lastSegment !== "validation" && lastSegment !== "notification") {
      institutionId = lastSegment;
    }

    // Determine endpoint mode (Validation vs Notification)
    const isValidation = pathName.includes("validate") || pathName.includes("validation") || lastSegment === "validation";
    const isNotification = pathName.includes("notify") || pathName.includes("notification") || lastSegment === "notification";

    // Standard Healthcheck GET
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "online",
          service: "I&M Bank B2B Integration Gateway",
          institutionId: institutionId || "all",
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ statusCode: "405", responseCode: "405", message: "Method not allowed. Use POST." }),
        { status: 405, headers: corsHeaders }
      );
    }

    // Parse incoming JSON body safely
    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    // Normalize incoming payload field names (I&M field variants)
    const billNumber = (
      body.billNumber ||
      body.bill_number ||
      body.referenceNo ||
      body.ReferenceNo ||
      body.customerRef ||
      body.accountNumber ||
      body.billNo ||
      ""
    ).toString().trim();

    const rawAmount = body.amount || body.Amount || body.transactionAmount || 0;
    const amount = parseFloat(rawAmount) || 0;
    const bankReference = (
      body.bankReference ||
      body.bank_reference ||
      body.transactionId ||
      body.TransactionId ||
      body.paymentRef ||
      body.receiptNo ||
      `IMB-${Date.now()}`
    ).toString().trim();

    const paymentChannel = body.paymentChannel || body.channel || body.paymentMode || "I&M B2B";

    // Optional Tenant API Key / Auth Header Verification
    const apiKeyHeader = req.headers.get("x-api-key") || req.headers.get("X-API-KEY") || "";
    if (institutionId) {
      const { data: instData } = await supabase
        .from("institutions")
        .select("im_config")
        .eq("id", institutionId)
        .maybeSingle();

      const imConfig = instData?.im_config || {};
      if (imConfig.apiKey && apiKeyHeader && imConfig.apiKey !== apiKeyHeader) {
        return new Response(
          JSON.stringify({ statusCode: "401", responseCode: "401", message: "Invalid I&M x-api-key header for tenant" }),
          { status: 401, headers: corsHeaders }
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. CUSTOMER VALIDATION
    // ─────────────────────────────────────────────────────────────────────────
    if (isValidation || (!isNotification && !bankReference)) {
      if (!billNumber) {
        return new Response(
          JSON.stringify({
            statusCode: "01",
            responseCode: "01",
            found: false,
            customerName: null,
            message: "Missing billNumber or customer reference parameter",
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      const { data, error } = await supabase.rpc("im_bank_validate", {
        p_bill_number: billNumber,
        p_institution_id: institutionId || null,
        p_amount: amount,
      });

      if (error) {
        console.error("I&M Validation RPC Error:", error);
        return new Response(
          JSON.stringify({
            statusCode: "01",
            responseCode: "01",
            found: false,
            message: "Internal validation lookup error",
            error: error.message,
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. PAYMENT NOTIFICATION WEBHOOK
    // ─────────────────────────────────────────────────────────────────────────
    const { data, error } = await supabase.rpc("im_bank_notify", {
      p_bill_number: billNumber,
      p_amount: amount,
      p_bank_reference: bankReference,
      p_institution_id: institutionId || null,
      p_payment_channel: paymentChannel,
      p_transaction_date: body.transactionDate || new Date().toISOString(),
      p_raw_payload: body,
    });

    if (error) {
      console.error("I&M Payment Notification RPC Error:", error);
      return new Response(
        JSON.stringify({
          statusCode: "500",
          responseCode: "500",
          message: "Failed to record payment notification",
          error: error.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("I&M Edge Function Internal Error:", err);
    return new Response(
      JSON.stringify({
        statusCode: "500",
        responseCode: "500",
        message: "Internal Server Error",
        error: err.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
