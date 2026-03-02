async function main() {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
    const swagger = await res.json();

    const tableInfo = swagger.definitions['carwash_jobs'];
    console.log("SCHEMA FOR carwash_jobs:");
    console.log(JSON.stringify(tableInfo, null, 2));
}
main().catch(console.error);
