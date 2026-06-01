/**
 * Utility for handling Biometric Authentication for Driving School Kiosk.
 * Supports both WebAuthn (Option 1) and USB Local Proxy (Option 2).
 */

// ==========================================
// OPTION 1: WEBAUTHN (DEVICE BIOMETRICS)
// ==========================================

function bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const charCode of bytes) {
        str += String.fromCharCode(charCode);
    }
    const base64String = btoa(str);
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
}

export async function registerWebAuthn(studentId: string, studentName: string) {
    if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported on this device/browser.");
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
            name: "Driving School Kiosk",
            id: window.location.hostname
        },
        user: {
            id: Uint8Array.from(studentId, c => c.charCodeAt(0)),
            name: studentName,
            displayName: studentName
        },
        pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" } // RS256
        ],
        authenticatorSelection: {
            userVerification: "preferred"
        },
        timeout: 60000,
        attestation: "none"
    };

    try {
        const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
        // In a real production system, you would send credential.response to your server
        // and store the verified public key. For this demo/MVP, we store the rawId.
        
        return {
            id: credential.id,
            rawId: bufferToBase64url(credential.rawId),
            type: credential.type
        };
    } catch (err: any) {
        console.error("WebAuthn Registration Error:", err);
        throw new Error("Failed to register device biometrics: " + err.message);
    }
}

export async function authenticateWebAuthn(credentialIdBase64Url?: string) {
    if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported on this device/browser.");
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: "preferred"
    };

    if (credentialIdBase64Url) {
        publicKey.allowCredentials = [{
            type: 'public-key',
            id: base64urlToBuffer(credentialIdBase64Url)
        }];
    }

    try {
        const assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;
        return {
            id: assertion.id,
            rawId: bufferToBase64url(assertion.rawId),
            type: assertion.type
        };
    } catch (err: any) {
        console.error("WebAuthn Auth Error:", err);
        throw new Error("Biometric authentication failed: " + err.message);
    }
}


// ==========================================
// OPTION 2: USB FINGERPRINT PROXY (WEBSOCKET)
// ==========================================
// This expects a local background service running on port 8080.
// Commands: "CAPTURE" or "VERIFY"

const PROXY_URL = 'ws://127.0.0.1:8080';

export async function captureUsbFingerprint(): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const ws = new WebSocket(PROXY_URL);
            
            ws.onopen = () => {
                ws.send(JSON.stringify({ command: 'CAPTURE' }));
            };

            ws.onmessage = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    if (response.status === 'SUCCESS' && response.template) {
                        resolve(response.template);
                        ws.close();
                    } else if (response.status === 'ERROR') {
                        reject(new Error(response.message || "Scanner error"));
                        ws.close();
                    }
                } catch (e) {
                    reject(new Error("Invalid proxy response"));
                    ws.close();
                }
            };

            ws.onerror = () => {
                reject(new Error(`Could not connect to biometric proxy at ${PROXY_URL}. Is the scanner service running?`));
            };

            // Timeout after 30 seconds
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                    reject(new Error("Scanner timeout. Please try again."));
                }
            }, 30000);

        } catch (err: any) {
            reject(new Error("WebSocket initialization failed: " + err.message));
        }
    });
}

export async function verifyUsbFingerprint(templateBase64: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        try {
            const ws = new WebSocket(PROXY_URL);
            
            ws.onopen = () => {
                ws.send(JSON.stringify({ command: 'VERIFY', targetTemplate: templateBase64 }));
            };

            ws.onmessage = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    if (response.status === 'SUCCESS' && response.match === true) {
                        resolve(true);
                        ws.close();
                    } else if (response.status === 'SUCCESS' && response.match === false) {
                        resolve(false);
                        ws.close();
                    } else if (response.status === 'ERROR') {
                        reject(new Error(response.message || "Scanner verification error"));
                        ws.close();
                    }
                } catch (e) {
                    reject(new Error("Invalid proxy response"));
                    ws.close();
                }
            };

            ws.onerror = () => {
                reject(new Error(`Could not connect to biometric proxy at ${PROXY_URL}. Is the scanner service running?`));
            };

            // Timeout after 30 seconds
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                    reject(new Error("Scanner timeout. Please try again."));
                }
            }, 30000);

        } catch (err: any) {
            reject(new Error("WebSocket initialization failed: " + err.message));
        }
    });
}
