
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Book, User, LibraryTransaction } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import { Edit2Icon } from './icons/Edit2Icon';
import { TrashIcon } from './icons/TrashIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { FilterIcon } from './icons/FilterIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { ListIcon } from './icons/ListIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { XIcon } from './icons/XIcon';
import { apiService } from '../services/apiService';

import { BookQrCodeModal } from './BookQrCodeModal';
import { SmartLibraryImporterModal } from './SmartLibraryImporterModal';

interface BookInventoryManagerProps {
    institutionId: string;
    users: User[];
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

const norm = (val?: string | null) => (val || '').toString().trim().toLowerCase();

export const BookInventoryManager: React.FC<BookInventoryManagerProps> = ({
    institutionId,
    users,
    onLogAction,
    onDataChange
}) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [availabilityFilter, setAvailabilityFilter] = useState<'All' | 'Available' | 'Circulating' | 'Out'>('All');
    const [isAddingBook, setIsAddingBook] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [qrBook, setQrBook] = useState<Book | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [newBook, setNewBook] = useState<Partial<Book>>({
        title: '',
        author: '',
        isbn: '',
        accessionNumber: '',
        quantity: 1,
        available: 1,
        category: '',
        location: ''
    });

    useEffect(() => {
        loadBooks();
    }, [institutionId]);

