# County Management Database Migration

## 📋 Overview
This directory contains SQL migration scripts to add county management functionality to your database.

## 📁 Files

1. **`county_management_migration.sql`** - Complete migration script (RECOMMENDED)
2. **`counties_schema.sql`** - Counties table creation only
3. **`add_county_to_institutions.sql`** - Institutions table update only
4. **`execute_migration.js`** - Helper script to display migration instructions

## 🚀 Quick Start - Execute Migration

### Option 1: Supabase SQL Editor (RECOMMENDED)

1. **Open Supabase Dashboard**
   - Go to your Supabase project: https://app.supabase.com
   - Navigate to **SQL Editor** in the left sidebar

2. **Create New Query**
   - Click **"New Query"** button

3. **Copy Migration SQL**
   - Open `database/county_management_migration.sql`
   - Copy the entire contents

4. **Execute**
   - Paste into the SQL editor
   - Click **"Run"** button
   - Wait for success confirmation

### Option 2: Via Application Interface

1. **Start Application**
   ```bash
   npm run dev
   ```

2. **Login as Super Admin**
   - Use your super admin credentials

3. **Schema Initialization**
   - If prompted for schema initialization
   - Paste the contents of `county_management_migration.sql`
   - Click "Run Registry Setup"

### Option 3: Command Line (psql)

If you have direct database access:

```bash
psql -h your-supabase-host.supabase.co \
     -U postgres \
     -d postgres \
     -f database/county_management_migration.sql
```

## 📊 What Gets Created

### New Table: `counties`
- **id** - Unique identifier
- **name** - County name
- **code** - Unique county code (e.g., NRB-001)
- **email** - Contact email
- **phone_number** - Contact phone
- **admin_id** - Assigned county administrator
- **status** - active | suspended
- **created_at** - Registration timestamp
- **location** - GPS coordinates (JSON)

### Updated Table: `institutions`
- **county_id** - Link to county (new column)

### Security Features
- ✅ Row Level Security (RLS) enabled
- ✅ Super admins have full access
- ✅ County admins can only manage their assigned county
- ✅ County admins can manage institutions in their county

### Indexes Created
- Counties: name, code, admin_id, status, created_at
- Institutions: county_id

## ✅ Verification

After running the migration, verify it worked:

```sql
-- Check if counties table exists
SELECT * FROM information_schema.tables WHERE table_name = 'counties';

-- Check if county_id was added to institutions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'institutions' AND column_name = 'county_id';

-- View RLS policies
SELECT * FROM pg_policies WHERE tablename = 'counties';
```

## 🔄 Rollback (if needed)

If you need to undo the migration:

```sql
-- Remove RLS policies
DROP POLICY IF EXISTS "Super admins have full access to counties" ON counties;
DROP POLICY IF EXISTS "County admins can view their assigned county" ON counties;
DROP POLICY IF EXISTS "County admins can update their assigned county" ON counties;
DROP POLICY IF EXISTS "County admins can view institutions in their county" ON institutions;
DROP POLICY IF EXISTS "County admins can update institutions in their county" ON institutions;
DROP POLICY IF EXISTS "County admins can insert institutions in their county" ON institutions;

-- Remove foreign key
ALTER TABLE institutions DROP CONSTRAINT IF EXISTS fk_institution_county;

-- Remove county_id column
ALTER TABLE institutions DROP COLUMN IF EXISTS county_id;

-- Drop counties table
DROP TABLE IF EXISTS counties;
```

## 📝 Notes

- The migration is **idempotent** - safe to run multiple times
- Uses `IF NOT EXISTS` and `IF EXISTS` checks
- No data loss - only adds new structures
- Existing data remains unchanged

## 🆘 Troubleshooting

### Error: "relation 'users' does not exist"
- Ensure the users table exists first
- Run the main application schema setup

### Error: "permission denied"
- Ensure you're logged in with sufficient privileges
- Use the postgres user or a user with CREATE TABLE permissions

### Error: "policy already exists"
- The script handles this automatically
- Drops existing policies before recreating

## 📞 Support

If you encounter issues:
1. Check the Supabase logs in the dashboard
2. Verify your database connection
3. Ensure you have the correct permissions
4. Review the error message carefully

## ✨ Next Steps

After successful migration:
1. Restart your application
2. Clear browser cache (Ctrl+Shift+R)
3. Login as Super Admin
4. Navigate to **Institutions → Counties**
5. Start registering counties!

---

**Last Updated:** 2026-02-08
**Version:** 1.0.0
