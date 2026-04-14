import { apiService } from './src/services/apiService';

async function checkTables() {
    try {
        console.log("Checking constituencies...");
        const con = await apiService.fetchModuleRecords('constituencies', undefined, undefined, { limit: 1 });
        console.log("Constituencies exist.");
    } catch (e) {
        console.log("Constituencies table DOES NOT exist.");
    }

    try {
        console.log("Checking wards...");
        const wards = await apiService.fetchModuleRecords('wards', undefined, undefined, { limit: 1 });
        console.log("Wards exist.");
    } catch (e) {
        console.log("Wards table DOES NOT exist.");
    }
}
// This is just for demonstration, I can't run this directly in the user's browser from here.
