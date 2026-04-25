
import React, { useState, useMemo } from 'react';
import type { Book, User } from '../../types';
import { SearchIcon } from '../icons/SearchIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { FilterIcon } from '../icons/FilterIcon';

interface DigitalCatalogProps {
    books: Book[];
    onReserve?: (bookId: string) => Promise<void>;
}

export const DigitalCatalog: React.FC<DigitalCatalogProps> = ({
    books,
    onReserve
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = useMemo(() => {
        const cats = new Set(books.map(b => b.category).filter(Boolean));
        return ['All', ...Array.from(cats)];
    }, [books]);

    const filteredBooks = useMemo(() => {
        return books.filter(b => {
            const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.author.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [books, searchTerm, selectedCategory]);

    return (
        <div className="space-y-10">
            {/* Catalog Search & Filtering */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full">
                        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Explore the digital archives (Title, Author, Subject)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[2rem] text-sm font-black focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <select 
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer hover:bg-slate-800 transition-all"
                        >
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Book Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredBooks.map((book, i) => (
                    <div key={i} className="group bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 overflow-hidden flex flex-col">
                        <div className="relative aspect-[3/4] bg-slate-50 overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <BookOpenIcon className="w-16 h-16 text-slate-200 group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="absolute top-4 left-4">
                                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm border border-slate-100">
                                    {book.category}
                                </span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                            <div>
                                <h4 className="text-lg font-black text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors uppercase">{book.title}</h4>
                                <p className="text-xs font-bold text-slate-400 mt-2">By {book.author}</p>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-400">Available</span>
                                    <span className={book.available > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                        {book.available} Units
                                    </span>
                                </div>
                                <button 
                                    onClick={() => onReserve?.(book.id)}
                                    disabled={book.available === 0}
                                    className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        book.available > 0 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:translate-y-[-2px] active:translate-y-0' 
                                        : 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100'
                                    }`}
                                >
                                    {book.available > 0 ? 'Reserve Copy' : 'Out of Stock'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredBooks.length === 0 && (
                <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto">
                        <SearchIcon className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No resources found in this quadrant</p>
                </div>
            )}
        </div>
    );
};
