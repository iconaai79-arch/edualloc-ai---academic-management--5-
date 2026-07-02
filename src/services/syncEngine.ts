import { localDb } from './localDb';
import { apiService } from './apiService';

interface SyncQueueItem {
    id: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    module: string;
    data: any;
    timestamp: string;
}

class SyncEngine {
    private isSyncing = false;
    private listeners: ((progress: number) => void)[] = [];

    onSyncProgress(callback: (progress: number) => void) {
        this.listeners.push(callback);
    }

    private triggerProgress(progress: number) {
        this.listeners.forEach(cb => cb(progress));
    }

    async queueMutation(action: 'INSERT' | 'UPDATE' | 'DELETE', module: string, data: any): Promise<void> {
        const id = `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const queueItem: SyncQueueItem = {
            id,
            action,
            module,
            data,
            timestamp: new Date().toISOString()
        };
        // 1. Write locally first to IndexedDB
        if (action !== 'DELETE') {
            await localDb.put(module, data);
        } else {
            await localDb.delete(module, data.id);
        }

        // 2. Add to mutations queue
        await localDb.put('sync_queue', queueItem);

        // 3. Try to process queue immediately if online
        if (navigator.onLine) {
            this.processQueue().catch(err => console.error('[SyncEngine] Auto-process failed:', err));
        }
    }

    async processQueue(): Promise<void> {
        if (this.isSyncing || !navigator.onLine) return;
        this.isSyncing = true;
        this.triggerProgress(0);

        try {
            const queue: SyncQueueItem[] = await localDb.getAll('sync_queue');
            if (queue.length === 0) {
                this.isSyncing = false;
                this.triggerProgress(100);
                return;
            }

            // Sort chronologically (FIFO)
            queue.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            let count = 0;
            for (const item of queue) {
                if (!navigator.onLine) break;

                try {
                    if (item.action === 'INSERT' || item.action === 'UPDATE') {
                        await apiService.saveModuleRecord(item.module, item.data);
                    } else if (item.action === 'DELETE') {
                        await apiService.deleteModuleRecord(item.module, item.data.id);
                    }
                    // Remove from queue upon success
                    await localDb.delete('sync_queue', item.id);
                } catch (err) {
                    console.error(`[SyncEngine] Failed to sync item ${item.id}:`, err);
                    // Keep in queue to retry later
                }
                count++;
                this.triggerProgress(Math.round((count / queue.length) * 100));
            }
        } finally {
            this.isSyncing = false;
            this.triggerProgress(100);
        }
    }

    async fetchAndCacheTenantData(tenantId: string, onProgress?: (p: number) => void): Promise<void> {
        if (!navigator.onLine) throw new Error('Cannot enable offline mode while offline. Please connect to the internet first.');
        this.isSyncing = true;
        const update = (p: number) => {
            this.triggerProgress(p);
            if (onProgress) onProgress(p);
        };

        update(10);
        try {
            // Fetch relevant tables from Supabase via apiService
            const [
                institutions,
                constituencies,
                users,
                requisitions,
                smsLogs,
                smsOutbox,
                electionEvents,
                electionCandidates,
                electionVotersLedger,
                electionCheckins
            ] = await Promise.all([
                apiService.fetchModuleRecords('institutions', tenantId).catch(() => []),
                apiService.fetchModuleRecords('constituencies').catch(() => []),
                apiService.fetchModuleRecords('users', tenantId).catch(() => []),
                apiService.fetchModuleRecords('requisitions', tenantId).catch(() => []),
                apiService.fetchModuleRecords('sms_logs', tenantId).catch(() => []),
                apiService.fetchModuleRecords('sms_outbox', tenantId).catch(() => []),
                 apiService.fetchModuleRecords('election_events', tenantId).catch(() => []),
                 apiService.fetchModuleRecords('election_candidates', tenantId).catch(() => []),
                 apiService.fetchModuleRecords('election_voters_ledger', tenantId).catch(() => []),
                 apiService.fetchModuleRecords('election_checkins', tenantId).catch(() => [])
             ]);
 
             update(50);
 
             // Populate local IndexedDB tables
             await Promise.all([
                 ...institutions.map((item: any) => localDb.put('institutions', item)),
                 ...constituencies.map((item: any) => localDb.put('constituencies', item)),
                 ...users.map((item: any) => localDb.put('users', item)),
                 ...requisitions.map((item: any) => localDb.put('requisitions', item)),
                 ...smsLogs.map((item: any) => localDb.put('sms_logs', item)),
                 ...smsOutbox.map((item: any) => localDb.put('sms_outbox', item)),
                 ...electionEvents.map((item: any) => localDb.put('election_events', item)),
                 ...electionCandidates.map((item: any) => localDb.put('election_candidates', item)),
                 ...electionVotersLedger.map((item: any) => localDb.put('election_voters_ledger', item)),
                 ...electionCheckins.map((item: any) => localDb.put('election_checkins', item))
             ]);

            update(100);
        } catch (err: any) {
            update(0);
            throw new Error(`Data caching failed: ${err.message || err}`);
        } finally {
            this.isSyncing = false;
        }
    }
}

export const syncEngine = new SyncEngine();
