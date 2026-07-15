import React, { useState, useEffect, useMemo } from 'react';
import { RetailInventoryItem, RetailStore, VoteHead } from '../../types';
import { ArchiveBoxIcon as Package } from '../icons/ArchiveBoxIcon';
import { PlusIcon as Plus } from '../icons/PlusIcon';
import { MagnifyingGlassIcon as Search } from '../icons/MagnifyingGlassIcon';
import { PencilIcon as Pencil } from '../icons/PencilIcon';
import { TrashIcon as Trash } from '../icons/TrashIcon';
import { AlertTriangleIcon as AlertTriangle } from '../icons/AlertTriangleIcon';
import { TagIcon as Tag } from '../icons/TagIcon';
import { RectangleStackIcon as Layers } from '../icons/RectangleStackIcon';
import { BanknotesIcon as Banknote } from '../icons/BanknotesIcon';
import { XIcon as X } from '../icons/XIcon';
import { ImageIcon } from '../icons/ImageIcon';
import { UploadIcon as Upload } from '../icons/UploadIcon';
import { CheckCircleIcon as CheckCircle } from '../icons/CheckCircleIcon';
import { apiService } from '../../services/apiService';
import { SmartRetailInventoryImporterModal } from './SmartRetailInventoryImporterModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PdfViewer } from '../PdfViewer';

interface RetailInventoryManagerProps {
    institutionId: string;
    currentInstitution?: any;
    stores?: any[];
    voteHeads?: VoteHead[];
    isEducation?: boolean;
}

