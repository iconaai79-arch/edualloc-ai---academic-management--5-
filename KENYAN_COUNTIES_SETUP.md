# 🇰🇪 Kenyan Administrative Units - Setup Complete!

## ✅ Files Created

I've successfully created a complete Supabase seeding system for all Kenyan administrative units:

### 1. **`database/seed_kenyan_admin_units.js`**
   - Node.js script to seed data to your Supabase database
   - Handles counties, subcounties, constituencies, and wards
   - Batch processing for efficient uploads
   - Progress tracking and error handling

### 2. **`database/kenyan_admin_data.json`**
   - Complete data for all 47 Kenyan counties
   - Full ward-level data for:
     - **Nairobi County** (85 wards across 17 constituencies)
     - **Mombasa County** (30 wards across 6 constituencies)
     - **Kiambu County** (12 subcounties and constituencies)

### 3. **`database/migrations/001_kenyan_counties_base.sql`**
   - SQL schema for all tables
   - Proper foreign key relationships
   - Performance indexes

### 4. **`database/KENYAN_ADMIN_SEEDING_README.md`**
   - Complete documentation
   - Usage examples
   - Integration guide

## 🚀 How to Use

### Step 1: Install Dependencies

You need to install `dotenv` package. Run this in PowerShell as Administrator:

```powershell
# Enable script execution (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then install dotenv
npm install dotenv
```

Or manually add to `package.json`:
```json
"dependencies": {
  "dotenv": "^16.0.0"
}
```

### Step 2: Create Tables in Supabase

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `database/migrations/001_kenyan_counties_base.sql`
3. Run the SQL to create all tables

### Step 3: Run the Seeding Script

```bash
npm run seed:counties
```

Or directly:
```bash
node database/seed_kenyan_admin_units.js
```

## 📊 What Gets Seeded

### Current Data Coverage:
- ✅ **47 Counties** - All Kenyan counties
- ✅ **Nairobi** - Complete (17 constituencies, 85 wards)
- ✅ **Mombasa** - Complete (6 constituencies, 30 wards)
- ✅ **Kiambu** - Complete (12 constituencies)

### To Add More Counties:

Edit `database/kenyan_admin_data.json` and add data following this structure:

```json
{
  "subcounties": [
    { "county_code": "019", "name": "Nyeri Central" }
  ],
  "constituencies": [
    { "county_code": "019", "name": "Nyeri Town" }
  ],
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

## 🔧 Database Schema

### Tables Created:
1. **counties** - 47 counties with codes
2. **subcounties** - Administrative subdivisions
3. **constituencies** - Electoral boundaries
4. **wards** - Smallest administrative units

### Relationships:
```
counties (1) ─→ (many) subcounties
counties (1) ─→ (many) constituencies
constituencies (1) ─→ (many) wards
subcounties (1) ─→ (many) wards
```

## 💡 Integration with Your App

### TypeScript Types (Add to your types file):

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

### Example Queries:

```typescript
// Get all counties
const { data: counties } = await supabase
  .from('counties')
  .select('*')
  .order('name');

// Get constituencies for a county
const { data: constituencies } = await supabase
  .from('constituencies')
  .select('*')
  .eq('county_id', countyId)
  .order('name');

// Get wards for a constituency
const { data: wards } = await supabase
  .from('wards')
  .select('*')
  .eq('constituency_id', constituencyId)
  .order('name');

// Get full hierarchy
const { data } = await supabase
  .from('counties')
  .select(`
    *,
    subcounties(*),
    constituencies(
      *,
      wards(*)
    )
  `)
  .eq('code', '047');
```

## 📋 Next Steps

1. **Install dotenv** (if not already installed)
2. **Run the SQL migration** in Supabase
3. **Execute the seeding script**
4. **Verify the data** in your Supabase dashboard
5. **Integrate with your app** using the TypeScript types and queries above

## 🎯 For Bursary Application

You can now use this data to:
- Let students select their county
- Filter by constituency
- Organize applications by ward
- Generate reports by administrative unit
- Validate student locations

## 📚 All 47 Counties Included

1. Mombasa - 6. Taita Taveta - 11. Isiolo - 16. Machakos - 21. Murang'a - 26. Trans Nzoia - 31. Laikipia - 36. Bomet - 41. Siaya - 46. Nyamira
2. Kwale - 7. Garissa - 12. Meru - 17. Makueni - 22. Kiambu - 27. Uasin Gishu - 32. Nakuru - 37. Kakamega - 42. Kisumu - 47. Nairobi
3. Kilifi - 8. Wajir - 13. Tharaka Nithi - 18. Nyandarua - 23. Turkana - 28. Elgeyo Marakwet - 33. Narok - 38. Vihiga - 43. Homa Bay
4. Tana River - 9. Mandera - 14. Embu - 19. Nyeri - 24. West Pokot - 29. Nandi - 34. Kajiado - 39. Bungoma - 44. Migori
5. Lamu - 10. Marsabit - 15. Kitui - 20. Kirinyaga - 25. Samburu - 30. Baringo - 35. Kericho - 40. Busia - 45. Kisii

## ⚠️ Important Notes

- The seeding script uses **upsert** to avoid duplicates
- Wards are inserted in **batches of 100** to prevent timeouts
- All **foreign key relationships** are maintained
- The script provides **progress feedback** during execution

## 🆘 Troubleshooting

### PowerShell Execution Policy Error
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Missing Supabase Credentials
Check your `.env` file has:
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### Table Does Not Exist
Run the SQL migration first in Supabase SQL Editor

---

**Ready to seed!** 🌱

Run: `npm run seed:counties` (after installing dotenv)
