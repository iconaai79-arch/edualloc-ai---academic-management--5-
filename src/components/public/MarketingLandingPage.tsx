import React, { useEffect, useState, useMemo } from 'react';
import {
  Sparkles, Building2, Stethoscope, ShoppingCart, Car, GraduationCap,
  ArrowRight, ShieldCheck, Zap, Layers, Share2, Smartphone, Globe,
  Truck, Megaphone, Scale, Wrench, CheckCircle2, ChevronRight, ChevronDown,
  Check, Upload, RotateCcw, X, Palette, Calendar, Phone, MapPin,
  Briefcase, Eye, Sliders, Play, Award, DollarSign, Calculator,
  Cpu, Radio, CreditCard, Clock, Activity, FileText, Send, Download,
  RefreshCw, BarChart3, Users, Star, ArrowUpRight, Search, Copy,
  Printer, CheckCheck, Lock, ExternalLink
} from 'lucide-react';
import './MarketingLanding.css';
import { apiService } from '../../services/apiService';
import { CompanyDetails, OfficialStampConfig } from '../../types';
import { MODULES } from '../../constants';
import { AiSalesAgentWidget } from './AiSalesAgentWidget';
import { KenyanOfficialStamp } from '../common/KenyanOfficialStamp';
import { generateStampDataUri, formatStampDate } from '../../utils/stampGenerator';

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {}
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    return false;
  }
};

export interface IndustryVertical {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  icon: any;
  gradient: string;
  color: string;
  accentHex: string;
  targetUsers: string[];
  keyAutomations: string[];
  hardwareIoT: string[];
  bankingIntegrations: string[];
  sampleWorkflow: { step: string; desc: string }[];
  metrics: { label: string; value: string }[];
  role: string;
  modId: string;
}

