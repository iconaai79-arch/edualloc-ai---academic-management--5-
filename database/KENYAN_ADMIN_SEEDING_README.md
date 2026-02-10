# Kenyan Administrative Units - Supabase Seeding

This directory contains scripts and data to populate your Supabase database with all Kenyan administrative units (counties, subcounties, constituencies, and wards).

## 📁 Files

- **`kenyan_admin_data.json`** - Complete data for all 47 counties (currently includes full data for Nairobi and Mombasa)
- **`seed_kenyan_admin_units.js`** - Node.js script to seed data to Supabase
- **`migrations/001_kenyan_counties_base.sql`** - SQL schema for tables

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js dotenv
```

### 2. Set Up Environment Variables

Make sure your `.env` file has Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Create Tables in Supabase

Run the SQL migration in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of migrations/001_kenyan_counties_base.sql
```

Or use the Supabase CLI:

```bash
supabase db push
```

### 4. Run the Seeding Script

```bash
node database/seed_kenyan_admin_units.js
```

## 📊 Current Data Coverage

### ✅ Complete Data
- **Nairobi County** - All 17 constituencies and 85 wards
- **Mombasa County** - All 6 constituencies and 30 wards
- **Kiambu County** - All 12 subcounties and constituencies

### 📝 All 47 Counties Included
The base county list includes all counties from Mombasa (001) to Nairobi (047).

## 🔧 Extending the Data

To add more counties with full ward data, edit `kenyan_admin_data.json`:

### Add Subcounties

```json
{
  "subcounties": [
    { "county_code": "019", "name": "Nyeri Central" },
    { "county_code": "019", "name": "Nyeri South" }
  ]
}
```

### Add Constituencies

```json
{
  "constituencies": [
    { "county_code": "019", "name": "Nyeri Town" },
    { "county_code": "019", "name": "Mathira" }
  ]
}
```

### Add Wards

```json
{
  "wards": [
    {
      "county_code": "019",
      "constituency_name": "Nyeri Town",
      "subcounty_name": "Nyeri Central",
      "name": "Kamakwa/Mukaro"
    }
  ]
}
```

## 📋 Database Schema

### Counties Table
```sql
CREATE TABLE counties (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Subcounties Table
```sql
CREATE TABLE subcounties (
    id SERIAL PRIMARY KEY,
    county_id INTEGER NOT NULL REFERENCES counties(id),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(county_id, name)
);
```

### Constituencies Table
```sql
CREATE TABLE constituencies (
    id SERIAL PRIMARY KEY,
    county_id INTEGER NOT NULL REFERENCES counties(id),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(county_id, name)
);
```

### Wards Table
```sql
CREATE TABLE wards (
    id SERIAL PRIMARY KEY,
    constituency_id INTEGER NOT NULL REFERENCES constituencies(id),
    subcounty_id INTEGER REFERENCES subcounties(id),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(constituency_id, name)
);
```

## 🔍 Querying the Data

### Get all wards in a county

```sql
SELECT 
    c.name as county,
    const.name as constituency,
    w.name as ward
FROM counties c
JOIN constituencies const ON c.id = const.county_id
JOIN wards w ON const.id = w.constituency_id
WHERE c.code = '047'
ORDER BY const.name, w.name;
```

### Get county hierarchy

```sql
SELECT 
    c.name as county,
    sc.name as subcounty,
    const.name as constituency,
    w.name as ward
FROM counties c
LEFT JOIN subcounties sc ON c.id = sc.county_id
LEFT JOIN constituencies const ON c.id = const.county_id
LEFT JOIN wards w ON const.id = w.constituency_id
WHERE c.code = '047'
ORDER BY sc.name, const.name, w.name;
```

### Count administrative units

```sql
SELECT 
    (SELECT COUNT(*) FROM counties) as counties,
    (SELECT COUNT(*) FROM subcounties) as subcounties,
    (SELECT COUNT(*) FROM constituencies) as constituencies,
    (SELECT COUNT(*) FROM wards) as wards;
```

## 🎯 Integration with Your App

### TypeScript Types

```typescript
export interface County {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export interface Subcounty {
  id: number;
  county_id: number;
  name: string;
  created_at: string;
}

export interface Constituency {
  id: number;
  county_id: number;
  name: string;
  created_at: string;
}

export interface Ward {
  id: number;
  constituency_id: number;
  subcounty_id: number | null;
  name: string;
  created_at: string;
}
```

### Fetching Data in Your App

```typescript
// Get all counties
const { data: counties } = await supabase
  .from('counties')
  .select('*')
  .order('name');

// Get subcounties for a county
const { data: subcounties } = await supabase
  .from('subcounties')
  .select('*')
  .eq('county_id', countyId)
  .order('name');

// Get wards for a constituency
const { data: wards } = await supabase
  .from('wards')
  .select('*')
  .eq('constituency_id', constituencyId)
  .order('name');
```

## 📚 Data Sources

- **IEBC** (Independent Electoral and Boundaries Commission)
- **Kenya National Bureau of Statistics**
- **County Government Official Records**

## 🤝 Contributing

To add more complete ward data for other counties:

1. Edit `kenyan_admin_data.json`
2. Follow the existing structure
3. Run the seeding script to update the database

## ⚠️ Notes

- The seeding script uses `upsert` to avoid duplicates
- Wards are inserted in batches of 100 to prevent timeouts
- All foreign key relationships are properly maintained
- The script provides progress feedback during execution

## 🆘 Troubleshooting

### "Missing Supabase credentials"
- Check that your `.env` file exists and has the correct variables
- Ensure you're running the script from the project root

### "Table does not exist"
- Run the SQL migration first to create the tables
- Check that you're connected to the correct Supabase project

### "Duplicate key error"
- The script uses upsert, so this shouldn't happen
- If it does, check for duplicate entries in your JSON file

## 📞 Support

For issues or questions, refer to:
- Supabase Documentation: https://supabase.com/docs
- IEBC Official Website: https://www.iebc.or.ke/

---

**Last Updated:** February 2026  
**Data Version:** IEBC 2022 Boundaries