    const normalizeBook = (raw: any, transList: LibraryTransaction[] = []): Book => {
        const id = String(raw.id || `bk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
        const accNo = String(
            raw.accessionNumber || 
            raw.accession_number || 
            raw.accession_no || 
            raw.accNo || 
            raw.book_code || 
            raw.code || 
            id
        ).trim().toUpperCase();

        const title = String(raw.title || raw.book_title || raw.name || raw.bookName || 'Untitled Resource').trim();
        const author = String(raw.author || raw.author_name || raw.writer || raw.publisher || 'General / Unknown').trim();
        const isbn = String(raw.isbn || raw.isbn_number || raw.barcode || raw.code || 'N/A').trim();
        const category = String(raw.category || raw.classification || raw.genre || raw.subject || 'General').trim();
        const location = String(raw.location || raw.shelf || raw.shelf_location || raw.rack || '').trim();
        const addedDate = String(raw.addedDate || raw.added_date || raw.created_at || raw.createdAt || new Date().toISOString());

        const qty = Math.max(1, Number(raw.quantity ?? raw.total_copies ?? raw.copies ?? raw.qty ?? 1));

        // Calculate real-time active loans
        const activeLoans = transList.filter(t => 
            (t.bookId === id || norm(t.bookId) === norm(accNo)) && 
            (t.status === 'issued' || t.status === 'overdue')
        ).length;

        // True available copies
        const storedAvail = raw.available != null ? Number(raw.available) : (raw.available_copies != null ? Number(raw.available_copies) : null);
        const available = storedAvail !== null 
            ? Math.min(qty, Math.max(0, storedAvail))
            : Math.max(0, qty - activeLoans);

        return {
            id,
            title,
            author,
            isbn,
            accessionNumber: accNo,
            quantity: qty,
            available,
            category,
            location,
            addedDate,
            institutionId: String(raw.institutionId || raw.institution_id || institutionId)
        };
    };

    const loadBooks = async () => {
        setLoading(true);
        try {
            const [rawBooks, rawTrans] = await Promise.all([
                apiService.fetchModuleRecords<any>('books', institutionId).catch(() => []),
                apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', institutionId).catch(() => [])
            ]);

            const transList = Array.isArray(rawTrans) ? rawTrans : [];
            setTransactions(transList);

            let bookList: any[] = Array.isArray(rawBooks) ? rawBooks : [];
            
            // Check local cached fallback if empty
            if (bookList.length === 0) {
                try {
                    const cached = localStorage.getItem(`eduai_books_${institutionId}`);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed) && parsed.length > 0) bookList = parsed;
                    }
                } catch (e) {}
            }

            const normalized = bookList.map(b => normalizeBook(b, transList));
            setBooks(normalized);
        } catch (error) {
            console.error('Error loading books:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(() => {
        const cats = new Set<string>();
        books.forEach(b => {
            if (b.category && b.category.trim()) cats.add(b.category.trim());
        });
        return ['All', ...Array.from(cats).sort()];
    }, [books]);

    // Summary Statistics
    const stats = useMemo(() => {
        const totalTitles = books.length;
        const totalCopies = books.reduce((acc, b) => acc + (b.quantity || 0), 0);
        const availableCopies = books.reduce((acc, b) => acc + (b.available || 0), 0);
        const inCirculation = Math.max(0, totalCopies - availableCopies);
        const categoryCount = categories.filter(c => c !== 'All').length;

        return {
            totalTitles,
            totalCopies,
            availableCopies,
            inCirculation,
            categoryCount
        };
    }, [books, categories]);

    const filteredBooks = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();
        const tokens = query.split(/\s+/).filter(Boolean);

        return books.filter(b => {
            // Category filter
            if (categoryFilter !== 'All' && norm(b.category) !== norm(categoryFilter)) {
                return false;
            }

            // Availability filter
            if (availabilityFilter === 'Available' && b.available <= 0) return false;
            if (availabilityFilter === 'Circulating' && (b.available >= b.quantity || b.quantity <= 0)) return false;
            if (availabilityFilter === 'Out' && b.available > 0) return false;

            // Search query tokens
            if (tokens.length > 0) {
                const searchHaystack = `${b.title} ${b.author} ${b.isbn} ${b.accessionNumber} ${b.category} ${b.location}`.toLowerCase();
                const allMatch = tokens.every(tok => searchHaystack.includes(tok));
                if (!allMatch) return false;
            }

            return true;
        });
    }, [books, searchTerm, categoryFilter, availabilityFilter]);

    const handleSaveBook = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const accNo = (newBook.accessionNumber || '').trim().toUpperCase() || `ACC-${Date.now().toString().slice(-6)}`;
            const qty = Math.max(1, Number(newBook.quantity || 1));
            const avail = editingBook 
                ? (newBook.quantity !== editingBook.quantity 
                    ? Math.max(0, qty - (editingBook.quantity - editingBook.available))
                    : (newBook.available ?? editingBook.available))
                : (newBook.available ?? qty);

            const bookData: any = editingBook
                ? {
                    ...editingBook,
                    ...newBook,
                    title: (newBook.title || editingBook.title || '').trim(),
                    author: (newBook.author || editingBook.author || '').trim(),
                    accessionNumber: accNo,
                    accession_number: accNo,
                    isbn: (newBook.isbn || '').trim(),
                    category: (newBook.category || 'General').trim(),
                    location: (newBook.location || '').trim(),
                    quantity: qty,
                    total_copies: qty,
                    available: Math.min(qty, Math.max(0, avail)),
                    available_copies: Math.min(qty, Math.max(0, avail)),
                    institutionId,
                    institution_id: institutionId
                }
                : {
                    ...newBook,
                    id: `bk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    title: (newBook.title || 'Untitled Resource').trim(),
                    author: (newBook.author || 'General / Unknown').trim(),
                    accessionNumber: accNo,
                    accession_number: accNo,
                    isbn: (newBook.isbn || 'N/A').trim(),
                    category: (newBook.category || 'General').trim(),
                    location: (newBook.location || '').trim(),
                    quantity: qty,
                    total_copies: qty,
                    available: qty,
                    available_copies: qty,
                    institutionId,
                    institution_id: institutionId,
                    addedDate: new Date().toISOString(),
                    added_date: new Date().toISOString()
                };

            await apiService.saveModuleRecord('books', bookData);
            await onLogAction(`${editingBook ? 'Updated' : 'Catalogued'} book: ${bookData.title} (${accNo})`);
            setIsAddingBook(false);
            setEditingBook(null);
            setNewBook({ title: '', author: '', isbn: '', accessionNumber: '', quantity: 1, available: 1, category: '', location: '' });
            await loadBooks();
            onDataChange();
        } catch (error: any) {
            console.error('Book Save Error:', error);
            alert(`Failed to save book record: ${error.message || 'Unknown database error'}`);
        }
    };

    const handleImportBooks = async (items: any[]) => {
        try {
            for (const item of items) {
                const normalizedItem = {
                    ...item,
                    accession_number: item.accessionNumber || item.accession_number,
                    institution_id: item.institutionId || item.institution_id || institutionId,
                    total_copies: item.quantity,
                    available_copies: item.available ?? item.quantity
                };
                await apiService.saveModuleRecord('books', normalizedItem);
            }
            await onLogAction(`Batch imported ${items.length} book titles into inventory`);
            setIsImportModalOpen(false);
            await loadBooks();
            onDataChange();
        } catch (error: any) {
            console.error('Import error:', error);
            throw new Error(`Failed to import books: ${error.message}`);
        }
    };

    const handleDeleteBook = async (id: string) => {
        if (!confirm('Are you sure you want to delete this resource record? All associated lending history will be affected.')) return;
        try {
            await apiService.deleteModuleRecord('books', id);
            await onLogAction('Deleted resource record from catalogue registry');
            await loadBooks();
            onDataChange();
        } catch (error: any) {
            console.error('Delete error:', error);
            alert(`Failed to delete book: ${error.message || 'Database connection error'}`);
        }
    };

    const handlePrintQr = (book: Book) => {
        setQrBook(book);
        onLogAction(`Opened QR label portal for ${book.title}`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Inventory Overview HUD Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Titles</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalTitles}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{stats.categoryCount} Categories</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Physical Stock</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.totalCopies} <span className="text-xs font-bold text-slate-400">Copies</span></p>
                    <p className="text-[9px] font-bold text-indigo-400 mt-0.5">Total Institutional Assets</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Available on Shelves</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.availableCopies} <span className="text-xs font-bold text-slate-400">Units</span></p>
                    <p className="text-[9px] font-bold text-emerald-400 mt-0.5">Ready for Issue</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">In Circulation</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.inCirculation} <span className="text-xs font-bold text-slate-400">Borrowed</span></p>
                    <p className="text-[9px] font-bold text-amber-400 mt-0.5">Active Patron Loans</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex flex-1 flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Title, Author, ISBN, Accession No, or Shelf..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        {categories.map(cat => <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>)}
                    </select>
                    <select
                        value={availabilityFilter}
                        onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                        className="bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        <option value="All">All Stock Status</option>
                        <option value="Available">Available Only</option>
                        <option value="Circulating">Partially Borrowed</option>
                        <option value="Out">All Issued / Out</option>
                    </select>
                    <button
                        onClick={loadBooks}
                        className="p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-indigo-600 rounded-2xl transition-all"
                        title="Reload Inventory"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                        title="Import from Excel / CSV"
                    >
                        <DownloadIcon className="w-4 h-4 rotate-180" />
                        <span className="hidden sm:inline">Batch Import</span>
                    </button>
                    <button
                        onClick={() => { setIsAddingBook(true); setEditingBook(null); setNewBook({ title: '', author: '', isbn: '', accessionNumber: '', quantity: 1, available: 1, category: '', location: '' }); }}
                        className="btn-primary px-6 py-2.5 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        <PlusIcon className="w-4 h-4" />
                        New Entry
                    </button>
                </div>
            </div>

            {/* Inventory List */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Book Details</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Shelf / Lab</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {filteredBooks.map(book => (
                                <tr key={book.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-14 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-105">
                                                <BookOpenIcon className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{book.title}</p>
                                                <p className="text-xs font-bold text-slate-500">By {book.author}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-md">
                                                        {book.accessionNumber}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400">ISBN: {book.isbn}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                                            {book.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="space-y-1.5 min-w-[140px]">
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                    book.available === 0 
                                                        ? 'bg-rose-50 dark:bg-rose-900/40 text-rose-600' 
                                                        : book.available < book.quantity 
                                                            ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-600' 
                                                            : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600'
                                                }`}>
                                                    {book.available === 0 ? 'All Issued' : book.available < book.quantity ? `${book.quantity - book.available} in use` : 'Available'}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">
                                                    {book.available} / {book.quantity}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-300 ${
                                                        book.available === 0 
                                                            ? 'bg-rose-500' 
                                                            : book.available < book.quantity 
                                                                ? 'bg-amber-500' 
                                                                : 'bg-emerald-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, Math.max(0, (book.available / (book.quantity || 1)) * 100))}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <MapPinIcon className="w-3 h-3" />
                                            <span className="text-xs font-bold uppercase tracking-tight">{book.location || 'Not Set'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handlePrintQr(book)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                                                title="Print Label"
                                            >
                                                <QrCodeIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setEditingBook(book); setNewBook(book); setIsAddingBook(true); }}
                                                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                                                title="Edit"
                                            >
                                                <Edit2Icon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBook(book.id)}
                                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-xl transition-all"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredBooks.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full">
                                                <BookOpenIcon className="w-10 h-10 text-slate-300" />
                                            </div>
                                            <p className="text-sm font-black uppercase tracking-widest text-slate-400">No books found matching your criteria</p>
                                            <button onClick={() => { setIsAddingBook(true); setEditingBook(null); }} className="text-indigo-600 text-xs font-bold hover:underline">Catalogue your first book entry</button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isAddingBook && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                    {editingBook ? 'Edit Catalog Entry' : 'New Book Intake'}
                                </h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Register resource to central database</p>
                            </div>
                            <button onClick={() => setIsAddingBook(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all">
                                <XIcon className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveBook} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Book Title</label>
                                    <input
                                        type="text" required
                                        value={newBook.title}
                                        onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                        placeholder="e.g. Advanced Calculus for Engineers"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Author / Publisher</label>
                                    <input
                                        type="text" required
                                        value={newBook.author}
                                        onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Accession Number (Unique ID)</label>
                                        <input
                                            type="text"
                                            required
                                            value={newBook.accessionNumber}
                                            onChange={(e) => setNewBook({ ...newBook, accessionNumber: e.target.value.toUpperCase() })}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                            placeholder="e.g. LIB-2024-001"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Standard Reference (ISBN)</label>
                                        <input
                                            type="text"
                                            value={newBook.isbn}
                                            onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                            placeholder="ISBN-13 or ISSN"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Quantity</label>
                                    <input
                                        type="number" required min="1"
                                        value={newBook.quantity}
                                        onChange={(e) => setNewBook({ ...newBook, quantity: parseInt(e.target.value) })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Classification / Category</label>
                                    <input
                                        type="text" required list="category-list"
                                        value={newBook.category}
                                        onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                        placeholder="e.g. Science, Literature, Tech"
                                    />
                                    <datalist id="category-list">
                                        {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Shelf Location / Unit</label>
                                    <input
                                        type="text"
                                        value={newBook.location}
                                        onChange={(e) => setNewBook({ ...newBook, location: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                        placeholder="e.g. A2-S4 (Aisle 2, Shelf 4)"
                                    />
                                </div>
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setIsAddingBook(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Discard</button>
                                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-100 dark:shadow-none hover:translate-y-[-2px] active:translate-y-0">
                                    {editingBook ? 'Update Registry' : 'Commit Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {qrBook && (
                <BookQrCodeModal
                    book={qrBook}
                    onClose={() => setQrBook(null)}
                />
            )}

            {isImportModalOpen && (
                <SmartLibraryImporterModal
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleImportBooks}
                    institutionId={institutionId}
                />
            )}
        </div>
    );
};

