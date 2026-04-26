
import { apiService } from './src/services/apiService';

async function checkRegistry() {
    console.log("Fetching school registry...");
    try {
        const registry = await apiService.fetchFullRegistry();
        console.log(`Fetched ${registry.length} records.`);
        const match = registry.find(r => 
            r.name.toLowerCase().includes('metto') || 
            r.name.toLowerCase().includes('sylvis') ||
            (r.subdomain && r.subdomain.toLowerCase().includes('metto'))
        );
        if (match) {
            console.log("Found matching registry record:", JSON.stringify(match, null, 2));
        } else {
            console.log("No matching record found in registry.");
            // Log a few to see the structure
            console.log("First 5 records:", JSON.stringify(registry.slice(0, 5), null, 2));
        }
    } catch (e) {
        console.error("Error fetching registry:", e);
    }
}

// Since I'm in a browser-like environment in the agent, I can't run this directly as a node script easily without setup.
// But I can try to run it via run_command if I have a test environment.
// However, I don't have a direct way to run TS files easily without vite/node.
