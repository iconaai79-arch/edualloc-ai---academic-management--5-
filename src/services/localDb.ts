const STORE_NAMES = [
    'users', 'institutions', 'constituencies', 'requisitions', 'sms_logs', 'sms_outbox', 'sync_queue',
    'departments', 'subjects', 'courses', 'allocation_requests', 'academic_years', 'semesters',
    'rooms', 'buildings', 'academic_levels', 'tasks', 'transactions', 'receipts', 'activity_log',
    'notifications', 'institution_module_states', 'school_registry', 'events', 'counties', 'settings',
    'election_events', 'election_candidates', 'election_voters_ledger', 'election_ballots', 'election_checkins',
    'bc_settings', 'bc_courses', 'bc_students', 'bc_trainers', 'bc_fee_structures', 'bc_invoices', 'bc_payments', 'bc_practicals',
    // Library module stores
    'books', 'library_transactions', 'library_fines', 'library_settings',
    'book_reservations', 'book_stock_receipts', 'student_enrollments',
    // Security module stores
    'visitors', 'watchlist_records', 'security_alerts', 'event_pins',
    'institution_events', 'building_visitor_logs', 'building_visitor_assets',
    // Finance module stores
    'invoices', 'vote_heads', 'fee_structures', 'financial_periods', 'bank_accounts', 'branches', 'branch_integration_configs', 'inter_bank_transfers', 'vote_head_transfers',
    // Restaurant & Cafe POS module stores
    'cafe_menu_items', 'cafe_orders', 'retail_sales', 'retail_inventory', 'retail_stores',
    // EduPulse / Healthcare module stores
    'his_patients', 'his_appointments', 'his_vital_statistics', 'his_clinical_events',
    'his_prescriptions', 'his_prescription_items', 'his_pharmacy_inventory', 'his_pharmacy_batches',
    'his_pharmacy_sales', 'his_pharmacy_sale_items', 'his_pharmacy_ledger', 'his_pharmacy_staff',
    'his_pharmacy_settings', 'his_pharmacy_interactions', 'his_pharmacy_adherence_alerts',
    'his_lab_requests', 'his_partner_labs', 'his_wards', 'his_inpatient_records',
    'his_nurse_tasks', 'his_tariffs', 'his_claims', 'his_billing_items', 'his_invoices',
    'his_payments', 'his_anc_records', 'his_delivery_records', 'his_cwc_immunizations',
    'his_nbu_admissions', 'his_patient_id_config', 'his_audit_logs', 'his_queue_calls',
    'health_vital_statistics', 'health_prescriptions', 'health_clinical_events', 'health_patients', 'health_appointments',
    // Driving School & Extended stores
    'ds_settings', 'ds_instructors', 'ds_vehicles', 'ds_students', 'ds_lessons', 'ds_skill_mastery', 'ds_invoices', 'ds_payments', 'ds_votes', 'ds_license_categories', 'ds_leads', 'ds_expenditures', 'ncba_transactions', 'mpesa_transactions', 'bank_transactions', 'transport_bills', 'fee_promises', 'app_notifications'
];

class LocalDb {
    private dbName = 'eduai_offline_db';
    private dbVersion = 3;
    private db: IDBDatabase | null = null;

    private getDB(): Promise<IDBDatabase> {
        if (this.db) return Promise.resolve(this.db);
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    STORE_NAMES.forEach(storeName => {
                        if (!db.objectStoreNames.contains(storeName)) {
                            db.createObjectStore(storeName, { keyPath: 'id' });
                        }
                    });
                };
                request.onsuccess = () => {
                    this.db = request.result;
                    resolve(this.db);
                };
                request.onerror = () => {
                    reject(request.error);
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    async put(storeName: string, item: any): Promise<void> {
        if (!item || typeof item !== 'object') return;
        try {
            const db = await this.getDB();
            if (!db.objectStoreNames.contains(storeName)) {
                return; // Gracefully skip if store does not exist in older schema
            }
            // Ensure valid unique id for keyPath: 'id'
            const payload = { ...item };
            if (!payload.id) {
                payload.id = payload._id || payload.code || payload.uuid || payload.key || payload.patient_id || payload.user_id || payload.institutionId || `${storeName}_${Math.random().toString(36).slice(2)}`;
            }

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);
                    store.put(payload);
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => {
                        console.warn(`[LocalDb] put failed on store ${storeName}:`, tx.error);
                        resolve(); // Resolve safely so offline sync is not aborted
                    };
                } catch (e) {
                    console.warn(`[LocalDb] transaction error on ${storeName}:`, e);
                    resolve();
                }
            });
        } catch (err) {
            console.warn(`[LocalDb] put exception on ${storeName}:`, err);
        }
    }

    async upsert(storeName: string, item: any): Promise<void> {
        return this.put(storeName, item);
    }

    async get(storeName: string, id: string): Promise<any> {
        try {
            const db = await this.getDB();
            if (!db.objectStoreNames.contains(storeName)) return null;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(storeName, 'readonly');
                    const store = tx.objectStore(storeName);
                    const request = store.get(id);
                    request.onsuccess = () => resolve(request.result || null);
                    request.onerror = () => resolve(null);
                } catch {
                    resolve(null);
                }
            });
        } catch {
            return null;
        }
    }

    async getAll(storeName: string): Promise<any[]> {
        try {
            const db = await this.getDB();
            if (!db.objectStoreNames.contains(storeName)) return [];
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(storeName, 'readonly');
                    const store = tx.objectStore(storeName);
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => resolve([]);
                } catch {
                    resolve([]);
                }
            });
        } catch {
            return [];
        }
    }

    async delete(storeName: string, id: string): Promise<void> {
        try {
            const db = await this.getDB();
            if (!db.objectStoreNames.contains(storeName)) return;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);
                    store.delete(id);
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => resolve();
                } catch {
                    resolve();
                }
            });
        } catch {}
    }

    async clear(storeName: string): Promise<void> {
        try {
            const db = await this.getDB();
            if (!db.objectStoreNames.contains(storeName)) return;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);
                    store.clear();
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => resolve();
                } catch {
                    resolve();
                }
            });
        } catch {}
    }

    async clearAll(): Promise<void> {
        for (const store of STORE_NAMES) {
            await this.clear(store);
        }
    }
}

export const localDb = new LocalDb();
