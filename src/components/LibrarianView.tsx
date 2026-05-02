
import React, { useState, useMemo } from 'react';
import type { User, Book, LibraryTransaction } from '../types';
import { BookOpenIcon } from './icons/BookOpenIcon';



interface LibrarianViewProps {
    user: User;
    users: User[];
    books: Book[];
    onAddBook: (book: Omit<Book, 'id' | 'institutionId' | 'addedDate'>) => void;
    onUpdateBook: (bookId: string, data: Partial<Book>) => void;
    onDeleteBook: (bookId: string) => void;
    transactions: LibraryTransaction[];
    onIssueBook: (bookId: string, userId: string, dueDate: string) => void;
    onReturnBook: (transactionId: string) => void;
}

export const LibrarianView: React.FC<LibrarianViewProps> = ({
    user,
    users,
    books,
    onAddBook,
    onUpdateBook,
    onDeleteBook,
    transactions,
    onIssueBook,
    onReturnBook,
}) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isAddingBook, setIsAddingBook] = useState(false);
    const [newBook, setNewBook] = useState({ title: '', author: '', isbn: '', quantity: 1, category: '', location: '', accessionNumber: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIssueStudent, setSelectedIssueStudent] = useState('');
    const [selectedIssueBook, setSelectedIssueBook] = useState('');
    const [issueDueDate, setIssueDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const filteredBooks = useMemo(() => {
        if (!searchTerm) return books;
        const lower = searchTerm.toLowerCase();
        return books.filter(b => b.title.toLowerCase().includes(lower) || b.author.toLowerCase().includes(lower) || b.isbn.includes(lower));
    }, [books, searchTerm]);

    const stats = useMemo(() => {
        const totalBooks = books.reduce((sum, b) => sum + b.quantity, 0);
        const issuedBooks = transactions.filter(t => t.status === 'issued' || t.status === 'overdue').length;
        const overdueBooks = transactions.filter(t => {
            if (t.status !== 'issued') return false;
            // Standardized camelCase
            return new Date(t.dueDate) < new Date();
        }).length;
        return { totalBooks, issuedBooks, overdueBooks };
    }, [books, transactions]);

    const handleAddBookSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newBook.title && newBook.quantity > 0) {
            onAddBook({ ...newBook, available: newBook.quantity });
            setNewBook({ title: '', author: '', isbn: '', quantity: 1, category: '', location: '', accessionNumber: '' });
            setIsAddingBook(false);
        }
    };

    const handleIssueSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIssueStudent && selectedIssueBook && issueDueDate) {
            const book = books.find(b => b.id === selectedIssueBook);
            if (book && book.available > 0) {
                onIssueBook(selectedIssueBook, selectedIssueStudent, issueDueDate);
                setSelectedIssueBook('');
                setSelectedIssueStudent('');
                alert('Book issued successfully!');
            } else {
                alert('This book is not available.');
            }
        }
    };

    const getStudentName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
    const getBookTitle = (id: string) => books.find(b => b.id === id)?.title || 'Unknown Book';

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full"><BookOpenIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" /></div>
                Library Management System
            </h2>
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {['dashboard', 'inventory', 'circulation', 'history'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`${activeTab === tab ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}>{tab}</button>
                    ))}
                </nav>
            </div>
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Inventory Items</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalBooks}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Circulating</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.issuedBooks}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Delayed Returns</p>
                        <p className="text-3xl font-bold text-red-600">{stats.overdueBooks}</p>
                    </div>
                </div>
            )}
            {activeTab === 'inventory' && (
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr><th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Book</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">ISBN</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Available</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredBooks.map(book => (
                                <tr key={book.id}>
                                    <td className="px-6 py-4"><p className="font-bold">{book.title}</p><p className="text-xs text-slate-500">{book.author}</p></td>
                                    <td className="px-6 py-4 text-sm">{book.isbn}</td>
                                    <td className="px-6 py-4"><span className={`font-bold ${book.available === 0 ? 'text-red-600' : 'text-green-600'}`}>{book.available}</span> / {book.quantity}</td>
                                    <td className="px-6 py-4"><button onClick={() => onDeleteBook(book.id)} className="text-red-600 hover:underline text-sm">Delete</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {activeTab === 'circulation' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Issue Registry</h3>
                        <form onSubmit={handleIssueSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                            <div><label className="block text-sm font-medium mb-1">User</label><select value={selectedIssueStudent} onChange={e => setSelectedIssueStudent(e.target.value)} className="form-select w-full" required><option value="">-- Select --</option>{users.filter(u => u.role !== 'super_admin').map(u => <option key={u.id} value={u.id}>{u.name} ({u.staffId})</option>)}</select></div>
                            <div><label className="block text-sm font-medium mb-1">Book</label><select value={selectedIssueBook} onChange={e => setSelectedIssueBook(e.target.value)} className="form-select w-full" required><option value="">-- Select --</option>{books.filter(b => b.available > 0).map(b => <option key={b.id} value={b.id}>{b.title} ({b.available} left)</option>)}</select></div>
                            <div><label className="block text-sm font-medium mb-1">Due Date</label><input type="date" value={issueDueDate} onChange={e => setIssueDueDate(e.target.value)} className="form-input w-full" required /></div>
                            <button type="submit" className="btn-primary w-full">Commit Issue</button>
                        </form>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Active Issues</h3>
                        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                                {transactions.filter(t => t.status === 'issued' || t.status === 'overdue').map(t => {
                                    // Unified camelCase properties
                                    const isOverdue = new Date(t.dueDate) < new Date();
                                    return (
                                        <li key={t.id} className="p-4 flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{getBookTitle(t.bookId)}</p>
                                                <p className="text-sm text-slate-500">Issued to: {getStudentName(t.userId)}</p>
                                                <p className={`text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>Due: {new Date(t.dueDate).toLocaleDateString()} {isOverdue && '(OVERDUE)'}</p>
                                            </div>
                                            <button onClick={() => onReturnBook(t.id)} className="btn-secondary text-xs">Mark Returned</button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'history' && (
                 <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date Issued</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Book</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Date Returned</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {/* Standardized properties */}
                            {transactions.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()).map(t => (
                                <tr key={t.id}>
                                    <td className="px-6 py-4 text-sm">{new Date(t.issueDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-medium text-sm">{getBookTitle(t.bookId)}</td>
                                    <td className="px-6 py-4 text-sm">{getStudentName(t.userId)}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs capitalize ${t.status === 'returned' ? 'bg-green-100 text-green-800' : t.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{t.status}</span></td>
                                    <td className="px-6 py-4 text-sm">{t.returnDate ? new Date(t.returnDate).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            )}
            
             <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; }
                .dark .btn-secondary { background-color: #4b5563; color: white; }
            `}</style>
        </div>
    );
};

