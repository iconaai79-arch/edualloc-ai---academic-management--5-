import { apiService } from './src/services/apiService.ts';

// Mock localStorage for Node.js
const storageStore = {};
global.localStorage = {
    getItem: (key) => storageStore[key] || null,
    setItem: (key, val) => { storageStore[key] = String(val); },
    removeItem: (key) => { delete storageStore[key]; },
    clear: () => { Object.keys(storageStore).forEach(k => delete storageStore[k]); }
};

// Mock window for global environment checking in apiService
global.window = {
    location: {
        origin: 'http://localhost:5173'
    }
};

async function runTest() {
    console.log("Starting test in Local Storage mode...");

    const institutionId = "inst_test_123";

    const mockLeads = [
        {
            id: "lead_test_1",
            institutionId: institutionId,
            fullName: "John Doe",
            phone: "0712345678",
            email: "john@example.com",
            licenseTypeInterested: "Class B",
            source: "Excel Import",
            status: "New Enquiry",
            quotedAmount: 15000,
            notes: "Test lead 1",
            createdAt: new Date().toISOString()
        },
        {
            id: "lead_test_2",
            institutionId: institutionId,
            fullName: "Jane Smith",
            phone: "0723456789",
            email: "jane@example.com",
            licenseTypeInterested: "Class C",
            source: "Excel Import",
            status: "New Enquiry",
            quotedAmount: 18000,
            notes: "Test lead 2",
            createdAt: new Date().toISOString()
        }
    ];

    console.log("Saving mock leads using saveModuleRecords...");
    await apiService.saveModuleRecords('ds_leads', mockLeads);

    console.log("Checking raw localStorage contents:");
    console.log(global.localStorage.getItem('eduai_ds_leads'));

    console.log("Fetching leads using fetchModuleRecords...");
    const fetchedLeads = await apiService.fetchModuleRecords('ds_leads', institutionId);
    console.log("Fetched leads:", JSON.stringify(fetchedLeads, null, 2));

    if (fetchedLeads.length === 2) {
        console.log("SUCCESS: Both leads fetched successfully!");
    } else {
        console.log("FAILURE: Expected 2 leads, but got " + fetchedLeads.length);
    }
}

runTest().catch(console.error);
