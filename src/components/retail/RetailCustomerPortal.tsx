import React, { useState, useEffect } from 'react';
import {
    Wallet,
    Gift,
    Clock,
    Calendar,
    ChevronRight,
    CreditCard,
    History,
    MapPin,
    Star,
    Zap,
    Download,
    CircleCheck,
    PlayCircle,
    Package,
    ArrowUpRight
} from 'lucide-react';
import { User, ServiceBooking, Institution, RetailSale } from '../../types';
import { apiService } from '../../services/apiService';

interface RetailCustomerPortalProps {
    currentUser: User;
    currentInstitution: Institution;
}

export function RetailCustomerPortal({ currentUser, currentInstitution }: RetailCustomerPortalProps) {
    const isCarWash = currentInstitution?.businessSubType === 'Car Wash';
    const [activeTab, setActiveTab] = useState<'overview' | 'booking' | 'wallet' | 'loyalty'>('overview');
    const [bookings, setBookings] = useState<ServiceBooking[]>([]);
    const [sales, setSales] = useState<RetailSale[]>([]);
    const [points, setPoints] = useState(currentUser.loyaltyPoints || 0);
    const [walletBalance, setWalletBalance] = useState(currentUser.walletBalance || 0);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

    useEffect(() => {
        const loadCustomerData = async () => {
            // Mock Bookings
            setBookings([
                {
                    id: 'bk_1',
                    customerName: currentUser.name,
                    customerPhone: currentUser.phoneNumber,
                    serviceType: isCarWash ? 'Executive Car Wash' : 'Standard Product Order',
                    bookingDate: '2026-03-05',
                    bookingTime: '10:00 AM',
                    status: 'confirmed',
                    institutionId: currentUser.institutionId,
                    createdAt: new Date().toISOString()
                }
            ]);

            // Fetch actual sales where customer matches
            try {
                const allSales = await apiService.fetchModuleRecords<RetailSale>('retail_sales', currentUser.institutionId);
                const customerSales = allSales.filter(s =>
                    (s.customerPhone && s.customerPhone === currentUser.phoneNumber) ||
                    (s.customerEmail && s.customerEmail === currentUser.email)
                ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setSales(customerSales);
            } catch (error) {
                console.error("Failed to load customer sales:", error);
            }
        };

        loadCustomerData();
    }, [currentUser, isCarWash]);

    const stats = [
        { label: 'Wallet Balance', value: `KES ${walletBalance.toLocaleString()}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Loyalty Points', value: points.toLocaleString(), icon: Gift, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: isCarWash ? 'Total Visits' : 'Total Orders', value: '12', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    const handleTopUp = async () => {
        // Simulate STK Push
        const amount = 500;
        alert(`Initiated KES ${amount} Top-up via M-Pesa. Please check your phone.`);
        // In real app, we would call apiService.initiateMpesaPayment
        setTimeout(() => {
            setWalletBalance((prev: number) => prev + amount);
            alert('Top-up successful! Your wallet has been updated.');
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Premium Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-800 tracking-tight">Customer Portal</h1>
                                <p className="text-slate-500 text-xs font-medium">Welcome back, {currentUser.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                                <Star className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {stats.map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{stat.label}</h3>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Live Tracker (Simulated - Only for Car Wash) */}
                        {isCarWash && (
                            <section className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200 mb-8">
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <span className="bg-indigo-500/30 text-indigo-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-400/30">
                                                Live Service Tracker
                                            </span>
                                            <h2 className="text-2xl font-black mt-3">Executive Detail in Progress</h2>
                                        </div>
                                        <div className="h-16 w-16 rounded-full border-4 border-indigo-400/30 flex items-center justify-center bg-white/10 backdrop-blur-md">
                                            <span className="text-xl font-black">75%</span>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center border-4 border-white/20">
                                                <CircleCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">Interior Vacuuming</p>
                                                <p className="text-indigo-200 text-xs">Completed at 10:15 AM</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 border-4 border-white/20 animate-pulse">
                                                <PlayCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">Exterior Foam Wash</p>
                                                <p className="text-indigo-200 text-xs">Currently active</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 opacity-50">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/50 flex items-center justify-center border-4 border-white/20">
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">Wax & Polish</p>
                                                <p className="text-indigo-200 text-xs">Next step</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button className="mt-8 w-full py-4 bg-white text-indigo-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                                        View Live CCTV Feed <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Decorative background circle */}
                                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                            </section>
                        )}

                        {/* Booking Section */}
                        <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">{isCarWash ? 'Your Bookings' : 'Your Orders'}</h2>
                                <button
                                    onClick={() => setIsBookingModalOpen(true)}
                                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                >
                                    {isCarWash ? 'Book New Service' : 'Place New Order'}
                                </button>
                            </div>

                            {bookings.length > 0 ? (
                                <div className="space-y-4">
                                    {bookings.map((booking) => (
                                        <div key={booking.id} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                    <Calendar className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{booking.serviceType}</p>
                                                    <p className="text-slate-500 text-xs">{booking.bookingDate} at {booking.bookingTime}</p>
                                                </div>
                                            </div>
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Calendar className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-medium">No upcoming bookings found</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Sidebar Area */}
                    <div className="space-y-8">
                        {/* Wallet Manager */}
                        <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                            <h2 className="text-lg font-black text-slate-800 mb-6">Digital Wallet</h2>
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white mb-6 shadow-xl shadow-indigo-100 relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Available Balance</p>
                                    <p className="text-3xl font-black mb-6">KES {walletBalance.toLocaleString()}</p>
                                    <button
                                        onClick={handleTopUp}
                                        className="w-full py-3 bg-white text-indigo-900 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CreditCard className="w-4 h-4" /> Top Up via M-Pesa
                                    </button>
                                </div>
                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                    <Zap className="w-20 h-20" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Recent Transactions</h3>
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">M-Pesa Deposit</p>
                                            <p className="text-[10px] text-slate-400">Mar 04, 2026</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-emerald-600">+500</span>
                                </div>
                                {/* Show actual recent sales in the wallet history if any exist */}
                                {sales.slice(0, 3).map(sale => (
                                    <div key={sale.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">
                                                    {sale.items.length > 0 ? sale.items[0].name : 'Retail Purchase'}
                                                    {sale.items.length > 1 && ` +${sale.items.length - 1} more`}
                                                </p>
                                                <p className="text-xs text-slate-500">{new Date(sale.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-slate-800">KES {sale.totalAmount.toFixed(2)}</span>
                                            <button
                                                className="block text-[10px] uppercase font-bold text-indigo-600 tracking-widest hover:underline mt-1"
                                                onClick={() => alert(`Downloading Invoice for Sale \nTotal: KES {sale.totalAmount}\nItems: ${sale.items.map(i => i.name).join(', ')}`)}
                                            >
                                                Receipt
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {sales.length === 0 && (
                                    <div className="flex items-center justify-between py-2 opacity-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
                                                <Package className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{isCarWash ? 'Standard Wash' : 'Grocery Bundle'}</p>
                                                <p className="text-[10px] text-slate-400">Mar 01, 2026</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-slate-600">-250</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Loyalty Card */}
                        <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-black text-slate-800">Loyalty Rewards</h2>
                                <Gift className="w-6 h-6 text-amber-500" />
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-end mb-2">
                                    <p className="text-3xl font-black text-slate-900">{points}</p>
                                    <p className="text-xs text-slate-500 font-medium">150 to next reward</p>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                                        style={{ width: `${(points / 1000) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-sm">
                                <p className="text-xs font-bold text-amber-800 mb-1">Available Reward</p>
                                <p className="text-sm font-black text-slate-800 mb-3 underline decoration-amber-300 decoration-2 underline-offset-4">{isCarWash ? 'Free Engine Wash' : '10% Off Next Order'}</p>
                                <button className="w-full py-2 bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-amber-600 transition-all">
                                    Redeem Now
                                </button>
                            </div>
                        </section>

                        {/* Quick Actions */}
                        <section className="space-y-3">
                            <button className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                        <History className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">Service History</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                            </button>
                            <button className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">Find Branches</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                            </button>
                        </section>
                    </div>
                </div>
            </div>

            {/* Service Booking Modal (Simplified) */}
            {isBookingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm bg-slate-900/40">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
                        <div className="p-8 border-b border-slate-100">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{isCarWash ? 'Schedule Service' : 'New Order'}</h2>
                            <p className="text-slate-500 text-sm font-medium">{isCarWash ? 'Pick a time that works for you' : 'Customize your order details'}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{isCarWash ? 'Select Service' : 'Product Category'}</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none ring-indigo-500 focus:ring-2">
                                    {isCarWash ? (
                                        <>
                                            <option>Standard Maintenance Wash</option>
                                            <option>Executive Detail</option>
                                            <option>Leather Treatment</option>
                                            <option>Ceramic Coating</option>
                                        </>
                                    ) : (
                                        <>
                                            <option>Daily Essentials</option>
                                            <option>Hardwares & Tools</option>
                                            <option>Electronic Gadgets</option>
                                            <option>Seasonal Wholesale</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{isCarWash ? 'Date' : 'Order Date'}</label>
                                    <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{isCarWash ? 'Time' : 'Qty / Specs'}</label>
                                    {isCarWash ? (
                                        <input type="time" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                    ) : (
                                        <input type="text" placeholder="e.g. 5 Units" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 flex gap-4">
                            <button
                                onClick={() => setIsBookingModalOpen(false)}
                                className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    alert(`${isCarWash ? 'Booking' : 'Order'} submitted successfully! You will receive a confirmation SMS shortly.`);
                                    setIsBookingModalOpen(false);
                                }}
                                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                            >
                                {isCarWash ? 'Confirm Booking' : 'Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
