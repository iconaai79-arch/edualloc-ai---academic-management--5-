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

        // Helper: write a table to both IndexedDB AND localStorage safely.
        // IndexedDB is read by localDb.getAll() in App.tsx (Phase 2 offline branch).
        // localStorage is read by fetchModuleRecords.queryLocal() used inside components when offline.
        const cacheTable = async (storeName: string, records: any[]) => {
            if (!Array.isArray(records)) return;
            try {
                // Clear old store data and persist fresh tenant snapshot in a single batch transaction
                await localDb.replaceAll(storeName, records);
            } catch (e) {
                console.warn(`[SyncEngine] IndexedDB caching error on ${storeName}:`, e);
            }

            // Merge into localStorage so component-level fetchModuleRecords calls work offline
            try {
                const existing: any[] = JSON.parse(localStorage.getItem(`eduai_${storeName}`) || '[]');
                const merged = [...existing];
                for (const item of records) {
                    if (!item) continue;
                    const itemId = item.id || item._id || item.code;
                    const idx = merged.findIndex((r: any) => r && (r.id === itemId || (itemId && r.id === itemId)));
                    if (idx >= 0) merged[idx] = item;
                    else merged.push(item);
                }
                try {
                    localStorage.setItem(`eduai_${storeName}`, JSON.stringify(merged));
                } catch (e) {
                    // If localStorage quota exceeded, preserve most recent 300 records
                    console.warn(`[SyncEngine] Quota limit for localStorage ${storeName}, trimming snapshot:`, e);
                    localStorage.setItem(`eduai_${storeName}`, JSON.stringify(merged.slice(-300)));
                }
            } catch (e) {
                console.warn(`[SyncEngine] localStorage write skipped for ${storeName}:`, e);
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
                apiService.fetchModuleRecords('requisitions', tenantId, undefined, { limit: 500 }).catch(() => []),
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

            update(30);

            // ── BATCH 2: Library module tables ───────────────────────────────
            const [
                books,
                libraryTransactions,
                libraryFines,
                librarySettings,
                bookReservations,
                bookStockReceipts,
                studentEnrollments,
            ] = await Promise.all([
                apiService.fetchModuleRecords('books', tenantId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords('library_transactions', tenantId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords('library_fines', tenantId, undefined, { limit: 2000 }).catch(() => []),
                apiService.fetchModuleRecords('library_settings', tenantId).catch(() => []),
                apiService.fetchModuleRecords('book_reservations', tenantId, undefined, { limit: 2000 }).catch(() => []),
                apiService.fetchModuleRecords('book_stock_receipts', tenantId, undefined, { limit: 2000 }).catch(() => []),
                apiService.fetchModuleRecords('student_enrollments', tenantId).catch(() => []),
            ]);

            update(50);

            // ── BATCH 3: Security module tables ──────────────────────────────
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

            update(65);

            // ── BATCH 4: Finance module tables ───────────────────────────────
            const [
                invoices,
                receipts,
                voteHeads,
                feeStructures,
                financialPeriods,
                bankAccounts,
                branches,
                branchIntegrationConfigs,
                interBankTransfers,
                voteHeadTransfers,
                transactions,
            ] = await Promise.all([
                apiService.fetchModuleRecords('invoices', tenantId).catch(() => []),
                apiService.fetchModuleRecords('receipts', tenantId).catch(() => []),
                apiService.fetchModuleRecords('vote_heads', tenantId).catch(() => []),
                apiService.fetchModuleRecords('fee_structures', tenantId).catch(() => []),
                apiService.fetchModuleRecords('financial_periods', tenantId).catch(() => []),
                apiService.fetchModuleRecords('bank_accounts', tenantId).catch(() => []),
                apiService.fetchModuleRecords('branches', tenantId).catch(() => []),
                apiService.fetchModuleRecords('branch_integration_configs').catch(() => []),
                apiService.fetchModuleRecords('inter_bank_transfers', tenantId).catch(() => []),
                apiService.fetchModuleRecords('vote_head_transfers', tenantId).catch(() => []),
                apiService.fetchModuleRecords('transactions', tenantId).catch(() => []),
            ]);

            update(75);

            // ── BATCH 5: Restaurant & Cafe POS module tables ─────────────────
            const [
                cafeMenuItems,
                cafeOrders,
                retailSales,
                retailInventory,
                retailStores,
            ] = await Promise.all([
                apiService.fetchModuleRecords('cafe_menu_items', tenantId).catch(() => []),
                apiService.fetchModuleRecords('cafe_orders', tenantId).catch(() => []),
                apiService.fetchModuleRecords('retail_sales', tenantId).catch(() => []),
                apiService.fetchModuleRecords('retail_inventory', tenantId).catch(() => []),
                apiService.fetchModuleRecords('retail_stores', tenantId, undefined, { limit: 200 }).catch(() => []),
            ]);

            update(85);

            // ── BATCH 6: EduPulse / Healthcare (HIS) module tables ───────────
            const [
                hisPatients,
                hisAppointments,
                hisVitalStatistics,
                hisClinicalEvents,
                hisPrescriptions,
                hisPrescriptionItems,
                hisPharmacyInventory,
                hisPharmacyBatches,
                hisPharmacySales,
                hisPharmacySaleItems,
                hisPharmacyLedger,
                hisPharmacyStaff,
                hisPharmacySettings,
                hisPharmacyInteractions,
                hisPharmacyAdherenceAlerts,
                hisLabRequests,
                hisPartnerLabs,
                hisWards,
                hisInpatientRecords,
                hisNurseTasks,
                hisTariffs,
                hisClaims,
                hisBillingItems,
                hisInvoices,
                hisPayments,
                hisAncRecords,
                hisDeliveryRecords,
                hisCwcImmunizations,
                hisNbuAdmissions,
                hisPatientIdConfig,
                hisAuditLogs,
                hisQueueCalls,
            ] = await Promise.all([
                apiService.fetchModuleRecords('his_patients', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_appointments', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_vital_statistics', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_clinical_events', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_prescriptions', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_prescription_items', undefined).catch(() => []),
                apiService.fetchModuleRecords('his_pharmacy_inventory', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_pharmacy_batches', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_pharmacy_sales', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_pharmacy_sale_items', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_pharmacy_ledger', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_pharmacy_staff', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_pharmacy_settings', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_pharmacy_interactions', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_pharmacy_adherence_alerts', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_lab_requests', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_partner_labs', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_wards', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_inpatient_records', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_nurse_tasks', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_tariffs', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_claims', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_billing_items', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_invoices', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_payments', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_anc_records', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_delivery_records', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_cwc_immunizations', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_nbu_admissions', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_patient_id_config', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_audit_logs', tenantId).catch(() => []),
                apiService.fetchModuleRecords('his_queue_calls', tenantId).catch(() => []),
            ]);

            update(95);

            // ── Write everything to IndexedDB + localStorage ──────────────────
            await Promise.allSettled([
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
                // Finance
                cacheTable('invoices', invoices),
                cacheTable('receipts', receipts),
                cacheTable('vote_heads', voteHeads),
                cacheTable('fee_structures', feeStructures),
                cacheTable('financial_periods', financialPeriods),
                cacheTable('bank_accounts', bankAccounts),
                cacheTable('branches', branches),
                cacheTable('branch_integration_configs', branchIntegrationConfigs),
                cacheTable('inter_bank_transfers', interBankTransfers),
                cacheTable('vote_head_transfers', voteHeadTransfers),
                cacheTable('transactions', transactions),
                // Restaurant & Cafe POS
                cacheTable('cafe_menu_items', cafeMenuItems),
                cacheTable('cafe_orders', cafeOrders),
                cacheTable('retail_sales', retailSales),
                cacheTable('retail_inventory', retailInventory),
                cacheTable('retail_stores', retailStores),
                // EduPulse / Healthcare (HIS)
                cacheTable('his_patients', hisPatients),
                cacheTable('his_appointments', hisAppointments),
                cacheTable('his_vital_statistics', hisVitalStatistics),
                cacheTable('his_clinical_events', hisClinicalEvents),
                cacheTable('his_prescriptions', hisPrescriptions),
                cacheTable('his_prescription_items', hisPrescriptionItems),
                cacheTable('his_pharmacy_inventory', hisPharmacyInventory),
                cacheTable('his_pharmacy_batches', hisPharmacyBatches),
                cacheTable('his_pharmacy_sales', hisPharmacySales),
                cacheTable('his_pharmacy_sale_items', hisPharmacySaleItems),
                cacheTable('his_pharmacy_ledger', hisPharmacyLedger),
                cacheTable('his_pharmacy_staff', hisPharmacyStaff),
                cacheTable('his_pharmacy_settings', hisPharmacySettings),
                cacheTable('his_pharmacy_interactions', hisPharmacyInteractions),
                cacheTable('his_pharmacy_adherence_alerts', hisPharmacyAdherenceAlerts),
                cacheTable('his_lab_requests', hisLabRequests),
                cacheTable('his_partner_labs', hisPartnerLabs),
                cacheTable('his_wards', hisWards),
                cacheTable('his_inpatient_records', hisInpatientRecords),
                cacheTable('his_nurse_tasks', hisNurseTasks),
                cacheTable('his_tariffs', hisTariffs),
                cacheTable('his_claims', hisClaims),
                cacheTable('his_billing_items', hisBillingItems),
                cacheTable('his_invoices', hisInvoices),
                cacheTable('his_payments', hisPayments),
                cacheTable('his_anc_records', hisAncRecords),
                cacheTable('his_delivery_records', hisDeliveryRecords),
                cacheTable('his_cwc_immunizations', hisCwcImmunizations),
                cacheTable('his_nbu_admissions', hisNbuAdmissions),
                cacheTable('his_patient_id_config', hisPatientIdConfig),
                cacheTable('his_audit_logs', hisAuditLogs),
                cacheTable('his_queue_calls', hisQueueCalls),
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
