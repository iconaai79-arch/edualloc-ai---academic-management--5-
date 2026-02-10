/**
 * Seed Kenyan Administrative Units to Supabase
 * Run with: node database/seed_kenyan_admin_units.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Check your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Import the data
const adminData = require('./kenyan_admin_data.json');

async function seedAdminUnits() {
    console.log('🇰🇪 Starting Kenyan Administrative Units Seeding...\n');

    try {
        // Step 1: Seed Counties
        console.log('📍 Seeding Counties...');
        const { data: counties, error: countiesError } = await supabase
            .from('counties')
            .upsert(adminData.counties, { onConflict: 'code' })
            .select();

        if (countiesError) {
            console.error('❌ Error seeding counties:', countiesError);
            throw countiesError;
        }
        console.log(`✅ Seeded ${counties.length} counties\n`);

        // Create county lookup map
        const countyMap = {};
        counties.forEach(county => {
            countyMap[county.code] = county.id;
        });

        // Step 2: Seed Subcounties
        console.log('📍 Seeding Subcounties...');
        const subcountiesWithIds = adminData.subcounties.map(sc => ({
            ...sc,
            county_id: countyMap[sc.county_code]
        }));

        const { data: subcounties, error: subcountiesError } = await supabase
            .from('subcounties')
            .upsert(subcountiesWithIds, { onConflict: 'county_id,name' })
            .select();

        if (subcountiesError) {
            console.error('❌ Error seeding subcounties:', subcountiesError);
            throw subcountiesError;
        }
        console.log(`✅ Seeded ${subcounties.length} subcounties\n`);

        // Create subcounty lookup map
        const subcountyMap = {};
        subcounties.forEach(sc => {
            const key = `${sc.county_id}-${sc.name}`;
            subcountyMap[key] = sc.id;
        });

        // Step 3: Seed Constituencies
        console.log('📍 Seeding Constituencies...');
        const constituenciesWithIds = adminData.constituencies.map(constituency => ({
            ...constituency,
            county_id: countyMap[constituency.county_code]
        }));

        const { data: constituencies, error: constituenciesError } = await supabase
            .from('constituencies')
            .upsert(constituenciesWithIds, { onConflict: 'county_id,name' })
            .select();

        if (constituenciesError) {
            console.error('❌ Error seeding constituencies:', constituenciesError);
            throw constituenciesError;
        }
        console.log(`✅ Seeded ${constituencies.length} constituencies\n`);

        // Create constituency lookup map
        const constituencyMap = {};
        constituencies.forEach(c => {
            const key = `${c.county_id}-${c.name}`;
            constituencyMap[key] = c.id;
        });

        // Step 4: Seed Wards (in batches to avoid timeout)
        console.log('📍 Seeding Wards...');
        const wardsWithIds = adminData.wards.map(ward => {
            const countyId = countyMap[ward.county_code];
            const constituencyKey = `${countyId}-${ward.constituency_name}`;
            const subcountyKey = `${countyId}-${ward.subcounty_name}`;

            return {
                name: ward.name,
                constituency_id: constituencyMap[constituencyKey],
                subcounty_id: subcountyMap[subcountyKey] || null
            };
        });

        // Batch insert wards (100 at a time)
        const batchSize = 100;
        let totalWards = 0;

        for (let i = 0; i < wardsWithIds.length; i += batchSize) {
            const batch = wardsWithIds.slice(i, i + batchSize);
            const { data: wardsBatch, error: wardsError } = await supabase
                .from('wards')
                .upsert(batch, { onConflict: 'constituency_id,name' })
                .select();

            if (wardsError) {
                console.error(`❌ Error seeding wards batch ${i / batchSize + 1}:`, wardsError);
                throw wardsError;
            }

            totalWards += wardsBatch.length;
            process.stdout.write(`\r   Progress: ${totalWards}/${wardsWithIds.length} wards`);
        }

        console.log(`\n✅ Seeded ${totalWards} wards\n`);

        // Summary
        console.log('═══════════════════════════════════════');
        console.log('✅ SEEDING COMPLETE!');
        console.log('═══════════════════════════════════════');
        console.log(`Counties:       ${counties.length}`);
        console.log(`Subcounties:    ${subcounties.length}`);
        console.log(`Constituencies: ${constituencies.length}`);
        console.log(`Wards:          ${totalWards}`);
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

// Run the seeding
seedAdminUnits()
    .then(() => {
        console.log('🎉 All done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
