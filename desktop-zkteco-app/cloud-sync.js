/**
 * EduAI Cloud Synchronization Service
 * 
 * Securely batches and pushes attendance records from local ZKTeco devices
 * to the EduAI Cloud Webhook (/api/zkteco-webhook & /api/records).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class CloudSyncService {
    constructor(config = {}) {
        this.cloudUrl = config.cloudUrl || 'https://portal.eduai.co.ke';
        this.institutionId = config.institutionId || '';
        this.apiKey = config.apiKey || '';
        this.storagePath = path.join(__dirname, 'storage.json');
        this.syncedLogs = new Set();
        this.offlineQueue = [];
        this.loadStorage();
    }

    loadStorage() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
                if (Array.isArray(data.syncedLogKeys)) {
                    this.syncedLogs = new Set(data.syncedLogKeys);
                }
                if (Array.isArray(data.offlineQueue)) {
                    this.offlineQueue = data.offlineQueue;
                }
            }
        } catch (e) {
            console.warn('[CloudSync] Storage load error:', e.message);
        }
    }

    saveStorage() {
        try {
            // Keep memory manageable - retain last 50,000 punch keys
            const syncedArr = Array.from(this.syncedLogs).slice(-50000);
            const data = {
                syncedLogKeys: syncedArr,
                offlineQueue: this.offlineQueue,
                lastSavedAt: new Date().toISOString()
            };
            fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {
            console.warn('[CloudSync] Storage save error:', e.message);
        }
    }

    updateConfig(newConfig) {
        if (newConfig.cloudUrl) this.cloudUrl = newConfig.cloudUrl.replace(/\/+$/, '');
        if (newConfig.institutionId) this.institutionId = newConfig.institutionId;
        if (newConfig.apiKey) this.apiKey = newConfig.apiKey;
    }

    /**
     * Generate unique signature key for a punch record
     */
    static getPunchKey(punch, serialNumber = 'DEV_1') {
        return `${serialNumber}_${punch.pin}_${punch.time}`;
    }

    /**
     * Send HTTP/HTTPS request with JSON payload
     */
    postJson(urlPath, payload) {
        return new Promise((resolve, reject) => {
            const fullUrl = new URL(urlPath, this.cloudUrl);
            const isHttps = fullUrl.protocol === 'https:';
            const client = isHttps ? https : http;

            const postData = JSON.stringify(payload);
            const options = {
                hostname: fullUrl.hostname,
                port: fullUrl.port || (isHttps ? 443 : 80),
                path: fullUrl.pathname + fullUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
                    'X-Institution-Id': this.institutionId
                },
                timeout: 10000
            };

            const req = client.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve({ status: res.statusCode, data: parsed });
                    } catch (e) {
                        resolve({ status: res.statusCode, raw: body });
                    }
                });
            });

            req.on('error', (err) => reject(err));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Cloud sync request timed out (10s)'));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Send heartbeat to cloud
     */
    async sendHeartbeat(serialNumber, deviceName, ipAddress) {
        try {
            const url = `/api/zkteco-webhook?action=heartbeat&SN=${encodeURIComponent(serialNumber)}&institutionId=${encodeURIComponent(this.institutionId)}`;
            const payload = {
                serialNumber,
                deviceName,
                ipAddress,
                timestamp: new Date().toISOString(),
                source: 'desktop_sync_agent'
            };
            return await this.postJson(url, payload);
        } catch (e) {
            console.warn('[CloudSync] Heartbeat error:', e.message);
            return null;
        }
    }

    /**
     * Push new attendance punches to EduAI Cloud
     */
    async syncAttendanceLogs(punches, serialNumber = 'DEV_1') {
        const newPunches = punches.filter((p) => {
            const key = CloudSyncService.getPunchKey(p, serialNumber);
            return !this.syncedLogs.has(key);
        });

        if (newPunches.length === 0) {
            return { count: 0, message: 'All punches already synchronized.' };
        }

        // Format into ZKTeco ADMS ATTLOG lines (Tab separated)
        // PIN \t TIMESTAMP \t STATUS \t VERIFY_MODE
        const tabSeparatedLines = newPunches.map(p => 
            `${p.pin}\t${p.time}\t${p.status ?? 0}\t${p.verifyMode ?? 1}\t0\t0`
        ).join('\n');

        const webhookPath = `/api/zkteco-webhook?SN=${encodeURIComponent(serialNumber)}&institutionId=${encodeURIComponent(this.institutionId)}&source=desktop_agent`;

        try {
            const res = await this.postJson(webhookPath, {
                rawLog: tabSeparatedLines,
                punches: newPunches,
                serialNumber,
                institutionId: this.institutionId
            });

            // Mark punches as synced
            newPunches.forEach((p) => {
                const key = CloudSyncService.getPunchKey(p, serialNumber);
                this.syncedLogs.add(key);
            });
            this.saveStorage();

            return {
                count: newPunches.length,
                success: true,
                response: res
            };
        } catch (err) {
            console.warn('[CloudSync] Cloud upload failed, buffering offline:', err.message);
            // Buffer offline
            newPunches.forEach(p => {
                this.offlineQueue.push({ ...p, serialNumber, queuedAt: new Date().toISOString() });
            });
            this.saveStorage();

            return {
                count: newPunches.length,
                buffered: true,
                error: err.message
            };
        }
    }

    /**
     * Flush offline queue when connection is restored
     */
    async flushOfflineQueue() {
        if (this.offlineQueue.length === 0) return { count: 0 };

        const pending = [...this.offlineQueue];
        this.offlineQueue = [];

        try {
            const res = await this.syncAttendanceLogs(pending, pending[0]?.serialNumber || 'OFFLINE_BUFFER');
            return res;
        } catch (e) {
            // Restore back to queue
            this.offlineQueue = [...pending, ...this.offlineQueue];
            this.saveStorage();
            throw e;
        }
    }
}

module.exports = {
    CloudSyncService
};
