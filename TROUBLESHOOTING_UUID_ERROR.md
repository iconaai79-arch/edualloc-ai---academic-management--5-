# 🎯 Troubleshooting UUID Type Mismatch

## 🚨 Problem
You might see the error: `ERROR: 42883: operator does not exist: text = uuid`.

This happens because the `counties.admin_id` column was initially created as `TEXT`, but it should be `UUID` to match the `users.id` column in your database.

## ✅ Solution

### Scenario A: Table Does NOT Exist (Most Likely)
If the table creation failed due to the error, simply run the **updated** migration script again. It has been fixed to use `UUID`.

### Scenario B: Table Exists with Wrong Type
If the table was created successfully with `TEXT` type, you need to fix it.

---

## 🚀 How to Fix

I've updated the **Migration Executor Tool** (currently open in your browser) with a new option:

1. **Check if Table Exists**
   - Run the **Diagnostic Tool** (`database/diagnostic_tool.html`)
   - If it says "Counties table exists!", proceed to step 2.
   - If it says "Counties table does NOT exist", skip to step 3.

2. **Run the FIX Script** (Table Exists)
   - Go to the **Migration Executor** (`database/migration_executor.html`)
   - Click "Copy FIX SQL to Clipboard" in Step 3A
   - Paste and run in Supabase SQL Editor

3. **Run the Migration Script** (Table Missing)
   - Go to the **Migration Executor**
   - Click "Copy SQL to Clipboard" in Step 1
   - Paste and run in Supabase SQL Editor

---

## 📝 SQL for Manually Fixing (If needed)

```sql
-- step 1: drop constraint
ALTER TABLE counties DROP CONSTRAINT IF EXISTS fk_county_admin;

-- step 2: change column type
ALTER TABLE counties ALTER COLUMN admin_id TYPE UUID USING admin_id::UUID;

-- step 3: re-add constraint
ALTER TABLE counties
ADD CONSTRAINT fk_county_admin 
    FOREIGN KEY (admin_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL;
```

---

**Status:** ✅ Fix scripts ready and tool updated
**Date:** 2026-02-08
