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
    'invoices', 'receipts', 'expenses', 'financial_goals', 'vote_heads', 'fee_structures', 'financial_periods',
    'bank_accounts', 'school_bank_accounts', 'finance_numbering_configs', 'branches', 'branch_integration_configs',
    'inter_bank_transfers', 'inter_vote_transfers', 'vote_head_transfers', 'ng_cdf_school_grants', 'payroll_records',
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
    'ds_settings', 'ds_instructors', 'ds_vehicles', 'ds_students', 'ds_lessons', 'ds_skill_mastery', 'ds_invoices', 'ds_payments', 'ds_votes', 'ds_license_categories', 'ds_leads', 'ds_expenditures', 'ncba_transactions', 'mpesa_transactions', 'bank_transactions', 'transport_bills', 'fee_promises', 'app_notifications',
    'alumnae_members', 'campaign_members'
];

class LocalDb {
    private dbName = 'eduai_offline_db';
    private dbVersion = 4;
    private db: IDBDatabase | null = null;
    /** Singleton open promise — prevents concurrent open/recovery races */
    private openPromise: Promise<IDBDatabase | null> | null = null;
    /** Set to false permanently if IndexedDB is unavailable (private mode, quota, policy) */
    private isAvailable = true;

    private openInternal(): Promise<IDBDatabase> {
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
                    // Listen for unexpected version-change closes (another tab deleted/upgraded the DB)
                    this.db.onversionchange = () => {
                        this.db?.close();
                        this.db = null;
                        this.openPromise = null;
                    };
                    resolve(this.db);
                };
                request.onerror = () => reject(request.error);
                request.onblocked = () => reject(new Error('IndexedDB open blocked'));
            } catch (err) {
                reject(err);
            }
        });
    }

    /** Attempt to delete the corrupted database and recreate it from scratch */
    private recoverDB(): Promise<IDBDatabase | null> {
        return new Promise((resolve) => {
            console.warn('[LocalDb] Attempting recovery: deleting corrupted IndexedDB backing store...');
            try {
                const deleteReq = indexedDB.deleteDatabase(this.dbName);
                deleteReq.onsuccess = async () => {
                    console.info('[LocalDb] Corrupted DB deleted. Recreating...');
                    try {
                        const freshDb = await this.openInternal();
                        console.info('[LocalDb] Recovery successful — offline cache rebuilt.');
                        resolve(freshDb);
                    } catch (reopenErr) {
                        console.error('[LocalDb] Recovery failed on reopen:', reopenErr);
                        this.isAvailable = false;
                        resolve(null);
                    }
                };
                deleteReq.onerror = (e) => {
                    console.error('[LocalDb] Recovery: deleteDatabase failed:', e);
                    this.isAvailable = false;
                    resolve(null);
                };
                deleteReq.onblocked = () => {
                    console.warn('[LocalDb] Recovery: deleteDatabase blocked (another tab open). Disabling offline cache.');
                    this.isAvailable = false;
                    resolve(null);
                };
            } catch (err) {
                console.error('[LocalDb] Recovery: unexpected error:', err);
                this.isAvailable = false;
                resolve(null);
            }
        });
    }

    private getDB(): Promise<IDBDatabase | null> {
        if (!this.isAvailable) return Promise.resolve(null);
        if (this.db) return Promise.resolve(this.db);
        if (this.openPromise) return this.openPromise;

        this.openPromise = this.openInternal()
            .then((db) => {
                this.openPromise = null;
                return db;
            })
            .catch(async (err) => {
                this.openPromise = null;
                this.db = null;
                console.warn('[LocalDb] Initial open failed, attempting recovery:', err?.message ?? err);
                // Only attempt recovery for backing-store / unknown errors, not version errors
                const msg = (err?.message ?? '').toLowerCase();
                if (msg.includes('internal') || msg.includes('unknown') || msg.includes('backing')) {
                    return this.recoverDB();
                }
                // For other errors (blocked, quota, private mode) disable gracefully
                this.isAvailable = false;
                return null;
            });

        return this.openPromise;
    }

    async put(storeName: string, item: any): Promise<void> {
        if (!item || typeof item !== 'object') return;
        try {
            const db = await this.getDB();
            if (!db || !db.objectStoreNames.contains(storeName)) {
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

    async bulkPut(storeName: string, items: any[]): Promise<void> {
        if (!Array.isArray(items) || items.length === 0) return;
        try {
            const db = await this.getDB();
            if (!db || !db.objectStoreNames.contains(storeName)) return;

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);
                    for (const raw of items) {
                        if (!raw || typeof raw !== 'object') continue;
                        const payload = { ...raw };
                        if (!payload.id) {
                            payload.id = payload._id || payload.code || payload.uuid || payload.key || payload.patient_id || payload.user_id || payload.institutionId || `${storeName}_${Math.random().toString(36).slice(2)}`;
                        }
                        store.put(payload);
                    }
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => {
                        console.warn(`[LocalDb] bulkPut failed on store ${storeName}:`, tx.error);
                        resolve();
                    };
                } catch (e) {
                    console.warn(`[LocalDb] bulkPut transaction error on ${storeName}:`, e);
                    resolve();
                }
            });
        } catch (err) {
            console.warn(`[LocalDb] bulkPut exception on ${storeName}:`, err);
        }
    }

    async get<T = any>(storeName: string, id: string): Promise<T | null> {
        try {
            const db = await this.getDB();
            if (!db || !db.objectStoreNames.contains(storeName)) return null;
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

    async getAll<T = any>(storeName: string): Promise<T[]> {
        try {
            const db = await this.getDB();
            if (!db || !db.objectStoreNames.contains(storeName)) return [];
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(storeName, 'readonly');
                    const store = tx.objectStore(storeName);
                    const request = store.getAll();
                    request.onsuccess = () => resolve((request.result || []) as T[]);
                    request.onerror = () => resolve([] as T[]);
                } catch {
                    resolve([] as T[]);
                }
            });
        } catch {
            return [];
        }
    }

    async bulkGet<T = any>(storeName: string, ids: string[]): Promise<(T | null)[]> {
        if (!Array.isArray(ids) || ids.length === 0) return [];
        try {
            const db = await this.getDB();
            if (!db || !db.objectStoreNames.contains(storeName)) return ids.map(() => null);
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(storeName, 'readonly');
                    const store = tx.objectStore(storeName);
                    const results: (T | null)[] = new Array(ids.length);
                    let completed = 0;

                    ids.forEach((id, index) => {
                        const request = store.get(id);
                        request.onsuccess = () => {
                            results[index] = request.result || null;
                            completed++;
                            if (completed === ids.length) resolve(results);
                        };
                        request.onerror = () => {
                            results[index] = null;
                            completed++;
                            if (completed === ids.length) resolve(results);
                        };
                    });

                    tx.onerror = () => resolve(results);
                } catch {
                    resolve(ids.map(() => null));
                }
            });
        } catch {
            return ids.map(() => null);
        }
    }

    async delete(storeName: string, id: string): Promise<void> {
        try {
            const db = await this.getDB();
            if (!db || !db.objectStoreNames.contains(storeName)) return;
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

    async bulkDelete(storeName: string, ids: string[]): Promise<void> {
        if (!Array.isArray(ids) || ids.length === 0) return;
        try {
            const db = await this.getDB();
            if (!db || !db.objectStoreNames.contains(storeName)) return;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);
                    for (const id of ids) {
                        if (id) store.delete(id);
                    }
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => {
                        console.warn(`[LocalDb] bulkDelete failed on store ${storeName}:`, tx.error);
                        resolve();
                    };
                } catch (e) {
                    console.warn(`[LocalDb] bulkDelete transaction error on ${storeName}:`, e);
                    resolve();
                }
            });
        } catch (err) {
            console.warn(`[LocalDb] bulkDelete exception on ${storeName}:`, err);
        }
    }

    async clear(storeName: string): Promise<void> {
        try {
            const db = await this.getDB();
            if (!db || !db.objectStoreNames.contains(storeName)) return;
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

    async replaceAll(storeName: string, items: any[]): Promise<void> {
        try {
            const db = await this.getDB();
            if (!db || !db.objectStoreNames.contains(storeName)) return;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);
                    store.clear();
                    for (const item of items) {
                        if (!item || typeof item !== 'object') continue;
                        const payload = { ...item };
                        if (!payload.id) {
                            payload.id = payload._id || payload.code || payload.uuid || payload.key || payload.patient_id || payload.user_id || payload.institutionId || `${storeName}_${Math.random().toString(36).slice(2)}`;
                        }
                        store.put(payload);
                    }
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => {
                        console.warn(`[LocalDb] replaceAll failed on ${storeName}:`, tx.error);
                        resolve();
                    };
                } catch (e) {
                    console.warn(`[LocalDb] replaceAll error on ${storeName}:`, e);
                    resolve();
                }
            });
        } catch (err) {
            console.warn(`[LocalDb] replaceAll exception on ${storeName}:`, err);
        }
    }


    async clearAll(): Promise<void> {
        for (const store of STORE_NAMES) {
            await this.clear(store);
        }
    }
}

export const localDb = new LocalDb();
