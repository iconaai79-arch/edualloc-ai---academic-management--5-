const STORE_NAMES = [
    'users', 'institutions', 'constituencies', 'requisitions', 'sms_logs', 'sms_outbox', 'sync_queue',
    'departments', 'subjects', 'courses', 'allocation_requests', 'academic_years', 'semesters',
    'rooms', 'buildings', 'academic_levels', 'tasks', 'transactions', 'receipts', 'activity_log',
    'notifications', 'institution_module_states', 'school_registry',
    'election_events', 'election_candidates', 'election_voters_ledger', 'election_ballots', 'election_checkins',
    'bc_settings', 'bc_courses', 'bc_students', 'bc_trainers', 'bc_fee_structures', 'bc_invoices', 'bc_payments', 'bc_practicals',
    // Library module stores
    'books', 'library_transactions', 'library_fines', 'library_settings',
    'book_reservations', 'book_stock_receipts', 'student_enrollments',
    // Security module stores
    'visitors', 'watchlist_records', 'security_alerts', 'event_pins',
    'institution_events', 'building_visitor_logs', 'building_visitor_assets'
];

class LocalDb {
    private dbName = 'eduai_offline_db';
    private dbVersion = 1;
    private db: IDBDatabase | null = null;

    private getDB(): Promise<IDBDatabase> {
        if (this.db) return Promise.resolve(this.db);
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onupgradeneeded = (e) => {
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
        });
    }

    async put(storeName: string, item: any): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.put(item);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async get(storeName: string, id: string): Promise<any> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName: string): Promise<any[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName: string, id: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async clear(storeName: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async clearAll(): Promise<void> {
        for (const store of STORE_NAMES) {
            await this.clear(store);
        }
    }
}

export const localDb = new LocalDb();
