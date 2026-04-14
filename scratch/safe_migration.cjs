const { Client } = require('pg');

async function run() {
    const client = new Client({
        connectionString: "postgresql://postgres.iconaai79-arch:v-O%7D%3FGp%5B7%40I_v4B@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const sql = `
            CREATE OR REPLACE FUNCTION public.reconcile_sms_payment_safe(
                p_inst_id TEXT, 
                p_amount INTEGER, 
                p_txn_id TEXT, 
                p_table TEXT,
                p_units INTEGER
            )
            RETURNS boolean AS $$
            DECLARE
                v_reconciled TEXT;
                v_meta JSONB;
            BEGIN
                -- 1. Fetch current status and metadata
                EXECUTE format('SELECT metadata->>''reconciled'', metadata FROM %I WHERE id = %L', p_table, p_txn_id) 
                INTO v_reconciled, v_meta;

                -- 2. Check if already processed
                IF v_reconciled = 'true' OR v_reconciled = 'processing' THEN
                    RETURN FALSE;
                END IF;

                -- 3. Mark as processing (Lock)
                EXECUTE format('UPDATE %I SET metadata = jsonb_set(COALESCE(metadata, ''{}''), ''{reconciled}'', ''"processing"'') WHERE id = %L', p_table, p_txn_id);

                -- 4. Perform balance increment
                PERFORM public.increment_sms_balance(p_inst_id, p_units);

                -- 5. Mark as reconciled (Success)
                EXECUTE format('UPDATE %I SET metadata = jsonb_set(COALESCE(metadata, ''{}''), ''{reconciled}'', ''true'') WHERE id = %L', p_table, p_txn_id);

                RETURN TRUE;
            EXCEPTION WHEN OTHERS THEN
                -- Reset if failed
                EXECUTE format('UPDATE %I SET metadata = jsonb_set(COALESCE(metadata, ''{}''), ''{reconciled}'', ''"failed"'') WHERE id = %L', p_table, p_txn_id);
                RAISE;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;

        await client.query(sql);
        console.log("Safe reconciliation RPC created successfully.");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