export function RetailInventoryManager({ institutionId, currentInstitution, stores = [], voteHeads = [], isEducation }: RetailInventoryManagerProps) {
    const [items, setItems] = useState<RetailInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RetailInventoryItem | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    // Spreadsheet inline-edit state
    const [dirtyRows, setDirtyRows] = useState<Record<string, RetailInventoryItem>>({});
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Auto-reset page when search queries or category filters are updated
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter]);

    // States for PDF Previewer
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [pdfIncludeCostPrice, setPdfIncludeCostPrice] = useState(true);
    const [pdfIncludeSku, setPdfIncludeSku] = useState(true);
    const [pdfCategoryFilter, setPdfCategoryFilter] = useState('all');

    // Default fallback categories (used if none saved in DB)
    const DEFAULT_CATEGORIES = [
        'Stationery', 'Textbooks', 'Uniforms', 'Sports Equipment',
        'Lab Supplies', 'Cleaning Supplies', 'Electronics', 'Furniture', 'Other'
    ];
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

    useEffect(() => {
        apiService.fetchModuleRecords('store_categories', institutionId)
            .then((data: any[]) => {
                if (data && data.length > 0) {
                    const sorted = data.sort((a, b) => a.sortOrder - b.sortOrder);
                    const names = sorted.map((c: any) => c.name);
                    setCategories(names);
                    setFormData(prev => {
                        if ((prev.category === 'Stationery' || prev.category === 'Smartphones') && names.length > 0) {
                            return { ...prev, category: names[0] };
                        }
                        return prev;
                    });
                }
            })
            .catch(() => { /* keep defaults */ });
    }, [institutionId]);

    // Form state
    const [formData, setFormData] = useState<Partial<RetailInventoryItem>>({
        name: '',
        sku: '',
        category: 'Stationery',
        srpPrice: 0,
        basePrice: 0,
        costPrice: 0,
        quantity: 0,
        reorderLevel: 5,
        unit: 'pcs',
        imageUrl: '',
        description: '',
        barcode: '',
        marketplaceEnabled: false,
        procurementAccountId: '',
        procurementAccountName: '',
        storeId: '',
        storeName: ''
    });

    useEffect(() => {
        fetchInventory();
    }, [institutionId]);

    // Barcode Scanner Listener
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if modal is open
            if (isAddModalOpen) {
                return;
            }

            // Ignore if focus is within an interactive element
            const target = e.target as HTMLElement;
            if (
                target && (
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.tagName === 'BUTTON' ||
                    target.isContentEditable
                )
            ) {
                return;
            }

            const currentTime = Date.now();

            // If more than 50ms has passed since the last key, it's likely human typing, so clear the buffer
            if (currentTime - lastKeyTime > 50) {
                buffer = '';
            }

            if (e.key === 'Enter' && buffer.length > 3) {
                // A barcode was likely scanned
                e.preventDefault();
                const scannedBarcode = buffer;

                const existingItem = items.find(item => item.barcode === scannedBarcode);

                if (existingItem) {
                    // Item exists, open edit modal
                    setEditingItem(existingItem);
                    setFormData(existingItem);
                    setIsAddModalOpen(true);
                } else {
                    // New item
                    setEditingItem(null);
                    setFormData({
                        name: '',
                        sku: `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        category: categories[0] || 'Stationery',
                        srpPrice: 0,
                        costPrice: 0,
                        quantity: 1, // Default to 1 for quick scanning
                        reorderLevel: 5,
                        unit: 'pcs',
                        imageUrl: '',
                        description: '',
                        barcode: scannedBarcode,
                        marketplaceEnabled: true,
                        storeId: '',
                        storeName: ''
                    });
                    setIsAddModalOpen(true);
                }

                buffer = ''; // Reset buffer after successful scan
            } else if (e.key.length === 1) {
                // Add regular characters to the buffer
                buffer += e.key;
            }

            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items, isAddModalOpen, categories]); // Re-bind when items, modal state or categories change

    // Custom PDF stock valuation report generator
    const generateCustomStockPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            // Filter products based on selected category in previewer
            const sourceItems = pdfCategoryFilter === 'all' 
                ? filteredItems 
                : filteredItems.filter(i => i.category === pdfCategoryFilter);

            const doc = new jsPDF({
                orientation: pdfOrientation,
                unit: 'mm',
                format: 'a4'
            });

            const margin = 14;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let yPos = 20;

            // Brand header accent line
            doc.setFillColor(79, 70, 229);
            doc.rect(0, 0, pageWidth, 8, 'F');
            yPos += 5;

            // Institution Brand Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59);
            doc.text((currentInstitution?.name || 'School Store').toUpperCase(), margin, yPos);

            // Document Title
            yPos += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(79, 70, 229);
            doc.text('INVENTORY STOCK STATUS REPORT', margin, yPos);

            // Metadata: Date and Filter details
            yPos += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date()?.toLocaleString()}`, margin, yPos);
            doc.text(`Category Filter: ${pdfCategoryFilter.toUpperCase()}`, pageWidth - margin, yPos, { align: 'right' });

            // Summary metrics box background
            yPos += 8;
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 22, 3, 3, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 22, 3, 3, 'D');

            // Calculation statistics
            const totalStockCount = sourceItems.reduce((acc, i) => acc + i.quantity, 0);
            const totalCostBasis = sourceItems.reduce((acc, i) => acc + (i.costPrice * i.quantity), 0);
            const totalRetailValue = sourceItems.reduce((acc, i) => acc + (i.srpPrice * i.quantity), 0);
            const lowStockCount = sourceItems.filter(i => i.quantity <= (i.reorderLevel || 5)).length;

            // Metrics layout
            const colWidth = (pageWidth - (margin * 2)) / 4;
            
            // Col 1: Total Stocked Qty
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text('TOTAL UNITS IN STOCK', margin + 6, yPos + 7);
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.text(totalStockCount?.toLocaleString(), margin + 6, yPos + 15);

            // Col 2: Total Cost Basis (optional)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(isEducation ? 'TOTAL INVENTORY VALUE' : 'TOTAL COST BASIS', margin + colWidth + 6, yPos + 7);
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.text(
                isEducation || pdfIncludeCostPrice 
                    ? `KES ${totalCostBasis?.toLocaleString()}` 
                    : 'N/A (Hidden)', 
                margin + colWidth + 6, 
                yPos + 15
            );

            // Col 3: Total Retail Valuation
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(isEducation ? 'ACTIVE PROCUREMENTS' : 'RETAIL VALUATION', margin + (colWidth * 2) + 6, yPos + 7);
            doc.setFontSize(11);
            doc.setTextColor(79, 70, 229);
            doc.text(
                isEducation 
                    ? `${sourceItems.filter(i => i.procurementAccountId).length} items`
                    : `KES ${totalRetailValue?.toLocaleString()}`, 
                margin + (colWidth * 2) + 6, 
                yPos + 15
            );

            // Col 4: Alert items count
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text('CRITICAL STOCK ALERTS', margin + (colWidth * 3) + 6, yPos + 7);
            doc.setFontSize(11);
            doc.setTextColor(lowStockCount > 0 ? 220 : 16, 38, 225); // Red if alerts > 0, emerald otherwise
            doc.text(`${lowStockCount} items`, margin + (colWidth * 3) + 6, yPos + 15);

            yPos += 30;

            // Define dynamic headers & body values depending on customization switches
            const headers = ['NAME'];
            if (pdfIncludeSku) headers.push('SKU');
            headers.push('CATEGORY');
            headers.push('PROCUREMENT ACCOUNT');
            headers.push('STOCK LEVEL');
            if (pdfIncludeCostPrice || isEducation) {
                headers.push('UNIT COST');
                headers.push('TOTAL COST');
            }
            if (!isEducation) {
                headers.push('UNIT SRP');
                headers.push('TOTAL VALUE');
            }

            const bodyValues = sourceItems.map(item => {
                const row = [item.name];
                if (pdfIncludeSku) row.push(item.sku);
                row.push(item.category || 'Other');
                row.push(item.procurementAccountName || 'Not Assigned');
                row.push(`${item.quantity} ${item.unit || 'pcs'}`);
                if (pdfIncludeCostPrice || isEducation) {
                    row.push(`KES ${item.costPrice?.toLocaleString()}`);
                    row.push(`KES ${(item.costPrice * item.quantity)?.toLocaleString()}`);
                }
                if (!isEducation) {
                    row.push(`KES ${item.srpPrice?.toLocaleString()}`);
                    row.push(`KES ${(item.srpPrice * item.quantity)?.toLocaleString()}`);
                }
                return row;
            });

            // Generate autotable
            (doc as any).autoTable({
                head: [headers],
                body: bodyValues,
                startY: yPos,
                theme: 'striped',
                headStyles: { 
                    fillColor: [79, 70, 229], 
                    textColor: 255, 
                    fontSize: 8, 
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: { 
                    fontSize: 8,
                    cellPadding: 4,
                    valign: 'middle'
                },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
                    // Right align money values
                    [headers.indexOf('UNIT COST')]: { halign: 'right' },
                    [headers.indexOf('UNIT SRP')]: { halign: 'right' },
                    [headers.indexOf('TOTAL VALUE')]: { halign: 'right', fontStyle: 'bold' },
                    [headers.indexOf('STOCK LEVEL')]: { halign: 'center' },
                },
                didDrawPage: (data: any) => {
                    // Footer details
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(150);
                    doc.text(
                        `Page ${doc.getNumberOfPages()} | Global Stock Control System`, 
                        margin, 
                        pageHeight - 8
                    );
                }
            });

            // Convert to Blob URL
            const pdfBlob = doc.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);
            
            // Revoke old URL if exists to avoid memory leak
            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }

            setPdfPreviewUrl(blobUrl);
        } catch (err) {
            console.error('Custom PDF generation failed:', err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Re-generate report when options change
    useEffect(() => {
        if (isPdfModalOpen) {
            generateCustomStockPdf();
        }
    }, [pdfOrientation, pdfIncludeCostPrice, pdfIncludeSku, pdfCategoryFilter, isPdfModalOpen]);

    const handleClosePdfPreview = () => {
        setIsPdfModalOpen(false);
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
    };

    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId);
            setItems(data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const folderName = 'Retail_Inventory';
            const res = await apiService.uploadToGoogleDrive(file, folderName, { 
                institutionId 
            });

            if (res.success && res.fileUrl) {
                setFormData(prev => ({ ...prev, imageUrl: res.fileUrl }));
            } else {
                throw new Error(res.error || 'Upload failed');
            }
        } catch (error: any) {
            console.error('Upload Error:', error);
            alert("Failed to upload image: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                ...formData,
                institutionId,
                lastUpdated: new Date().toISOString()
            };

            await apiService.saveModuleRecord('retail_inventory_items', payload);

            setIsAddModalOpen(false);
            setEditingItem(null);
            setFormData({
                name: '',
                sku: '',
                category: categories[0] || 'Stationery',
                srpPrice: 0,
                basePrice: 0,
                costPrice: 0,
                quantity: 0,
                reorderLevel: 5,
                unit: 'pcs',
                imageUrl: '',
                description: '',
                barcode: '',
                marketplaceEnabled: true,
                procurementAccountId: '',
                procurementAccountName: '',
                storeId: '',
                storeName: ''
            });
            fetchInventory();
        } catch (err: any) {
            console.error("Save error:", err);
            alert(`Failed to save item: ${err.message || 'Unknown error'}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await apiService.deleteModuleRecord('retail_inventory_items', id);
            fetchInventory();
        } catch (err) {
            console.error("Delete error:", err);
            alert('Failed to delete item');
        }
    };

    const handleBulkImport = async (items: Partial<RetailInventoryItem>[]) => {
        try {
            // Save each item
            for (const item of items) {
                await apiService.saveModuleRecord('retail_inventory_items', item);
            }
            fetchInventory();
            setIsImportModalOpen(false);
        } catch (err) {
            console.error("Bulk save error:", err);
            throw new Error("Failed to save some items.");
        }
    };

    const openEdit = (item: RetailInventoryItem) => {
        setEditingItem(item);
        setFormData(item);
        setIsAddModalOpen(true);
    };

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.category?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [items, searchQuery, categoryFilter]);

    // Merge dirty edits on top of persisted items for display
    const displayItems = useMemo(() =>
        filteredItems.map(item => dirtyRows[item.id] ? { ...item, ...dirtyRows[item.id] } : item)
    , [filteredItems, dirtyRows]);

    const totalItems = displayItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    const paginatedFilteredItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage]);

    const paginatedDisplayItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return displayItems.slice(startIndex, startIndex + itemsPerPage);
    }, [displayItems, currentPage, itemsPerPage]);

    const dirtyCount = Object.keys(dirtyRows).length;

    const updateCell = (id: string, field: keyof RetailInventoryItem, value: any) => {
        setDirtyRows(prev => {
            const base = prev[id] || items.find(i => i.id === id)!;
            return { ...prev, [id]: { ...base, [field]: value } };
        });
    };

    const handleSaveAll = async () => {
        if (!dirtyCount) return;
        setIsSavingAll(true);
        try {
            for (const row of Object.values(dirtyRows)) {
                await apiService.saveModuleRecord('retail_inventory_items', { ...row, lastUpdated: new Date().toISOString() });
            }
            setDirtyRows({});
            setLastSaved(new Date().toLocaleTimeString());
            await fetchInventory();
        } catch (err: any) {
            alert('Save failed: ' + err.message);
        } finally {
            setIsSavingAll(false);
        }
    };

    const handleDiscardAll = () => setDirtyRows({});

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Dynamic Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                            <ImageIcon className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                            Inventory <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-600">Nexus</span>
                        </h2>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] ml-11 flex items-center gap-2">
                        <Layers className="w-3 h-3 text-indigo-400" />
                        School Stock Control
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setFormData({
                                id: `rii_${Date.now()}`,
                                name: '',
                                sku: `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                                category: categories[0] || 'Stationery',
                                srpPrice: 0,
                                basePrice: 0,
                                costPrice: 0,
                                quantity: 0,
                                reorderLevel: 5,
                                unit: 'pcs',
                                imageUrl: '',
                                description: '',
                                barcode: '',
                                marketplaceEnabled: false
                            });
                            setIsAddModalOpen(true);
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all group"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                        Add Item
                    </button>

                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] shadow border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        <Upload className="w-4 h-4" />
                        Import
                    </button>

                    <button
                        onClick={() => setIsPdfModalOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-br from-fuchsia-600 to-pink-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        <Layers className="w-4 h-4" />
                        PDF Report
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-2xl shadow border border-white dark:border-slate-700 flex flex-col md:flex-row gap-3 justify-between items-center">
                <div className="relative w-full md:flex-grow">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search items by name, SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-900/50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold placeholder:text-slate-400"
                    />
                </div>

                <div className="relative w-full md:w-64">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-xl shrink-0">
                    <button
                        onClick={() => setViewMode('grid')}
                        title="Grid view"
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Layers className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        title="List view"
                        className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Search className="w-4 h-4 rotate-90" />
                    </button>
                </div>
            </div>

            {/* Item Display */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 rounded-full border-b-4 border-indigo-600 animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Loading inventory...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {paginatedFilteredItems.map((item, idx) => (
                                <div
                                    key={item.id}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                    className="group relative bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in"
                                >
                                    {/* Product Image Stage */}
                                    <div className="h-52 bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
                                        {item.imageUrl ? (
                                            <img loading="lazy" src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                                                <Package className="w-20 h-20 text-slate-300 dark:text-slate-700" />
                                            </div>
                                        )}

                                        {/* Overlay Badges */}
                                        <div className="absolute top-6 left-6 flex flex-col gap-2">
                                            <span className="px-5 py-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl border border-white/50">
                                                {item.category}
                                            </span>
                                        </div>

                                        {item.marketplaceEnabled && (
                                            <div className="absolute top-6 right-6">
                                                <div className="px-4 py-2 bg-emerald-500/90 backdrop-blur-md text-white rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center gap-2 border border-emerald-400/50">
                                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Live</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Hover Action Bar */}
                                        <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center gap-4 backdrop-blur-sm">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="p-5 bg-white text-indigo-600 rounded-3xl shadow-2xl hover:scale-110 active:scale-95 transition-all"
                                            >
                                                <Pencil className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-5 bg-rose-600 text-white rounded-3xl shadow-2xl hover:scale-110 active:scale-95 transition-all"
                                            >
                                                <Trash className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Details Information */}
                                    <div className="p-5">
                                        <div className="mb-6">
                                            <div className="flex justify-between items-start gap-4 mb-2">
                                                <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight leading-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                                    {item.name}
                                                </h3>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</span>
                                                    <p className="font-black text-indigo-600 text-sm">
                                                        KES {item.srpPrice?.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <code className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">{item.sku}</code>
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Availability</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-black ${item.quantity <= (item.reorderLevel || 5) ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                                                        {item.quantity} {item.unit}
                                                    </span>
                                                    {item.quantity <= (item.reorderLevel || 5) && (
                                                        <AlertTriangle className="w-3 h-3 text-rose-500 animate-bounce" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className={`w-1 h-1 rounded-full ${i === 1 ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredItems.length === 0 && (
                                <div className="col-span-full py-20 text-center flex flex-col items-center">
                                    <Package className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">No items found</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`relative ${dirtyCount > 0 ? 'pb-24' : ''}`}>
                            {/* Spreadsheet table */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-sm">
                                <table className="w-full text-left border-collapse" style={{ minWidth: '700px' }}>
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b-2 border-indigo-100 dark:border-slate-700">
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 w-8 text-center">#</th>
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400" style={{ minWidth: '200px' }}>Item Name</th>
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell" style={{ minWidth: '130px' }}>Category</th>
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-amber-500 hidden lg:table-cell" style={{ minWidth: '150px' }}>💰 Procurement A/C</th>
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-indigo-500 hidden lg:table-cell" style={{ minWidth: '150px' }}>🏢 Store / Location</th>
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-indigo-500 text-center" style={{ minWidth: '110px' }}>📦 Qty in Stock</th>
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right hidden sm:table-cell" style={{ minWidth: '100px' }}>Cost (KES)</th>
                                            {!isEducation && <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right" style={{ minWidth: '100px' }}>Price (KES)</th>}
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center hidden sm:table-cell">Visibility</th>
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-16">Del</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedDisplayItems.map((item, idx) => {
                                            const isDirty = !!dirtyRows[item.id];
                                            const isLowStock = item.quantity <= (item.reorderLevel || 5);
                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors ${
                                                        isDirty
                                                            ? 'bg-amber-50 dark:bg-amber-900/10'
                                                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'
                                                    }`}
                                                >
                                                    {/* Row number */}
                                                    <td className="px-3 py-1.5 text-center">
                                                        <span className="text-[9px] text-slate-300 font-mono select-none">{(currentPage - 1) * itemsPerPage + idx + 1}</span>
                                                        {isDirty && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mx-auto mt-0.5 animate-pulse" title="Unsaved changes" />}
                                                    </td>

                                                    {/* Name - inline editable */}
                                                    <td className="px-1 py-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0">
                                                                {item.imageUrl
                                                                    ? <img loading="lazy" src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                                    : <Package className="w-full h-full p-1.5 text-slate-300" />}
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={item.name}
                                                                onChange={e => updateCell(item.id, 'name', e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); (e.currentTarget.closest('tr')?.querySelector('td:nth-child(3) input, td:nth-child(3) select') as HTMLElement)?.focus(); } }}
                                                                className="flex-1 min-w-0 px-2 py-1.5 text-xs font-bold bg-transparent border border-transparent rounded-lg hover:border-slate-200 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-300 transition-all dark:hover:border-slate-600 text-slate-800 dark:text-white"
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Category - inline select */}
                                                    <td className="px-1 py-1 hidden md:table-cell">
                                                        <select
                                                            value={item.category || 'Other'}
                                                            onChange={e => updateCell(item.id, 'category', e.target.value)}
                                                            className="w-full px-2 py-1.5 text-[10px] font-bold bg-transparent border border-transparent rounded-lg hover:border-slate-200 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all dark:hover:border-slate-600 text-slate-600 dark:text-slate-300"
                                                        >
                                                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                        </select>
                                                    </td>

                                                    {/* Procurement Account select */}
                                                    <td className="px-1 py-1 hidden lg:table-cell">
                                                        <select
                                                            value={item.procurementAccountId || ''}
                                                            onChange={e => {
                                                                const selected = voteHeads.find(v => v.id === e.target.value);
                                                                updateCell(item.id, 'procurementAccountId', e.target.value || null);
                                                                updateCell(item.id, 'procurementAccountName', selected ? selected.name : null);
                                                            }}
                                                            className="w-full px-2 py-1.5 text-[10px] font-bold bg-transparent border border-transparent rounded-lg hover:border-slate-200 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all dark:hover:border-slate-600 text-slate-600 dark:text-slate-300"
                                                        >
                                                            <option value="">— Not Assigned —</option>
                                                            {voteHeads.map(vh => (
                                                                <option key={vh.id} value={vh.id}>
                                                                    💰 {vh.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* Store / Location select */}
                                                    <td className="px-1 py-1 hidden lg:table-cell">
                                                        <select
                                                            value={item.storeId || ''}
                                                            onChange={e => {
                                                                const selectedStore = stores.find(s => s.id === e.target.value);
                                                                updateCell(item.id, 'storeId', e.target.value || null);
                                                                updateCell(item.id, 'storeName', selectedStore ? selectedStore.name : null);
                                                            }}
                                                            className="w-full px-2 py-1.5 text-[10px] font-bold bg-transparent border border-transparent rounded-lg hover:border-slate-200 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all dark:hover:border-slate-600 text-slate-600 dark:text-slate-300"
                                                        >
                                                            <option value="">— Not Assigned —</option>
                                                            {stores.map(s => (
                                                                <option key={s.id} value={s.id}>
                                                                    🏢 {s.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* QUANTITY — the hero spreadsheet cell */}
                                                    <td className="px-1 py-1">
                                                        <div className="flex items-center gap-1 justify-center">
                                                            <button
                                                                onClick={() => updateCell(item.id, 'quantity', Math.max(0, item.quantity - 1))}
                                                                className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-700 font-black text-sm transition-all select-none"
                                                                tabIndex={-1}
                                                            >−</button>
                                                            <input
                                                                type="number"
                                                                value={item.quantity}
                                                                min={0}
                                                                onChange={e => updateCell(item.id, 'quantity', Math.max(0, Number(e.target.value)))}
                                                                onFocus={e => e.target.select()}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                                                        e.preventDefault();
                                                                        const rows = document.querySelectorAll('[data-qty-input]');
                                                                        const arr = Array.from(rows);
                                                                        const i = arr.indexOf(e.currentTarget);
                                                                        (arr[e.shiftKey ? i - 1 : i + 1] as HTMLElement)?.focus();
                                                                    }
                                                                }}
                                                                data-qty-input
                                                                className={`w-16 text-center px-1 py-1.5 text-sm font-black rounded-lg border-2 focus:outline-none transition-all ${
                                                                    isLowStock
                                                                        ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400 focus:border-red-500'
                                                                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300 focus:border-indigo-400'
                                                                }`}
                                                            />
                                                            <button
                                                                onClick={() => updateCell(item.id, 'quantity', item.quantity + 1)}
                                                                className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-700 font-black text-sm transition-all select-none"
                                                                tabIndex={-1}
                                                            >+</button>
                                                        </div>
                                                        <div className="text-center mt-0.5">
                                                            <span className="text-[8px] text-slate-400">{item.unit || 'pcs'}</span>
                                                            {isLowStock && <span className="ml-1 text-[8px] text-red-500 font-black">LOW</span>}
                                                        </div>
                                                    </td>

                                                    {/* Cost price */}
                                                    <td className="px-1 py-1 hidden sm:table-cell">
                                                        <input
                                                            type="number"
                                                            value={item.costPrice ?? 0}
                                                            min={0}
                                                            onChange={e => updateCell(item.id, 'costPrice', Number(e.target.value))}
                                                            onFocus={e => e.target.select()}
                                                            className="w-full text-right px-2 py-1.5 text-xs font-bold bg-transparent border border-transparent rounded-lg hover:border-slate-200 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all dark:hover:border-slate-600 text-slate-600 dark:text-slate-300"
                                                        />
                                                    </td>

                                                    {/* Selling price */}
                                                    {!isEducation && (
                                                        <td className="px-1 py-1">
                                                            <input
                                                                type="number"
                                                                value={item.srpPrice ?? 0}
                                                                min={0}
                                                                onChange={e => updateCell(item.id, 'srpPrice', Number(e.target.value))}
                                                                onFocus={e => e.target.select()}
                                                                className="w-full text-right px-2 py-1.5 text-xs font-bold bg-transparent border border-transparent rounded-lg hover:border-slate-200 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all dark:hover:border-slate-600 text-slate-800 dark:text-white"
                                                            />
                                                        </td>
                                                    )}

                                                    {/* Visibility toggle */}
                                                    <td className="px-1 py-1 text-center hidden sm:table-cell">
                                                        <button
                                                            onClick={() => updateCell(item.id, 'marketplaceEnabled', !item.marketplaceEnabled)}
                                                            className={`px-2 py-1 rounded-full text-[9px] font-black transition-all border ${
                                                                item.marketplaceEnabled
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700'
                                                                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:border-slate-600'
                                                            }`}
                                                        >
                                                            {item.marketplaceEnabled ? '🌐 Public' : '🔒 Private'}
                                                        </button>
                                                    </td>

                                                    {/* Delete */}
                                                    <td className="px-1 py-1 text-center">
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                                            title="Delete item"
                                                        >
                                                            <Trash className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {displayItems.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center">
                                                    <Package className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">No items found</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Floating save banner */}
                            {dirtyCount > 0 && (
                                <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex items-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl shadow-slate-900/40 border border-slate-700 dark:border-slate-200">
                                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                        <span className="text-xs font-black uppercase tracking-wide">
                                            {dirtyCount} unsaved {dirtyCount === 1 ? 'change' : 'changes'}
                                        </span>
                                        <div className="flex items-center gap-2 ml-2">
                                            <button
                                                onClick={handleDiscardAll}
                                                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide bg-slate-700 dark:bg-slate-200 hover:bg-slate-600 dark:hover:bg-slate-300 transition-colors"
                                            >
                                                Discard
                                            </button>
                                            <button
                                                onClick={handleSaveAll}
                                                disabled={isSavingAll}
                                                className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide bg-indigo-500 hover:bg-indigo-400 text-white transition-colors flex items-center gap-1.5 disabled:opacity-60"
                                            >
                                                {isSavingAll ? (
                                                    <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
                                                ) : (
                                                    <><CheckCircle className="w-3.5 h-3.5" /> Save All</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {lastSaved && !dirtyCount && (
                                <p className="text-center text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-2 animate-in fade-in">
                                    ✓ All changes saved at {lastSaved}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalItems > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <span>Showing</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-300 font-bold"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span>entries of <b>{totalItems}</b> total items</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                                    if (totalPages > 6 && Math.abs(pageNum - currentPage) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                                        if (pageNum === 2 || pageNum === totalPages - 1) {
                                            return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                                        }
                                        return null;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                                currentPage === pageNum
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'border border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Redesigned Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in duration-300">
                        <div className="px-5 py-4 sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md z-10 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">{editingItem ? 'Edit Item' : 'Add Item'}</h3>
                                <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mt-0.5">School Inventory</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form 
                            onSubmit={handleSave} 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                                    e.preventDefault();
                                }
                            }}
                            className="p-5 space-y-6"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Left Side: Media Upload */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <ImageIcon className="w-3.5 h-3.5" /> Item Photo
                                    </label>
                                    <div className="aspect-video sm:aspect-square bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 relative group overflow-hidden flex flex-col items-center justify-center">
                                        {formData.imageUrl ? (
                                            <>
                                                <img loading="lazy" src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button type="button" onClick={() => setFormData({ ...formData, imageUrl: '' })} className="p-2.5 bg-rose-600 text-white rounded-xl shadow hover:scale-105 transition-transform"><Trash className="w-4 h-4" /></button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-6 pointer-events-none">
                                                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow">
                                                    {isUploading ? <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-7 h-7 text-indigo-400" />}
                                                </div>
                                                <p className="text-xs font-black text-slate-700 dark:text-white mb-1">Upload photo</p>
                                                <p className="text-[9px] text-slate-400">PNG or JPG</p>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
                                    </div>
                                </div>

                                {/* Right Side: Details */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300"
                                            placeholder="e.g. Exercise Books (Ruled)"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</label>
                                            <input
                                                type="text"
                                                value={formData.unit}
                                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="pcs, reams, etc."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                                        <textarea
                                            rows={3}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-300"
                                            placeholder="Notes about the item..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cost Price (KES)</label>
                                    <div className="relative">
                                        <Banknote className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" />
                                        <input
                                            required
                                            type="number"
                                            value={formData.costPrice}
                                            onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                                            className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-rose-500"
                                        />
                                    </div>
                                </div>
                                {!isEducation && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selling Price (KES)</label>
                                        <div className="relative">
                                            <Banknote className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                                            <input
                                                type="number"
                                                required={!isEducation}
                                                value={formData.srpPrice}
                                                onChange={(e) => setFormData({ ...formData, srpPrice: Number(e.target.value) })}
                                                className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stock Qty</label>
                                    <input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reorder Level</label>
                                    <input
                                        type="number"
                                        value={formData.reorderLevel}
                                        onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">SKU / ID</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-[10px] font-mono font-black placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Barcode</label>
                                    <div className="relative">
                                        <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                                        <input
                                            type="text"
                                            value={formData.barcode || ''}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                            className="w-full pl-8 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Scan barcode..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Marketplace Visibility</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, marketplaceEnabled: !formData.marketplaceEnabled })}
                                        className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${formData.marketplaceEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                                    >
                                        {formData.marketplaceEnabled ? '🌐 Public (Visible on Marketplace)' : '🔒 Private (Internal Only)'}
                                    </button>
                                </div>
                            </div>

                            {/* Procurement Account Section */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 mb-3">
                                    💰 Procurement Account
                                    <span className="text-[9px] font-medium text-slate-400 normal-case tracking-normal">(Budget used to fund this item)</span>
                                </label>
                                <select
                                    value={formData.procurementAccountId || ''}
                                    onChange={(e) => {
                                        const selected = voteHeads.find(v => v.id === e.target.value);
                                        setFormData({
                                            ...formData,
                                            procurementAccountId: e.target.value || undefined,
                                            procurementAccountName: selected?.name || undefined
                                        });
                                    }}
                                    className="w-full p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 focus:ring-2 focus:ring-amber-400 outline-none"
                                >
                                    <option value="">— No Account / Not Assigned —</option>
                                    {voteHeads.map(vh => (
                                        <option key={vh.id} value={vh.id}>
                                            {vh.name} {vh.allocatedAmount ? `(Allocated: KES ${vh.allocatedAmount.toLocaleString()})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {formData.procurementAccountName && (
                                    <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        ✔ Linked to <strong>{formData.procurementAccountName}</strong>
                                    </p>
                                )}
                                {voteHeads.length === 0 && (
                                    <p className="mt-2 text-[10px] text-slate-400 italic">No finance accounts configured. Set up Vote Heads in the Finance module first.</p>
                                )}
                            </div>

                            {/* Store / Location Section */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5 mb-3">
                                    🏢 Store / Location
                                    <span className="text-[9px] font-medium text-slate-400 normal-case tracking-normal">(Physical store where this item is kept)</span>
                                </label>
                                <select
                                    value={formData.storeId || ''}
                                    onChange={(e) => {
                                        const selectedStore = stores.find(s => s.id === e.target.value);
                                        setFormData({
                                            ...formData,
                                            storeId: e.target.value || undefined,
                                            storeName: selectedStore?.name || undefined
                                        });
                                    }}
                                    className="w-full p-3 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-800 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-450 outline-none"
                                >
                                    <option value="">— No Store / Not Assigned —</option>
                                    {stores.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.storeType?.replace('_', ' ')?.toUpperCase()})
                                        </option>
                                    ))}
                                </select>
                                {formData.storeName && (
                                    <p className="mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                        ✔ Kept in <strong>{formData.storeName}</strong>
                                    </p>
                                )}
                                {stores.length === 0 && (
                                    <p className="mt-2 text-[10px] text-slate-400 italic">No stores configured. Set up Stores first.</p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Save Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <SmartRetailInventoryImporterModal
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleBulkImport}
                    institutionId={institutionId}
                />
            )}

            {/* Dynamic Interactive PDF Previewer Modal */}
            {isPdfModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 md:p-10">
                    <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] w-full max-w-7xl h-[85vh] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col md:flex-row animate-in fade-in zoom-in duration-500">
                        
                        {/* Left Customization Bar */}
                        <div className="w-full md:w-[24rem] bg-slate-50 dark:bg-slate-900/50 p-8 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between overflow-y-auto">
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Report Settings</h3>
                                        <p className="text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Stock Customization 业务</p>
                                    </div>
                                    <button 
                                        onClick={handleClosePdfPreview}
                                        className="md:hidden p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Page Orientation */}
                                    <div className="space-y-2.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Page Orientation</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setPdfOrientation('portrait')}
                                                className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex flex-col items-center justify-center gap-2 ${pdfOrientation === 'portrait' ? 'bg-indigo-600/10 text-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-400 border-transparent'}`}
                                            >
                                                <Layers className="w-4 h-4" />
                                                Portrait
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPdfOrientation('landscape')}
                                                className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex flex-col items-center justify-center gap-2 ${pdfOrientation === 'landscape' ? 'bg-indigo-600/10 text-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-400 border-transparent'}`}
                                            >
                                                <Layers className="w-4 h-4 rotate-90" />
                                                Landscape
                                            </button>
                                        </div>
                                    </div>

                                    {/* Category Filter */}
                                    <div className="space-y-2.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Filter Stock Category</label>
                                        <select
                                            value={pdfCategoryFilter}
                                            onChange={(e) => setPdfCategoryFilter(e.target.value)}
                                            className="w-full p-4 bg-white dark:bg-slate-800 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none uppercase tracking-wider shadow-sm"
                                        >
                                            <option value="all">All Categories</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Feature Toggles */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Column Options</label>
                                        
                                        {/* Cost Price */}
                                        <label className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Include Cost Prices</span>
                                            <input
                                                type="checkbox"
                                                checked={pdfIncludeCostPrice}
                                                onChange={(e) => setPdfIncludeCostPrice(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </label>

                                        {/* SKU Code */}
                                        <label className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Include SKU Codes</span>
                                            <input
                                                type="checkbox"
                                                checked={pdfIncludeSku}
                                                onChange={(e) => setPdfIncludeSku(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800/80">
                                <a
                                    href={pdfPreviewUrl || '#'}
                                    download={`${(currentInstitution?.name || 'School_Store').replace(/\s+/g, '_')}_Stock_Report.pdf`}
                                    onClick={(e) => {
                                        if (!pdfPreviewUrl) e.preventDefault();
                                    }}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] hover:bg-indigo-700 active:scale-98 transition-all flex items-center justify-center gap-2.5"
                                >
                                    <Upload className="w-4 h-4 rotate-180" />
                                    Download PDF Report
                                </a>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
                                        if (iframe) {
                                            iframe.contentWindow?.print();
                                        } else {
                                            alert('Iframe print handler not loaded yet.');
                                        }
                                    }}
                                    className="w-full py-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2.5"
                                >
                                    <Layers className="w-4 h-4" />
                                    Print Report Sheet
                                </button>

                                <button
                                    type="button"
                                    onClick={handleClosePdfPreview}
                                    className="w-full py-4 bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>

                        {/* Right Preview Viewport */}
                        <div className="flex-1 bg-slate-900 p-8 flex flex-col relative">
                            <div className="hidden md:flex justify-between items-center mb-6">
                                <span className="px-4 py-1.5 bg-slate-800/80 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-700">
                                    Interactive Live Stage
                                </span>
                                <button 
                                    onClick={handleClosePdfPreview}
                                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-all active:scale-90"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            <div className="flex-1 bg-slate-950/40 rounded-[2rem] border border-slate-800 overflow-hidden relative shadow-inner">
                                {isGeneratingPdf ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-slate-950/80 backdrop-blur-sm z-30">
                                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">
                                            Generating Live Valuation Report...
                                        </p>
                                    </div>
                                ) : null}

                                {pdfPreviewUrl ? (
                                    <PdfViewer
                                        id="pdf-preview-iframe"
                                        src={pdfPreviewUrl}
                                        className="w-full h-full border-none"
                                        title="Inventory Valuation Report Live Preview"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                                        <Package className="w-16 h-16 text-slate-700 mb-4 animate-bounce" />
                                        <p className="text-xs font-black uppercase tracking-widest">Awaiting valuation manifest data...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

