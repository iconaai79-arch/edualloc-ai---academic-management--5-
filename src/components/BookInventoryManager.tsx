
import React, { useState, useEffect, useMemo } from 'react';
import type { Book, User } from '../types';
import {
    PlusIcon, SearchIcon, Edit2Icon, TrashIcon, QrCodeIcon,
    FilterIcon, BookOpenIcon, ArchiveBoxIcon, MapPinIcon, ListIcon,
    DownloadIcon, ArrowPathIcon, XIcon
} from './icons/index';
import { apiService } from '../services/apiService';

import { BookQrCodeModal } from './BookQrCodeModal';

interface BookInventoryManagerProps {
    institutionId: string;
    users: User[];
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

export const BookInventoryManager: React.FC<BookInventoryManagerProps> = ({
    institutionId,
    users,
    onLogAction,
    onDataChange
}) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [isAddingBook, setIsAddingBook] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [qrBook, setQrBook] = useState<Book | null>(null);

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

    const loadBooks = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<Book>('books', institutionId);
            setBooks(data);
        } catch (error) {
            console.error('Error loading books:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(() => {
        const cats = new Set(books.map(b => b.category).filter(Boolean));
        return ['All', ...Array.from(cats)];
    }, [books]);

    const filteredBooks = useMemo(() => {
        return books.filter(b => {
            const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.isbn.includes(searchTerm);
            const matchesCategory = categoryFilter === 'All' || b.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [books, searchTerm, categoryFilter]);

    const handleSaveBook = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const bookData = editingBook
                ? {
                    ...editingBook,
                    ...newBook,
                    institutionId, // Ensure it's present for older records
                    // Ensure available copies stay in sync if quantity changed
                    available: newBook.quantity !== editingBook.quantity
                        ? Math.max(0, (newBook.quantity || 0) - (editingBook.quantity - editingBook.available))
                        : editingBook.available
                }
                : {
                    ...newBook,
                    id: `bk_${Date.now()}`,
                    accessionNumber: newBook.accessionNumber || `ACC-${Date.now().toString().slice(-6)}`,
                    institutionId,
                    addedDate: new Date().toISOString(),
                    available: newBook.quantity || 0
                };

            await apiService.saveModuleRecord('books', bookData);
            await onLogAction(`${editingBook ? 'Updated' : 'Added'} book: ${bookData.title}`);
            setIsAddingBook(false);
            setEditingBook(null);
            setNewBook({ title: '', author: '', isbn: '', accessionNumber: '', quantity: 1, available: 1, category: '', location: '' });
            loadBooks();
            onDataChange();
        } catch (error: any) {
            console.error('Book Save Error:', error);
            alert(`Failed to save book record: ${error.message || 'Unknown database error'}`);
        }
    };

    const handleDeleteBook = async (id: string) => {
        if (!confirm('Are you sure you want to remove this book from the catalog? This will delete all copies and history.')) return;
        try {
            await apiService.deleteModuleRecord('books', id);
            await onLogAction(`Deleted book from inventory: ${id}`);
            loadBooks();
            onDataChange();
        } catch (error) {
            alert('Error deleting book.');
        }
    };

    const handlePrintQr = (book: Book) => {
        setQrBook(book);
        onLogAction(`Opened QR label portal for ${book.title}`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex flex-1 gap-4">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Title, Author, or ISBN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest px-4 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <button
                    onClick={() => { setIsAddingBook(true); setEditingBook(null); }}
                    className="btn-primary px-6 py-2 rounded-2xl flex items-center justify-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Entry
                </button>
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
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center w-32">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ratio</span>
                                                <span className={`text-[10px] font-black ${book.available === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {book.available} / {book.quantity}
                                                </span>
                                            </div>
                                            <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${book.available === 0 ? 'bg-rose-500' : 'bg-emerald-500'} transition-all`}
                                                    style={{ width: `${(book.available / book.quantity) * 100}%` }}
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
            {isAddingBook && (
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
                </div>
            )}

            {qrBook && (
                <BookQrCodeModal
                    book={qrBook}
                    onClose={() => setQrBook(null)}
                />
            )}
        </div>
    );
};
