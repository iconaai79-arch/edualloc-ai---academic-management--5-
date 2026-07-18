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

        // Helper: write a table to both IndexedDB AND localStorage.
        // IndexedDB is read by localDb.getAll() in App.tsx (Phase 2 offline branch).
        // localStorage is read by fetchModuleRecords.queryLocal() used inside library
        // components (LibraryMemberManager, BookLendingManager, etc.) when offline.
        const cacheTable = async (storeName: string, records: any[]) => {
            // Write each record to IndexedDB
            await Promise.all(records.map((item: any) => localDb.put(storeName, item)));
            // Merge into localStorage so component-level fetchModuleRecords calls work offline
            try {
                const existing: any[] = JSON.parse(localStorage.getItem(`eduai_${storeName}`) || '[]');
                const merged = [...existing];
                for (const item of records) {
                    const idx = merged.findIndex((r: any) => r && r.id === item.id);
                    if (idx >= 0) merged[idx] = item;
                    else merged.push(item);
                }
                localStorage.setItem(`eduai_${storeName}`, JSON.stringify(merged));
            } catch (e) {
                console.warn(`[SyncEngine] localStorage write failed for ${storeName}:`, e);
            }
        };

        update(10);
        try {
            // ── BATCH 1: Core / election / beauty-college tables ─────────────
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
                electionCheckins,
                bcSettings,
                bcCourses,
                bcStudents,
                bcTrainers,
                bcFeeStructures,
                bcInvoices,
                bcPayments,
                bcPracticals
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
                apiService.fetchModuleRecords('election_checkins', tenantId).catch(() => []),
                apiService.fetchModuleRecords('bc_settings', tenantId).catch(() => []),
                apiService.fetchModuleRecords('bc_courses', tenantId).catch(() => []),
                apiService.fetchModuleRecords('bc_students', tenantId).catch(() => []),
                apiService.fetchModuleRecords('bc_trainers', tenantId).catch(() => []),
                apiService.fetchModuleRecords('bc_fee_structures', tenantId).catch(() => []),
                apiService.fetchModuleRecords('bc_invoices', tenantId).catch(() => []),
                apiService.fetchModuleRecords('bc_payments', tenantId).catch(() => []),
                apiService.fetchModuleRecords('bc_practicals', tenantId).catch(() => []),
            ]);

            update(35);

            // ── BATCH 2: Library module tables ───────────────────────────────
            // These are NOT fetched anywhere else at sync time, which is why
            // Members / Students tabs show empty data when offline.
            const [
                books,
                libraryTransactions,
                libraryFines,
                librarySettings,
                bookReservations,
                bookStockReceipts,
                studentEnrollments,
            ] = await Promise.all([
                apiService.fetchModuleRecords('books', tenantId).catch(() => []),
                apiService.fetchModuleRecords('library_transactions', tenantId).catch(() => []),
                apiService.fetchModuleRecords('library_fines', tenantId).catch(() => []),
                apiService.fetchModuleRecords('library_settings', tenantId).catch(() => []),
                apiService.fetchModuleRecords('book_reservations', tenantId).catch(() => []),
                apiService.fetchModuleRecords('book_stock_receipts', tenantId).catch(() => []),
                apiService.fetchModuleRecords('student_enrollments', tenantId).catch(() => []),
            ]);

            update(60);

            // ── BATCH 3: Security module tables ──────────────────────────────
            // visitors, watchlist, alerts, event pins, building logs, etc.
            const [
                visitors,
                watchlistRecords,
                securityAlerts,
                eventPins,
                institutionEvents,
                buildingVisitorLogs,
                buildingVisitorAssets,
            ] = await Promise.all([
                apiService.fetchModuleRecords('visitors', tenantId).catch(() => []),
                apiService.fetchModuleRecords('watchlist_records', tenantId).catch(() => []),
                apiService.fetchModuleRecords('security_alerts', tenantId).catch(() => []),
                apiService.fetchModuleRecords('event_pins', tenantId).catch(() => []),
                apiService.fetchModuleRecords('institution_events', tenantId).catch(() => []),
                apiService.fetchModuleRecords('building_visitor_logs', tenantId).catch(() => []),
                apiService.fetchModuleRecords('building_visitor_assets').catch(() => []),
            ]);

            update(80);

            // ── Write everything to IndexedDB + localStorage ──────────────────
            await Promise.all([
                // Core
                cacheTable('institutions', institutions),
                cacheTable('constituencies', constituencies),
                cacheTable('users', users),
                cacheTable('requisitions', requisitions),
                cacheTable('sms_logs', smsLogs),
                cacheTable('sms_outbox', smsOutbox),
                // Election
                cacheTable('election_events', electionEvents),
                cacheTable('election_candidates', electionCandidates),
                cacheTable('election_voters_ledger', electionVotersLedger),
                cacheTable('election_checkins', electionCheckins),
                // Beauty College
                cacheTable('bc_settings', bcSettings),
                cacheTable('bc_courses', bcCourses),
                cacheTable('bc_students', bcStudents),
                cacheTable('bc_trainers', bcTrainers),
                cacheTable('bc_fee_structures', bcFeeStructures),
                cacheTable('bc_invoices', bcInvoices),
                cacheTable('bc_payments', bcPayments),
                cacheTable('bc_practicals', bcPracticals),
                // Library
                cacheTable('books', books),
                cacheTable('library_transactions', libraryTransactions),
                cacheTable('library_fines', libraryFines),
                cacheTable('library_settings', librarySettings),
                cacheTable('book_reservations', bookReservations),
                cacheTable('book_stock_receipts', bookStockReceipts),
                cacheTable('student_enrollments', studentEnrollments),
                // Security
                cacheTable('visitors', visitors),
                cacheTable('watchlist_records', watchlistRecords),
                cacheTable('security_alerts', securityAlerts),
                cacheTable('event_pins', eventPins),
                cacheTable('institution_events', institutionEvents),
                cacheTable('building_visitor_logs', buildingVisitorLogs),
                cacheTable('building_visitor_assets', buildingVisitorAssets),
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
