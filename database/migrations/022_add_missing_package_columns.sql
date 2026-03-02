-- Migration: 022_add_missing_package_columns
-- Description: Adds missing columns to carwash_packages to match the CarWashPackage frontend interface

DO $$
BEGIN
    -- Add description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_packages' AND column_name = 'description') THEN
        ALTER TABLE public.carwash_packages ADD COLUMN description TEXT;
    END IF;

    -- Add is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_packages' AND column_name = 'is_active') THEN
        ALTER TABLE public.carwash_packages ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add commission_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_packages' AND column_name = 'commission_type') THEN
        ALTER TABLE public.carwash_packages ADD COLUMN commission_type TEXT;
    END IF;

    -- Add commission_value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_packages' AND column_name = 'commission_value') THEN
        ALTER TABLE public.carwash_packages ADD COLUMN commission_value DECIMAL(10, 2);
    END IF;

    -- Rename estimated_duration_minutes to estimated_minutes to match frontend if needed, 
    -- but usually Supabase translates snake_case to camelCase so estimatedMinutes expects estimated_minutes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_packages' AND column_name = 'estimated_duration_minutes') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_packages' AND column_name = 'estimated_minutes') THEN
        ALTER TABLE public.carwash_packages RENAME COLUMN estimated_duration_minutes TO estimated_minutes;
    END IF;

    -- Rename is_interior_only to includes_interior to match frontend
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_packages' AND column_name = 'is_interior_only') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_packages' AND column_name = 'includes_interior') THEN
        ALTER TABLE public.carwash_packages RENAME COLUMN is_interior_only TO includes_interior;
    END IF;

    -- Rename color_accent to color to match frontend
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_packages' AND column_name = 'color_accent') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_packages' AND column_name = 'color') THEN
        ALTER TABLE public.carwash_packages RENAME COLUMN color_accent TO color;
    END IF;

END $$;
