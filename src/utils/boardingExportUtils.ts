import * as XLSX from 'xlsx';

/**
 * Utility for exporting boarding data to Excel
 */
export const exportBoardingToExcel = (data: any[], fileName: string, sheetName: string = 'Report') => {
    try {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Use a hidden link to trigger download
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);

        return { success: true };
    } catch (error) {
        console.error('Excel Export Failure:', error);
        return { success: false, error };
    }
};

/**
 * Specialized export for combined boarding summary
 */
export const exportBoardingSummaryToExcel = (summaryData: {
    houses: any[],
    rooms: any[],
    beds: any[],
    allocations: any[]
}) => {
    try {
        const workbook = XLSX.utils.book_new();

        if (summaryData.houses) {
            const houseSheet = XLSX.utils.json_to_sheet(summaryData.houses);
            XLSX.utils.book_append_sheet(workbook, houseSheet, 'Houses');
        }

        if (summaryData.rooms) {
            const roomSheet = XLSX.utils.json_to_sheet(summaryData.rooms);
            XLSX.utils.book_append_sheet(workbook, roomSheet, 'Rooms');
        }

        if (summaryData.beds) {
            const bedSheet = XLSX.utils.json_to_sheet(summaryData.beds);
            XLSX.utils.book_append_sheet(workbook, bedSheet, 'Beds');
        }

        if (summaryData.allocations) {
            const allocSheet = XLSX.utils.json_to_sheet(summaryData.allocations);
            XLSX.utils.book_append_sheet(workbook, allocSheet, 'Allocations');
        }

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Boarding_Complete_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);

        return { success: true };
    } catch (error) {
        console.error('Multi-Sheet Excel Export Failure:', error);
        return { success: false, error };
    }
};
