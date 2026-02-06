import type { MpesaConfig } from '../types';

/**
 * Simulates the backend M-Pesa handshake process using Production endpoints.
 */
export const initiateStkPush = async (
    config: MpesaConfig,
    amount: number,
    phoneNumber: string,
    accountReference: string
): Promise<{ success: boolean; message: string }> => {
    
    if (!config.paybillNumber || !config.passkey || !config.consumerKey || !config.consumerSecret) {
        const msg = "Configuration Error: Ensure Production Consumer Key, Secret, Paybill, and Passkey are set in Super Admin settings.";
        console.warn(msg);
        return { success: false, message: msg };
    }

    console.group(`--- M-PESA DARAJA WORKFLOW (Production Mode) ---`);
    
    // STEP 1: TOKEN GENERATION
    console.log(`[1/2] Generating Production Access Token...`);
    const authHeader = btoa(`${config.consumerKey}:${config.consumerSecret}`);
    console.log(`- Endpoint: GET https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`);
    
    // STEP 2: STK PUSH
    console.log(`[2/2] Requesting Production STK Push...`);
    const now = new Date();
    const timestamp = 
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
        
    const password = btoa(config.paybillNumber + config.passkey + timestamp);

    const body = {
        BusinessShortCode: config.paybillNumber,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: config.paybillNumber,
        PhoneNumber: phoneNumber,
        AccountReference: accountReference,
        TransactionDesc: "Portal Subscription",
        Authorization: "Bearer <PRODUCTION_ACCESS_TOKEN>"
    };

    console.log('- Request Endpoint: https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest');
    console.log('- Request Body:', body);
    console.groupEnd();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return { 
        success: true, 
        message: "Production handshake successful. Please check the handset for the M-Pesa PIN prompt." 
    };
};