const INDUSTRY_VERTICALS: IndustryVertical[] = [
  {
    id: 'education',
    name: 'Education & Universities',
    badge: 'Flagship Academic OS',
    tagline: 'Autonomous AI Timetables, CBC Assessments & Instant M-Pesa Fee Portals',
    description: 'A powerhouse academic enterprise system for primary, secondary, and tertiary institutions. Eliminates 90% of manual scheduling, grading, report generation, and fee follow-ups.',
    icon: GraduationCap,
    gradient: 'from-indigo-600 via-purple-600 to-pink-500',
    color: 'text-indigo-400',
    accentHex: '#4f46e5',
    targetUsers: ['Universities', 'High Schools (KCSE)', 'Primary CBC Schools', 'Driving Schools', 'Beauty & Technical TVETs'],
    keyAutomations: [
      'Zero-Conflict AI Timetabling Engine (2,000+ slots in < 5 seconds)',
      'Exam Units & Automatic Broadsheets with Ranking & Mean Grade',
      'Dynamic Kenyan Official Circular ⭕ & Oval ⬭ Stamp Dater',
      'CBC Formative Strands, Core Competencies & e-Portfolio Vault',
      'M-Pesa C2B Paybill & STK Push Real-Time Fee Apportioning',
      'Automated Results & Fee Balance SMS Notification Gateway'
    ],
    hardwareIoT: ['RFID Student Gate Turnstiles', 'Biometric Staff Clock-in', 'Barcode Student ID Printers', 'Bluetooth Receipt Terminals'],
    bankingIntegrations: ['Safaricom M-Pesa Daraja 2.0 (STK & C2B)', 'KCB Bank Host-to-Host', 'Co-op Bank Direct', 'NCBA Fee Pay'],
    sampleWorkflow: [
      { step: '1. Parent Payment', desc: 'Parent pays KES 15,000 via M-Pesa Paybill.' },
      { step: '2. Instant Apportioning', desc: 'System automatically clears Tuition & Boarding voteheads.' },
      { step: '3. Stamped Receipt', desc: 'Official Circular Dater Stamp PDF receipt generated & SMS sent immediately.' }
    ],
    metrics: [
      { label: 'Scheduling Time', value: '4 mins (vs 3 weeks)' },
      { label: 'Fee Collection Rate', value: '+38% faster' },
      { label: 'Report Generation', value: 'Instant Bulk PDF' }
    ],
    role: 'academics_officer',
    modId: 'edu'
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Hospital (HIS)',
    badge: 'Clinical & EHR Operating System',
    tagline: 'End-to-End Patient Flow: Triage, E-Prescriptions, Reference Lab & Cashier',
    description: 'Designed for clinics, hospitals, and pharmacies to eliminate paper files, accelerate doctor consultations, automate pharmaceutical inventory, and reconcile insurance claims.',
    icon: Stethoscope,
    gradient: 'from-emerald-600 via-teal-600 to-cyan-500',
    color: 'text-emerald-400',
    accentHex: '#059669',
    targetUsers: ['Multi-Specialty Hospitals', 'Outpatient Clinics', 'Community Health Centers', 'Commercial Pharmacies', 'Diagnostic Labs'],
    keyAutomations: [
      'Smart Digital Triage & Automated Doctor Queue Routing',
      'EHR Doctor Consultation with Auto ICD-10 Coding',
      'Connected Reference Lab Portal with Auto Critical-Value Flags',
      'E-Prescription Dispensing with Batch & Expiry Safety Locks',
      'Direct Cashier & NHIF / Private Insurance Billing Engine',
      'Telemedicine Video Consultations & Patient SMS Reminders'
    ],
    hardwareIoT: ['Barcode Blood Specimen Scanners', 'Thermal Prescription Label Printers', 'Biometric Patient Lookup', 'Queue Token Displays'],
    bankingIntegrations: ['M-Pesa Medical Paybill', 'Corporate Insurance EDI', 'Credit Card POS', 'Direct Bank Settlements'],
    sampleWorkflow: [
      { step: '1. Patient Triage', desc: 'Vitals logged at triage desk; auto-assigned to next available physician.' },
      { step: '2. Lab & Rx Order', desc: 'Doctor orders CBC test & Antibiotics; routed to Lab & Pharmacy in real time.' },
      { step: '3. Cashier Sync', desc: 'Bill consolidated automatically; itemized invoice cleared via M-Pesa STK.' }
    ],
    metrics: [
      { label: 'Patient Wait Time', value: '-65% reduction' },
      { label: 'Drug Wastage', value: '< 0.5% expired' },
      { label: 'Billing Accuracy', value: '100% audit-proof' }
    ],
    role: 'doctor',
    modId: 'his'
  },
  {
    id: 'retail',
    name: 'Retail, Supermarket & POS',
    badge: 'High-Volume Commerce Engine',
    tagline: 'Dual-Mode Offline POS, Smart Stock Reordering & Multi-Branch Accounting',
    description: 'Engineered for supermarkets, wholesale depots, agrovets, and retail chains with split-second barcode checkouts, multi-warehouse transfers, and instant profit/loss statements.',
    icon: ShoppingCart,
    gradient: 'from-amber-500 via-orange-600 to-rose-600',
    color: 'text-amber-400',
    accentHex: '#d97706',
    targetUsers: ['Supermarkets & Minimarts', 'Agrovets & Farm Supplies', 'Wholesale Distributors', 'Hardware Stores', 'Boutiques & Electronics'],
    keyAutomations: [
      'Ultra-Fast Barcode Scanning & Offline-First POS Engine',
      'Dynamic Price Margins & Tiered Customer Wholesale Discounts',
      'Automated Low-Stock Alerts & Supplier LPO Generation',
      'Multi-Branch Inventory Sync & Stock Discrepancy Audits',
      'Cashier Shift Reconciliation with Float & Variance Tracking',
      'Customer Loyalty Points & Digital SMS Receipts'
    ],
    hardwareIoT: ['1D/2D Barcode Scanners', 'ESC/POS 80mm Thermal Printers', 'Electronic Cash Drawers', 'Digital Weighing Scale Integration'],
    bankingIntegrations: ['M-Pesa Till / Paybill Instant Validation', 'Credit/Debit Card POS', 'Bank Deposit Feeds'],
    sampleWorkflow: [
      { step: '1. Fast Barcode Scan', desc: 'Cashier scans items with instant stock deduction.' },
      { step: '2. M-Pesa Dynamic QR / STK', desc: 'Customer receives STK prompt; transaction clears in 2 seconds.' },
      { step: '3. Automated Reorder', desc: 'When stock drops below threshold, automated LPO drafted for vendor.' }
    ],
    metrics: [
      { label: 'Checkout Speed', value: '< 15 sec / customer' },
      { label: 'Stock Shrinkage', value: 'Down by 82%' },
      { label: 'Offline Resiliency', value: '100% uptime' }
    ],
    role: 'retail_manager',
    modId: 'retail'
  },
  {
    id: 'property',
    name: 'Real Estate & Property Management',
    badge: 'Autonomous Asset Suite',
    tagline: 'Automated Rent Invoicing, M-Pesa Matching, Water Meters & Landlord Portals',
    description: 'Transform property portfolios with autonomous monthly rent billing, automated utility meter deductions, maintenance task assignments, and instant landlord net disbursement payouts.',
    icon: Building2,
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
    color: 'text-blue-400',
    accentHex: '#2563eb',
    targetUsers: ['Property Management Agencies', 'Apartment Complex Landlords', 'Commercial Office Plazas', 'Student Hostels & Residencies'],
    keyAutomations: [
      'Automated 1st-of-Month Tenant Invoicing & Rent Accruals',
      'Instant M-Pesa Paybill Rent Reconciliation with Tenant Unit Number',
      'Water & Electricity Sub-Meter Consumption Rate Calculations',
      'Automated Late Payment Penalties & SMS Reminders',
      'Digital Lease Agreements with E-Signatures & Move-in Checklists',
      'Landlord Net Revenue Statements & Automated Bank Payouts'
    ],
    hardwareIoT: ['Smart Water IoT Flow Meters', 'Digital Keycard Door Locks', 'Gate Access Logs'],
    bankingIntegrations: ['M-Pesa Rent Paybill', 'Automated Landlord B2C Bank Transfers', 'Equity Bank Statements'],
    sampleWorkflow: [
      { step: '1. Invoice Generated', desc: 'Rent + water bill auto-computed & SMS dispatched on the 1st.' },
      { step: '2. Tenant Pays M-Pesa', desc: 'Tenant pays with House #; ledger updates and receipt sent immediately.' },
      { step: '3. Landlord Disbursement', desc: 'Agency fee deducted and net amount disbursed to landlord account on 10th.' }
    ],
    metrics: [
      { label: 'Rent Collection Rate', value: '98.5% on-time' },
      { label: 'Manual Billing Time', value: 'Reduced to 0 hrs' },
      { label: 'Dispute Rate', value: '< 1%' }
    ],
    role: 'landlord',
    modId: 'property'
  },
  {
    id: 'coop',
    name: 'Cooperatives, SACCOs & Agribusiness',
    badge: 'Farmer & Member Engine',
    tagline: 'Weighbridge Produce Intake, Member Deductions, Credit Advances & Agrovet Sync',
    description: 'A comprehensive management platform for dairy, coffee, tea, and grain cooperatives with real-time produce weighing, member shares ledger, loan advances, and automated monthly payroll.',
    icon: Users,
    gradient: 'from-teal-600 via-emerald-600 to-green-600',
    color: 'text-teal-400',
    accentHex: '#0d9488',
    targetUsers: ['Dairy Farmers Cooperatives', 'Coffee & Tea SACCOs', 'Grain Millers & Cereal Boards', 'Farmers Unions & Agrovets'],
    keyAutomations: [
      'Produce Intake Weighbridge Logging (Milk Litres / Grain Bags)',
      'Member Credit Advances & Agrovet Deductions Reconciliation',
      'Automated End-Month Farmer Payroll Calculations',
      'SACCO Shares & Dividend Distribution Engine',
      'Bulk Farmer SMS Produce Intake Confirmations',
      'Produce Quality Grading & Rejection Audits'
    ],
    hardwareIoT: ['Digital Weighing Scales (RS232 / USB)', 'RFID Member Smart Cards', 'Mobile Handheld Intake POS Terminals'],
    bankingIntegrations: ['Bulk M-Pesa B2C Farmer Disbursements', 'Co-operative Bank Host-to-Host', 'KCB SACCO Integration'],
    sampleWorkflow: [
      { step: '1. Morning Intake', desc: 'Farmer delivers milk; weigh scale records 42.5 L via smart card.' },
      { step: '2. Agrovet Deductions', desc: 'Fertilizer purchased on credit is automatically netted against earnings.' },
      { step: '3. Bulk Payroll', desc: 'One-click payroll sends KES earnings directly to 2,500 farmers via M-Pesa B2C.' }
    ],
    metrics: [
      { label: 'Payroll Processing', value: '3 mins (vs 4 days)' },
      { label: 'Weight Fraud', value: '0% scale tamper' },
      { label: 'Farmer Trust', value: 'Instant SMS proof' }
    ],
    role: 'coop_admin',
    modId: 'coop'
  },
  {
    id: 'automotive',
    name: 'Car Showrooms, Garages & Logistics',
    badge: 'Automotive & Fleet Suite',
    tagline: 'Vehicle Marketplace, Hire Purchase Invoices, Repair Job Cards & Fuel Logs',
    description: 'Complete operating system for car dealerships, auto workshops, and transport fleet logistics with digital vehicle specs, installment repayment tracking, job card mechanics, and mileage fuel efficiency.',
    icon: Car,
    gradient: 'from-rose-600 via-red-600 to-amber-600',
    color: 'text-rose-400',
    accentHex: '#e11d48',
    targetUsers: ['Car Import Showrooms', 'Auto Repair Garages & Service Centers', 'Fleet & Logistics Operators', 'Car Wash & Detailing Hubs'],
    keyAutomations: [
      'Public Vehicle Showcase with Dynamic Filters & Specs',
      'Hire Purchase Installment Financing & Payment Schedules',
      'Branded Automotive Digital Invoices & Sales Agreements',
      'Workshop Job Card Management with Parts & Labor Billing',
      'Fleet Fuel Mileage Consumption & Driver Log Audits',
      'Scheduled Maintenance Reminders via SMS & WhatsApp'
    ],
    hardwareIoT: ['OBD-II GPS Vehicle Trackers', 'Fuel Sensor Interfaces', 'Thermal Job Card Printers'],
    bankingIntegrations: ['Bank Asset Finance Integration', 'M-Pesa Corporate Paybill', 'RTGS Escrow Feeds'],
    sampleWorkflow: [
      { step: '1. Vehicle Invoiced', desc: 'Dealership creates official sale agreement with payment schedule.' },
      { step: '2. Installment Tracked', desc: 'Monthly customer payment updates remaining balance automatically.' },
      { step: '3. Workshop Service', desc: 'Car enters service bay; job card logs mechanic time and spare parts.' }
    ],
    metrics: [
      { label: 'Inventory Turnover', value: '+45% faster sales' },
      { label: 'Job Card Billing', value: '100% captured parts' },
      { label: 'Fleet Fuel Abuse', value: '-30% savings' }
    ],
    role: 'car_dealer',
    modId: 'showroom'
  }
];

