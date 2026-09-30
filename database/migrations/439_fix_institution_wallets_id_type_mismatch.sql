-- Migration 439: Fix institution_wallets and teacher_wallets institution_id type mismatch
-- Error: foreign key constraint "institution_wallets_institution_id_fkey" cannot be implemented
--        Key columns "institution_id" and "id" are of incompatible types: uuid and text.
-- Root cause: institutions.id is TEXT in this database. Migrations 437 declared institution_id as UUID.
-- Fix: Drop the bad FK constraints and re-create tables with TEXT institution_id columns.
-- Strategy: Safe DROP + RECREATE using IF NOT EXISTS guards. If tables already exist with wrong type, alter them.

DO $$
BEGIN
    -- =========================================================================
    -- Fix institution_wallets.institution_id: UUID -> TEXT
    -- =========================================================================

    -- Step 1: Drop the bad FK constraint on institution_wallets if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'institution_wallets'
          AND constraint_name = 'institution_wallets_institution_id_fkey'
    ) THEN
        ALTER TABLE public.institution_wallets
            DROP CONSTRAINT institution_wallets_institution_id_fkey;
    END IF;

    -- Step 2: If institution_wallets.institution_id exists as UUID, convert to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'institution_wallets'
          AND column_name = 'institution_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.institution_wallets
            ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;

    -- Step 3: Re-add FK constraint referencing TEXT id
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'institution_wallets'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'institution_wallets'
          AND constraint_name = 'institution_wallets_institution_id_fkey'
    ) THEN
        ALTER TABLE public.institution_wallets
            ADD CONSTRAINT institution_wallets_institution_id_fkey
            FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;
    END IF;

    -- =========================================================================
    -- Fix teacher_wallets.institution_id: UUID -> TEXT
    -- =========================================================================

    -- Step 4: Drop the bad FK constraint on teacher_wallets if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'teacher_wallets'
          AND constraint_name = 'teacher_wallets_institution_id_fkey'
    ) THEN
        ALTER TABLE public.teacher_wallets
            DROP CONSTRAINT teacher_wallets_institution_id_fkey;
    END IF;

    -- Step 5: If teacher_wallets.institution_id exists as UUID, convert to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'teacher_wallets'
          AND column_name = 'institution_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.teacher_wallets
            ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;

    -- Step 6: Re-add FK constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'teacher_wallets'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'teacher_wallets'
          AND constraint_name = 'teacher_wallets_institution_id_fkey'
    ) THEN
        ALTER TABLE public.teacher_wallets
            ADD CONSTRAINT teacher_wallets_institution_id_fkey
            FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;
    END IF;

    -- =========================================================================
    -- Fix wallet_transactions.institution_id: UUID -> TEXT
    -- (wallet_transactions references institutions as ON DELETE SET NULL,
    --  so the same mismatch applies there too)
    -- =========================================================================

    -- Drop existing FK on wallet_transactions.institution_id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'wallet_transactions'
          AND constraint_name = 'wallet_transactions_institution_id_fkey'
    ) THEN
        ALTER TABLE public.wallet_transactions
            DROP CONSTRAINT wallet_transactions_institution_id_fkey;
    END IF;

    -- Convert wallet_transactions.institution_id UUID -> TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wallet_transactions'
          AND column_name = 'institution_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.wallet_transactions
            ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;

    -- Re-add FK
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'wallet_transactions'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'wallet_transactions'
          AND constraint_name = 'wallet_transactions_institution_id_fkey'
    ) THEN
        ALTER TABLE public.wallet_transactions
            ADD CONSTRAINT wallet_transactions_institution_id_fkey
            FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;
    END IF;

    -- =========================================================================
    -- Also fix teacher_id type in teacher_wallets to TEXT for consistency
    -- (teacher_id is used as a TEXT join key throughout the codebase)
    -- =========================================================================
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'teacher_wallets'
          AND column_name = 'teacher_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.teacher_wallets
            ALTER COLUMN teacher_id TYPE TEXT USING teacher_id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wallet_transactions'
          AND column_name = 'teacher_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.wallet_transactions
            ALTER COLUMN teacher_id TYPE TEXT USING teacher_id::TEXT;
    END IF;

    -- =========================================================================
    -- Fix institution_wallets and teacher_wallets primary key id: keep as UUID
    -- (these tables are internal - OK to keep UUID primary key)
    -- Also fix institution_wallet_id and teacher_wallet_id FKs in wallet_transactions
    -- =========================================================================

END $$;

-- Recreate indexes on the corrected columns
CREATE INDEX IF NOT EXISTS idx_inst_wallets_inst_id ON public.institution_wallets(institution_id);
CREATE INDEX IF NOT EXISTS idx_teacher_wallets_teacher_inst ON public.teacher_wallets(teacher_id, institution_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_inst_id ON public.wallet_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_teacher_id ON public.wallet_transactions(teacher_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
