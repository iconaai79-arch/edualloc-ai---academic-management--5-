-- Add RLS Policies for Car Wash Tables

-- Drop existing policies if they exist (to be safe and idempotent)
DROP POLICY IF EXISTS "Enable read access for all" ON carwash_packages;
DROP POLICY IF EXISTS "Enable insert access for all" ON carwash_packages;
DROP POLICY IF EXISTS "Enable update access for all" ON carwash_packages;
DROP POLICY IF EXISTS "Enable delete access for all" ON carwash_packages;

DROP POLICY IF EXISTS "Enable read access for all" ON carwash_customers;
DROP POLICY IF EXISTS "Enable insert access for all" ON carwash_customers;
DROP POLICY IF EXISTS "Enable update access for all" ON carwash_customers;
DROP POLICY IF EXISTS "Enable delete access for all" ON carwash_customers;

DROP POLICY IF EXISTS "Enable read access for all" ON carwash_vehicles;
DROP POLICY IF EXISTS "Enable insert access for all" ON carwash_vehicles;
DROP POLICY IF EXISTS "Enable update access for all" ON carwash_vehicles;
DROP POLICY IF EXISTS "Enable delete access for all" ON carwash_vehicles;

DROP POLICY IF EXISTS "Enable read access for all" ON carwash_jobs;
DROP POLICY IF EXISTS "Enable insert access for all" ON carwash_jobs;
DROP POLICY IF EXISTS "Enable update access for all" ON carwash_jobs;
DROP POLICY IF EXISTS "Enable delete access for all" ON carwash_jobs;

DROP POLICY IF EXISTS "Enable read access for all" ON carwash_inventory;
DROP POLICY IF EXISTS "Enable insert access for all" ON carwash_inventory;
DROP POLICY IF EXISTS "Enable update access for all" ON carwash_inventory;
DROP POLICY IF EXISTS "Enable delete access for all" ON carwash_inventory;

DROP POLICY IF EXISTS "Enable read access for all" ON carwash_shifts;
DROP POLICY IF EXISTS "Enable insert access for all" ON carwash_shifts;
DROP POLICY IF EXISTS "Enable update access for all" ON carwash_shifts;
DROP POLICY IF EXISTS "Enable delete access for all" ON carwash_shifts;

DROP POLICY IF EXISTS "Enable read access for all" ON carwash_feedback;
DROP POLICY IF EXISTS "Enable insert access for all" ON carwash_feedback;
DROP POLICY IF EXISTS "Enable update access for all" ON carwash_feedback;
DROP POLICY IF EXISTS "Enable delete access for all" ON carwash_feedback;

-- Create generic policies for carwash_packages
CREATE POLICY "Enable read access for all" ON carwash_packages FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON carwash_packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON carwash_packages FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all" ON carwash_packages FOR DELETE USING (true);

-- Create generic policies for carwash_customers
CREATE POLICY "Enable read access for all" ON carwash_customers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON carwash_customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON carwash_customers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all" ON carwash_customers FOR DELETE USING (true);

-- Create generic policies for carwash_vehicles
CREATE POLICY "Enable read access for all" ON carwash_vehicles FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON carwash_vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON carwash_vehicles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all" ON carwash_vehicles FOR DELETE USING (true);

-- Create generic policies for carwash_jobs
CREATE POLICY "Enable read access for all" ON carwash_jobs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON carwash_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON carwash_jobs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all" ON carwash_jobs FOR DELETE USING (true);

-- Create generic policies for carwash_inventory
CREATE POLICY "Enable read access for all" ON carwash_inventory FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON carwash_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON carwash_inventory FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all" ON carwash_inventory FOR DELETE USING (true);

-- Create generic policies for carwash_shifts
CREATE POLICY "Enable read access for all" ON carwash_shifts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON carwash_shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON carwash_shifts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all" ON carwash_shifts FOR DELETE USING (true);

-- Create generic policies for carwash_feedback
CREATE POLICY "Enable read access for all" ON carwash_feedback FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON carwash_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON carwash_feedback FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all" ON carwash_feedback FOR DELETE USING (true);