interface MarketingLandingPageProps {
  onOpenStore?: () => void;
  onLogin?: () => void;
  onBookDemo?: () => void;
  onLaunchSimulator?: (role: any, modId: string) => void;
  onRegister?: (modId: string) => void;
}

export const MarketingLandingPage: React.FC<MarketingLandingPageProps> = ({
  onLogin,
  onBookDemo,
  onLaunchSimulator,
  onRegister
}) => {
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [selectedVertical, setSelectedVertical] = useState<string>('education');
  const [activeModalVertical, setActiveModalVertical] = useState<IndustryVertical | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── LIVE AUTOMATION PLAYGROUND STATES ──
  const [playgroundTab, setPlaygroundTab] = useState<'stamp' | 'mpesa'>('stamp');

  // Stamp Playground
  const [stampShape, setStampShape] = useState<'circle' | 'oval'>('circle');
  const [stampName, setStampName] = useState('ABMIS TECHNOLOGIES LTD');
  const [stampAddress, setStampAddress] = useState('P.O. BOX 1765 - 30100, ELDORET');
  const [stampDept, setStampDept] = useState('FINANCE & BURSAR');
  const [stampInk, setStampInk] = useState('#0047AB');
  const [stampDate, setStampDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGeneratingStamp, setIsGeneratingStamp] = useState(false);

  // M-Pesa Playground
  const [mpesaPhone, setMpesaPhone] = useState('0712345678');
  const [mpesaAmount, setMpesaAmount] = useState('5000');
  const [mpesaPayer, setMpesaPayer] = useState('John Doe (Adm #1042)');
  const [mpesaSimState, setMpesaSimState] = useState<'idle' | 'pushing' | 'cleared'>('idle');
  const [simulatedReceiptRef, setSimulatedReceiptRef] = useState('RC-849201');

  // ROI Calculator
  const [clientCount, setClientCount] = useState(650);
  const [manualHoursPerWeek, setManualHoursPerWeek] = useState(25);

  const calculatedRoi = useMemo(() => {
    const hoursSavedMonth = Math.round(manualHoursPerWeek * 3.8);
    const paperSavingsKES = Math.round(clientCount * 120);
    const revenueProtectedKES = Math.round(clientCount * 850);
    return {
      hoursSaved: hoursSavedMonth,
      costSavedKES: (paperSavingsKES + revenueProtectedKES).toLocaleString(),
      efficiencyGain: '84%'
    };
  }, [clientCount, manualHoursPerWeek]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const details = await apiService.fetchCompanySettings();
        setCompanyDetails(details);
      } catch (err) {
        console.error("Landing Page: Failed to load company details", err);
      }
    };
    loadData();
  }, []);

  const activeVerticalData = useMemo(() => {
    return INDUSTRY_VERTICALS.find(v => v.id === selectedVertical) || INDUSTRY_VERTICALS[0];
  }, [selectedVertical]);

  const liveStampConfig: OfficialStampConfig = useMemo(() => ({
    mode: 'system_generated',
    shape: stampShape,
    institutionName: `★ ${stampName.trim()} ★`,
    addressLine: `★ ${stampAddress.trim()} ★`,
    contactPhone: 'TEL: +254 700 000 000',
    department: stampDept,
    inkColor: stampInk,
    daterColor: '#DC2626',
    dateFormat: 'DD MMM YYYY',
    showSignatureLine: true,
    signatureLabel: 'Sign:...................',
    showStars: true,
    showDate: true,
    rotationAngle: -3
  }), [stampShape, stampName, stampAddress, stampDept, stampInk]);

  const handleDownloadDemoStamp = async () => {
    setIsGeneratingStamp(true);
    try {
      const dataUri = await generateStampDataUri(liveStampConfig, stampDate);
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = `${stampName.replace(/\s+/g, '_')}_Official_Stamp.png`;
      link.click();
      setToastMessage('✓ Official Stamp PNG Downloaded (High Res 560px)!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      alert('Failed to generate stamp image');
    } finally {
      setIsGeneratingStamp(false);
    }
  };

  const handleRunMpesaSimulation = () => {
    setMpesaSimState('pushing');
    setTimeout(() => {
      setSimulatedReceiptRef(`RC-${Math.floor(100000 + Math.random() * 900000)}`);
      setMpesaSimState('cleared');
      setToastMessage('⚡ M-Pesa Webhook Reconciled! Receipt Stamped.');
      setTimeout(() => setToastMessage(null), 4000);
    }, 2000);
  };

  const platformModules = useMemo(() => {
    return MODULES.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      imageUrl: (m as any).imageUrl,
      advantages: m.advantages || [],
      role: m.role,
      onLaunch: () => onLaunchSimulator?.(m.role, m.id)
    }));
  }, [onLaunchSimulator]);

  const filteredPlatformModules = useMemo(() => {
    if (!searchQuery.trim()) return platformModules;
    const q = searchQuery.toLowerCase();
    return platformModules.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q)
    );
  }, [platformModules, searchQuery]);

  return (
    <div className="marketing-container min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background Glowing Meshes */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-indigo-600/15 blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/10 blur-[150px] animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute top-[40%] right-[20%] w-[40vw] h-[40vw] rounded-full bg-purple-600/10 blur-[130px]"></div>
      </div>

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[99999] bg-slate-900/90 border border-emerald-500/40 backdrop-blur-xl px-5 py-3 rounded-2xl text-emerald-400 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER / NAVIGATION ── */}
      <header className="relative z-50 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">{companyDetails?.name || 'EduAI'}</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  Automation OS
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-400">Enterprise Multi-Industry Platform</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <a href="#verticals" className="hover:text-white transition-colors">Industry Verticals</a>
            <a href="#playground" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Live Sandbox
            </a>
            <a href="#banking" className="hover:text-white transition-colors">Banking & M-Pesa</a>
            <a href="#calculator" className="hover:text-white transition-colors">ROI Calculator</a>
            <a href="#modules" className="hover:text-white transition-colors">All Modules</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/?view=speechbuddy"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-300 font-black text-xs hover:scale-105 transition-all"
            >
              <span>🗣️</span>
              <span>SpeechBuddy AI</span>
            </a>

            <button
              onClick={onLogin}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-105"
            >
              {companyDetails?.showcaseConfig?.showLoginLink ? 'Sign In / Portal' : 'Access System'}
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative z-10 pt-20 pb-28 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/60 text-slate-300 text-xs font-bold mb-8 shadow-xl backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-emerald-400 font-black uppercase text-[10px] tracking-wider">Live & Ready</span>
          <span className="text-slate-500">|</span>
          <span>Kenyan Banking Rails & Dynamic Official Stamps Engine</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.08]">
          The Autonomous <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Operating System</span> for Modern Institutions.
        </h1>

        <p className="mt-8 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed">
          Unify academic scheduling, hospital EHR, cloud retail POS, property rent reconciliation, and SACCO member payroll into a single, seamless automation ecosystem.
        </p>

        <div className="mt-10 flex flex-wrap justify-center items-center gap-4">
          <a
            href="#playground"
            className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/40 flex items-center gap-3 transition-all cursor-pointer hover:scale-105"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Test Drive Live Sandbox</span>
          </a>

          <button
            onClick={onBookDemo}
            className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-black text-sm uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 hover:border-slate-500"
          >
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Book Custom Enterprise Demo</span>
          </button>
        </div>

        {/* Live Simulation Pulse Stream */}
        <div className="mt-16 max-w-4xl mx-auto p-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between px-3 pb-3 border-b border-slate-800 text-[11px] font-bold text-slate-400">
            <span className="flex items-center gap-2 text-indigo-400">
              <Radio className="w-4 h-4 text-indigo-400 animate-pulse" /> Live Real-Time Automation Event Stream
            </span>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
              System Active • 0.04s latency
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-left">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase text-indigo-400">1. Payment Rails</span>
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-white">M-Pesa STK Push KES 15,000</p>
              <p className="text-[10px] text-slate-400">Daraja 2.0 Webhook C2B Instant</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase text-purple-400">2. Document Engine</span>
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-white">Circular Dater Stamp Generated</p>
              <p className="text-[10px] text-slate-400">Votehead apportioned & archived</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase text-emerald-400">3. Multi-Channel Alert</span>
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-white">Transactional SMS & Portal Sync</p>
              <p className="text-[10px] text-slate-400">Delivered to parent phone in 1.2s</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: INDUSTRY VERTICAL SOLUTIONS ── */}
      <section id="verticals" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="text-center mb-16">
          <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 px-3.5 py-1 rounded-full bg-indigo-950/50 border border-indigo-800/40">
            Tailored Industry Suites
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mt-4">
            Engineered for Your Specific Industry
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3 font-medium">
            Select your organization type to see the dedicated modules, hardware interfaces, and banking workflows pre-configured for your operations.
          </p>
        </div>

        {/* Industry Pill Tabs */}
        <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
          {INDUSTRY_VERTICALS.map(vert => {
            const IconComp = vert.icon;
            const isSelected = selectedVertical === vert.id;
            return (
              <button
                key={vert.id}
                onClick={() => setSelectedVertical(vert.id)}
                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 scale-105 border border-indigo-400/40'
                    : 'bg-slate-900/80 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <IconComp className={`w-4 h-4 ${isSelected ? 'text-white' : vert.color}`} />
                <span>{vert.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Industry Showcase Card */}
        <div className="mt-10 p-8 sm:p-12 rounded-[2.5rem] bg-slate-900/70 border border-slate-800 backdrop-blur-2xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                {activeVerticalData.badge}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {activeVerticalData.targetUsers.join(' • ')}
              </span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {activeVerticalData.tagline}
            </h3>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal">
              {activeVerticalData.description}
            </p>

            <div className="pt-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                Core Automation Capabilities:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeVerticalData.keyAutomations.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs font-bold text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onLaunchSimulator?.(activeVerticalData.role, activeVerticalData.modId)}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Launch Live {activeVerticalData.name} Portal Simulator</span>
              </button>

              <button
                onClick={() => setActiveModalVertical(activeVerticalData)}
                className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider border border-slate-700 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>Deep-Dive Specifications</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4 shadow-inner">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Automated Transaction Cycle
              </h4>

              <div className="space-y-3">
                {activeVerticalData.sampleWorkflow.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-900 border border-slate-800/80">
                    <p className="text-xs font-black text-white">{step.step}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {activeVerticalData.metrics.map((m, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                  <p className="text-lg sm:text-xl font-black text-emerald-400">{m.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: LIVE INTERACTIVE AUTOMATION PLAYGROUND SANDBOX ── */}
      <section id="playground" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="text-center mb-16">
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 px-3.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/40">
            Interactive Test Drive
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mt-4">
            Live Automation Sandbox
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3 font-medium">
            Test real automated engines right in your browser. Customize an official Kenyan rubber stamp or simulate an instant M-Pesa fee receipt webhook.
          </p>
        </div>

        {/* Playground Sub-Tabs */}
        <div className="flex justify-center gap-3 mb-10">
          {[
            { id: 'stamp', label: '⭕ Kenyan Official Stamp & Dater Generator', icon: Palette },
            { id: 'mpesa', label: '💳 M-Pesa STK & Instant Receipt Simulator', icon: CreditCard },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPlaygroundTab(tab.id as any)}
              className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                playgroundTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── PLAYGROUND 1: LIVE STAMP GENERATOR ── */}
        {playgroundTab === 'stamp' && (
          <div className="p-8 sm:p-12 rounded-[2.5rem] bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in">
            <div className="lg:col-span-6 space-y-5">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-400" />
                  Customize Official Institutional Rubber Stamp
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Generates vector SVGs and ultra-high-resolution PNGs (560px) with automatic transaction date stamping.
                </p>
              </div>

              {/* Shape Switcher */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Stamp Shape Template
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStampShape('circle')}
                    className={`p-3 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer ${
                      stampShape === 'circle' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <span>⭕ Circular Stamp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStampShape('oval')}
                    className={`p-3 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer ${
                      stampShape === 'oval' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <span>⬭ Oval Stamp</span>
                  </button>
                </div>
              </div>

              {/* Text Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Institution / Business Name
                  </label>
                  <input
                    type="text"
                    value={stampName}
                    onChange={e => setStampName(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white uppercase outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Postal Address / Town
                    </label>
                    <input
                      type="text"
                      value={stampAddress}
                      onChange={e => setStampAddress(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white uppercase outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Department Line
                    </label>
                    <input
                      type="text"
                      value={stampDept}
                      onChange={e => setStampDept(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white uppercase outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Ink Colors & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Stamp Ink Color
                    </label>
                    <div className="flex gap-2">
                      {['#0047AB', '#1E3A8A', '#4C1D95', '#14532D', '#991B1B'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setStampInk(c)}
                          className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${stampInk === c ? 'scale-125 ring-2 ring-white' : 'opacity-70'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Test Transaction Date
                    </label>
                    <input
                      type="date"
                      value={stampDate}
                      onChange={e => setStampDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Stamp Stage */}
            <div className="lg:col-span-6 bg-slate-950 rounded-3xl p-8 border border-slate-800 flex flex-col justify-between items-center shadow-inner">
              <div className="w-full flex justify-between items-center pb-3 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>Real-Time Vector Render</span>
                <span className="text-emerald-400">Exact Document Quality</span>
              </div>

              <div className="my-6 flex items-center justify-center p-6 bg-white rounded-2xl shadow-2xl border border-slate-200">
                <KenyanOfficialStamp
                  config={liveStampConfig}
                  date={stampDate}
                  size={stampShape === 'oval' ? 180 : 210}
                />
              </div>

              <div className="w-full flex justify-between items-center pt-3 border-t border-slate-800">
                <p className="text-[11px] text-slate-400 font-medium">
                  ⚡ Auto-stamps every receipt, fee voucher & LPO
                </p>
                <button
                  type="button"
                  onClick={handleDownloadDemoStamp}
                  disabled={isGeneratingStamp}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Stamp (PNG)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PLAYGROUND 2: LIVE M-PESA STK & RECEIPT SIMULATOR ── */}
        {playgroundTab === 'mpesa' && (
          <div className="p-8 sm:p-12 rounded-[2.5rem] bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in">
            <div className="lg:col-span-6 space-y-5">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  M-Pesa STK Push & Auto-Reconciliation Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Trigger an automated payment webhook to see instant ledger clearance and digital stamped receipt generation.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Payer / Student Name
                  </label>
                  <input
                    type="text"
                    value={mpesaPayer}
                    onChange={e => setMpesaPayer(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      M-Pesa Phone Number
                    </label>
                    <input
                      type="text"
                      value={mpesaPhone}
                      onChange={e => setMpesaPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Amount (KES)
                    </label>
                    <input
                      type="number"
                      value={mpesaAmount}
                      onChange={e => setMpesaAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunMpesaSimulation}
                  disabled={mpesaSimState === 'pushing'}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  {mpesaSimState === 'pushing' ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Simulating STK Push & Webhook Verification...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Simulate Instant M-Pesa STK Payment</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Receipt Preview */}
            <div className="lg:col-span-6 bg-slate-950 rounded-3xl p-8 border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400">
                <span>Automated Receipt Output</span>
                <span className={mpesaSimState === 'cleared' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {mpesaSimState === 'cleared' ? '✓ Reconciled & Stamped' : 'Pending Trigger'}
                </span>
              </div>

              <div className="my-4 p-6 bg-white rounded-2xl text-slate-900 border border-slate-200 shadow-xl space-y-3 font-sans">
                <div className="flex justify-between items-center border-b pb-2 border-slate-200">
                  <div>
                    <p className="font-black text-xs uppercase tracking-tight">OFFICIAL DIGITAL RECEIPT</p>
                    <p className="text-[10px] text-slate-500 font-mono">REF #{simulatedReceiptRef}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    PAID / M-PESA
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p><span className="text-slate-400 font-bold">Payer:</span> {mpesaPayer}</p>
                  <p><span className="text-slate-400 font-bold">Phone:</span> {mpesaPhone}</p>
                  <p><span className="text-slate-400 font-bold">Amount Paid:</span> <strong className="text-emerald-600 font-black">KES {parseInt(mpesaAmount || '0').toLocaleString()}.00</strong></p>
                  <p><span className="text-slate-400 font-bold">Payment Date:</span> {formatStampDate(new Date(), 'DD MMM YYYY')}</p>
                </div>

                {/* Embedded Stamp */}
                <div className="pt-2 flex justify-end">
                  <KenyanOfficialStamp
                    config={{
                      mode: 'system_generated',
                      shape: 'circle',
                      institutionName: '★ EDUAI AUTOMATION ★',
                      addressLine: '★ P.O. BOX 100, NAIROBI ★',
                      inkColor: '#0047AB',
                      daterColor: '#DC2626',
                      dateFormat: 'DD MMM YYYY',
                      showSignatureLine: true,
                      signatureLabel: 'Sign:...................',
                      showDate: true
                    }}
                    date={new Date()}
                    size={110}
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                Instant PDF download & SMS confirmation dispatched to payer automatically.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 3: KENYAN BANKING RAILS & HARDWARE IOT ── */}
      <section id="banking" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Banking Integrations */}
          <div className="p-8 sm:p-10 rounded-[2.5rem] bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/40">
              Native Banking Rails
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Direct Integration with Major Kenyan Financial Gateways
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              No manual bank reconciliations. All transactions auto-match against student, tenant, patient, or customer ledgers within 2 seconds of receipt.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {[
                { name: 'Safaricom Daraja 2.0', desc: 'STK Push & C2B Paybill' },
                { name: 'KCB Bank API', desc: 'Host-to-Host Feeds' },
                { name: 'Co-op Bank', desc: 'SACCO Direct Connect' },
                { name: 'NCBA Fee Pay', desc: 'Instant Clearance' },
                { name: 'Equity Bank', desc: 'Statement Parser' },
                { name: 'Transactional SMS', desc: 'Advanta & Africa\'s Talking' },
              ].map((b, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <p className="text-xs font-black text-white">{b.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hardware & IoT Ecosystem */}
          <div className="p-8 sm:p-10 rounded-[2.5rem] bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40">
              Hardware & Smart IoT
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Seamless Plug-and-Play Hardware Connectivity
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Connect biometric attendance fingerprint readers, RFID student gate passes, 80mm ESC/POS thermal receipt printers, and barcode scanners without third-party drivers.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {[
                { name: 'Biometric Readers', desc: 'ZKTeco & Digital Persona' },
                { name: 'RFID Gate Turnstiles', desc: 'Real-time SMS Entry Alerts' },
                { name: 'ESC/POS Printers', desc: 'Bluetooth & USB Thermal' },
                { name: '1D/2D Scanners', desc: 'QR & Barcode Lookup' },
                { name: 'Smart IoT Meters', desc: 'Water & Electricity Flow' },
                { name: 'Digital Weigh Scales', desc: 'RS232 Produce Intake' },
              ].map((h, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <p className="text-xs font-black text-white">{h.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: INTERACTIVE ROI CALCULATOR ── */}
      <section id="calculator" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="p-8 sm:p-14 rounded-[3rem] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-indigo-500/20 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/40 flex items-center gap-1.5 w-fit">
              <Calculator className="w-3.5 h-3.5" />
              Interactive Impact Calculator
            </span>
            <h3 className="text-3xl sm:text-4xl font-black text-white">
              Calculate Your Institutional Savings
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm">
              Adjust the sliders below to estimate the monthly hours and administrative costs your institution will save with EduAI OS.
            </p>

            <div className="space-y-6 pt-2">
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-slate-300">Number of Students / Tenants / Clients:</span>
                  <span className="text-indigo-400 font-mono font-black text-base">{clientCount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="3000"
                  step="50"
                  value={clientCount}
                  onChange={e => setClientCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-slate-300">Hours Spent on Manual Admin Weekly (Receipting/Grading/Scheduling):</span>
                  <span className="text-indigo-400 font-mono font-black text-base">{manualHoursPerWeek} Hours / Week</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={manualHoursPerWeek}
                  onChange={e => setManualHoursPerWeek(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-8 rounded-3xl bg-slate-950/80 border border-slate-800 text-center space-y-6 shadow-2xl">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estimated Monthly Time Saved</p>
              <p className="text-4xl sm:text-5xl font-black text-emerald-400 mt-1">~{calculatedRoi.hoursSaved} Hours</p>
              <p className="text-xs text-slate-400 mt-1">Over 3 weeks of staff time recovered each month</p>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direct Financial Savings & Revenue Protected</p>
              <p className="text-3xl sm:text-4xl font-black text-indigo-400 mt-1">KES {calculatedRoi.costSavedKES}</p>
              <p className="text-[11px] text-slate-400 mt-1">Reduced bad debts, paper receipts & duplicate labor</p>
            </div>

            <button
              onClick={onBookDemo}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Claim Your Institutional Setup
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: ALL PLATFORM MODULES GRID & SEARCH ── */}
      <section id="modules" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="text-center mb-12">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            Comprehensive Module Directory
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mt-4">
            Explore All 20+ Enterprise Modules
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mt-2">
            Every module is modular, interoperable, and ready to deploy in minutes.
          </p>

          <div className="max-w-md mx-auto mt-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by keyword (e.g. 'exam', 'pos', 'hospital', 'rent')..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-indigo-500 shadow-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlatformModules.map(m => (
            <div
              key={m.id}
              className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-1 space-y-4 flex flex-col justify-between group"
            >
              <div>
                {m.imageUrl && (
                  <div className="h-40 w-full rounded-2xl overflow-hidden mb-4 bg-slate-950 border border-slate-800/60">
                    <img
                      src={m.imageUrl}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <h4 className="text-base font-black text-white uppercase">{m.title}</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">{m.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onRegister?.(m.id)}
                  className="text-[11px] font-black uppercase text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Deploy Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={m.onLaunch}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase cursor-pointer"
                >
                  Simulator
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 6: FOOTER & ENTERPRISE CONTACT ── */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                ⚡
              </div>
              <span className="text-lg font-black text-white">{companyDetails?.name || 'EduAI'} Automation OS</span>
            </div>
            <p className="text-xs text-slate-400 max-w-md font-medium">
              Enterprise-grade autonomous operating system designed for educational institutions, healthcare facilities, commercial retail, property agencies, and agribusiness cooperatives across Kenya and East Africa.
            </p>
            <p className="text-[11px] text-slate-500 font-mono pt-2">
              © {new Date().getFullYear()} {companyDetails?.name || 'EduAI'}. All Rights Reserved.
            </p>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3">Enterprise Verticals</p>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li><a href="#verticals" onClick={() => setSelectedVertical('education')} className="hover:text-indigo-400">Academic & Schools</a></li>
              <li><a href="#verticals" onClick={() => setSelectedVertical('healthcare')} className="hover:text-emerald-400">Hospital & Clinics (HIS)</a></li>
              <li><a href="#verticals" onClick={() => setSelectedVertical('retail')} className="hover:text-amber-400">Retail & Supermarket POS</a></li>
              <li><a href="#verticals" onClick={() => setSelectedVertical('property')} className="hover:text-blue-400">Real Estate & Rentals</a></li>
              <li><a href="#verticals" onClick={() => setSelectedVertical('coop')} className="hover:text-teal-400">SACCOs & Cooperatives</a></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3">Enterprise Access</p>
            <div className="space-y-2.5">
              <button
                onClick={onLogin}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Sign In to Portal
              </button>
              <button
                onClick={onBookDemo}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Schedule Consultation
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ── VERTICAL DEEP-DIVE MODAL ── */}
      {activeModalVertical && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-[2.5rem] max-w-3xl w-full border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black">
                  <activeModalVertical.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase">{activeModalVertical.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">{activeModalVertical.badge}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalVertical(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 mb-2">Detailed Architecture</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">{activeModalVertical.description}</p>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Hardware & IoT Ecosystem</h4>
                <div className="grid grid-cols-2 gap-2">
                  {activeModalVertical.hardwareIoT.map((h, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Direct Banking Rails</h4>
                <div className="grid grid-cols-2 gap-2">
                  {activeModalVertical.bankingIntegrations.map((b, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-bold flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => setActiveModalVertical(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-black uppercase cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActiveModalVertical(null);
                  onLaunchSimulator?.(activeModalVertical.role, activeModalVertical.modId);
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Launch Simulator Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded AI Sales Chat Assistant */}
      <AiSalesAgentWidget />
    </div>
  );
};
