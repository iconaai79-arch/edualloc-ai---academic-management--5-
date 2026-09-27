import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { Institution, User } from '../../types';
import { KenyanOfficialStamp } from '../common/KenyanOfficialStamp';

// ─── 36 Standard Ministry of Education (MOE) / Kenyan School Tender Categories ──
export interface TenderCategory {
    categoryNo: string;
    tenderNo: string;
    title: string;
    eligibility: 'Open' | 'Women' | 'Youth' | 'PWD';
    voteHead: 'B.E.S (Boarding)' | 'Tuition' | 'R.M.I' | 'Operations' | 'Administration' | 'L.T.&T' | 'Activity' | 'Development';
    description: string;
    standardFee: number;
}

export const KENYAN_MOE_TENDER_CATEGORIES: TenderCategory[] = [
    { categoryNo: '01', tenderNo: 'KHS/01/2026/2027', title: 'Supply & Delivery of Meat and Meat Products', eligibility: 'Open', voteHead: 'B.E.S (Boarding)', description: 'Fresh beef, goat meat, minced meat and allied products with public health inspection certificates', standardFee: 1000 },
    { categoryNo: '02', tenderNo: 'KHS/02/2026/2027', title: 'Supply & Delivery of Fresh Fruits', eligibility: 'Women', voteHead: 'B.E.S (Boarding)', description: 'Oranges, bananas, watermelons, ripe mangoes, pineapples (Reserved for AGPO - Women)', standardFee: 1000 },
    { categoryNo: '03', tenderNo: 'KHS/03/2026/2027', title: 'Supply & Delivery of Fresh Milk', eligibility: 'Open', voteHead: 'B.E.S (Boarding)', description: 'Pasteurized / fresh cow milk in food-grade containers meeting KEBS standards', standardFee: 1000 },
    { categoryNo: '04', tenderNo: 'KHS/04/2026/2027', title: 'Supply & Delivery of Fresh Vegetables', eligibility: 'Women', voteHead: 'B.E.S (Boarding)', description: 'Kales (Sukuma Wiki), cabbages, spinach, carrots, onions, tomatoes (Reserved for AGPO - Women)', standardFee: 1000 },
    { categoryNo: '05', tenderNo: 'KHS/05/2026/2027', title: 'Supply & Delivery of Bread and Buns', eligibility: 'Open', voteHead: 'B.E.S (Boarding)', description: '400g/800g sliced white/brown enriched bread, scones and buns with KEBS mark', standardFee: 1000 },
    { categoryNo: '06', tenderNo: 'KHS/06/2026/2027', title: 'Supply & Delivery of Eggs and Poultry', eligibility: 'Open', voteHead: 'B.E.S (Boarding)', description: 'Farm fresh chicken eggs (grades 1 & 2) and dressed broiler/kienyeji chicken', standardFee: 1000 },
    { categoryNo: '07', tenderNo: 'KHS/07/2026/2027', title: 'Supply & Delivery of Firewood & Cooking Fuel', eligibility: 'Open', voteHead: 'B.E.S (Boarding)', description: 'Well-seasoned dry split firewood (tons) and certified charcoal from sustainable forestry sources', standardFee: 1000 },
    { categoryNo: '08', tenderNo: 'KHS/08/2026/2027', title: 'Supply & Delivery of Lab Chemicals & Science Apparatus', eligibility: 'Open', voteHead: 'Tuition', description: 'Analytical grade chemicals, physics/chemistry/biology glassware, microscopes and KNEC exam materials', standardFee: 1000 },
    { categoryNo: '09', tenderNo: 'KHS/09/2026/2027', title: 'Supply & Delivery of Building & Construction Materials', eligibility: 'Open', voteHead: 'R.M.I', description: 'Cement (32.5/42.5), sand, ballast, quarry stones, timber, BRC mesh, iron sheets', standardFee: 1000 },
    { categoryNo: '10', tenderNo: 'KHS/10/2026/2027', title: 'Supply of Cleaning Materials, Detergents & Disinfectants', eligibility: 'PWD', voteHead: 'Operations', description: 'Liquid soaps, bar soaps, scouring powders, disinfectants, mops, brooms, sanitizers (Reserved for AGPO - PWD)', standardFee: 1000 },
    { categoryNo: '11', tenderNo: 'KHS/11/2026/2027', title: 'Supply & Delivery of Dry Cereals, Maize, Beans & Rice', eligibility: 'Open', voteHead: 'B.E.S (Boarding)', description: 'Grade 1 dry white maize, rose coco/yellow beans, pishori & white rice, green grams', standardFee: 1000 },
    { categoryNo: '12', tenderNo: 'KHS/12/2026/2027', title: 'Supply of General Dry Foodstuffs & Cooking Oil', eligibility: 'Open', voteHead: 'B.E.S (Boarding)', description: 'Refined vegetable cooking oil, white/brown sugar, iodized salt, tea leaves, baking flour', standardFee: 1000 },
    { categoryNo: '13', tenderNo: 'KHS/13/2026/2027', title: 'Supply & Delivery of Animal Feeds & Veterinary Supplies', eligibility: 'Open', voteHead: 'B.E.S (Boarding)', description: 'Dairy meal, layers mash, calf starter, mineral blocks, vaccines and veterinary medicines', standardFee: 1000 },
    { categoryNo: '14', tenderNo: 'KHS/14/2026/2027', title: 'Supply & Delivery of Electrical Materials and Fittings', eligibility: 'Open', voteHead: 'R.M.I', description: 'LED tubes, cables, switches, circuit breakers, flood lights, conduits and accessories', standardFee: 1000 },
    { categoryNo: '15', tenderNo: 'KHS/15/2026/2027', title: 'Supply of School Uniforms, Mattresses & Beddings', eligibility: 'Open', voteHead: 'B.E.S (Boarding)', description: 'Sweaters, trousers, skirts, ties, high-density mattresses (3x6x4), bed sheets, bedcovers', standardFee: 1000 },
    { categoryNo: '16', tenderNo: 'KHS/16/2026/2027', title: 'Supply & Delivery of Textbooks & Library Materials', eligibility: 'Open', voteHead: 'Tuition', description: 'KICD-approved secondary textbooks (Grades 9-12 / Form 1-4), dictionaries, atlases, curriculum set books', standardFee: 1000 },
    { categoryNo: '17', tenderNo: 'KHS/17/2026/2027', title: 'Supply & Delivery of Hardware, Plumbing & Water Piping', eligibility: 'Open', voteHead: 'R.M.I', description: 'PPR/GI/PVC pipes, water fittings, taps, valves, water storage tanks, roofing nails', standardFee: 1000 },
    { categoryNo: '18', tenderNo: 'KHS/18/2026/2027', title: 'Supply & Delivery of Vehicle Tyres, Tubes & Batteries', eligibility: 'Open', voteHead: 'L.T.&T', description: 'Tubeless tyres for school buses, vans, tractors, heavy-duty maintenance-free batteries', standardFee: 1000 },
    { categoryNo: '19', tenderNo: 'KHS/19/2026/2027', title: 'Supply & Delivery of Petroleum Fuels (Diesel, Petrol) & LPG', eligibility: 'Open', voteHead: 'L.T.&T', description: 'Bulk diesel for school buses, petrol, automotive lubricants and bulk LPG cooking gas (EPRA compliant)', standardFee: 1000 },
    { categoryNo: '20', tenderNo: 'KHS/20/2026/2027', title: 'Supply & Delivery of Office & Exam Stationery, Printing Papers', eligibility: 'Open', voteHead: 'Administration', description: 'A4 printing papers (80gsm), examination foolscaps, toners, marker pens, exercise books, files', standardFee: 1000 },
    { categoryNo: '21', tenderNo: 'KHS/21/2026/2027', title: 'Provision of Comprehensive Insurance Brokerage Services', eligibility: 'Open', voteHead: 'Administration', description: 'School bus insurance (comprehensive PSV), fire & perils, student group personal accident, WIBA', standardFee: 1000 },
    { categoryNo: '22', tenderNo: 'KHS/22/2026/2027', title: 'Provision of Security Guarding & Surveillance Services', eligibility: 'Open', voteHead: 'Administration', description: '24/7 uniformed licensed security personnel (PSRA compliant), alarm response, perimeter security', standardFee: 1000 },
    { categoryNo: '23', tenderNo: 'KHS/23/2026/2027', title: 'Provision of ICT Equipment, CCTV, Printers & Networking', eligibility: 'Youth', voteHead: 'Administration', description: 'Desktop computers, laptops, interactive boards, CCTV IP cameras, structured cabling, Wi-Fi (Reserved for AGPO - Youth)', standardFee: 1000 },
    { categoryNo: '24', tenderNo: 'KHS/24/2026/2027', title: 'Provision of Sanitary, Fumigation & Pest Control Services', eligibility: 'Youth', voteHead: 'Operations', description: 'Dormitory and classroom fumigation, bed bug & termite eradication, sanitary bins servicing (Reserved for AGPO - Youth)', standardFee: 1000 },
    { categoryNo: '25', tenderNo: 'KHS/25/2026/2027', title: 'Provision of Sewage Exhauster & Bio-digester Maintenance', eligibility: 'Open', voteHead: 'Operations', description: 'Vacuum tanker sewage emptying, septic tank treatment and bio-digester enzyme dosing', standardFee: 1000 },
    { categoryNo: '26', tenderNo: 'KHS/26/2026/2027', title: 'Repair, Welding & Fabrication of Furniture and Buildings', eligibility: 'Open', voteHead: 'R.M.I', description: 'Repairs of double-decker beds, student lockers, dining hall benches, steel gates and burglar proofs', standardFee: 1000 },
    { categoryNo: '27', tenderNo: 'KHS/27/2026/2027', title: 'Supply & Delivery of Sports Equipment, Kits & Trophies', eligibility: 'Open', voteHead: 'Activity', description: 'Football, rugby, basketball, volleyball balls, tracksuits, nets, referee gear and presentation trophies', standardFee: 1000 },
    { categoryNo: '28', tenderNo: 'KHS/28/2026/2027', title: 'Provision of Architectural, Quantity Surveying & Civil Works', eligibility: 'Open', voteHead: 'Development', description: 'BORAQS certified structural consultancy, architectural drawings, BQs and supervision of capital projects', standardFee: 1000 },
    { categoryNo: '29', tenderNo: 'KHS/29/2026/2027', title: 'Provision of Legal Advisory and Retainer Services', eligibility: 'Open', voteHead: 'Administration', description: 'LSK certified legal services, drafting contracts, court representation, land title verifications', standardFee: 1000 },
    { categoryNo: '30', tenderNo: 'KHS/30/2026/2027', title: 'Provision of Fixed Asset Tagging, Barcoding & Valuation', eligibility: 'Open', voteHead: 'Administration', description: 'Aluminum barcode asset tagging, verification and preparation of comprehensive school asset register', standardFee: 1000 },
    { categoryNo: '31', tenderNo: 'KHS/31/2026/2027', title: 'Servicing & Refilling of Fire Fighting Equipment', eligibility: 'Open', voteHead: 'Administration', description: 'Annual hydrostatic testing, servicing and refilling of CO2, water, foam and powder fire extinguishers', standardFee: 1000 },
    { categoryNo: '32', tenderNo: 'KHS/32/2026/2027', title: 'Provision of Catering, Hospitality & Event Services', eligibility: 'Open', voteHead: 'Operations', description: 'Outside catering for AGM, Prize Giving Day, Board meetings, Education Days, special functions', standardFee: 1000 },
    { categoryNo: '33', tenderNo: 'KHS/33/2026/2027', title: 'Provision of Air Ticketing, Travel & Staff Accommodation', eligibility: 'Open', voteHead: 'Administration', description: 'IATA accredited travel agency for official school staff and student academic trips', standardFee: 1000 },
    { categoryNo: '34', tenderNo: 'KHS/34/2026/2027', title: 'Provision of Staff Occupational Health & Wellness Services', eligibility: 'Open', voteHead: 'Administration', description: 'First aid training, DOSH compliance inspections, occupational medical examinations for school food handlers', standardFee: 1000 },
    { categoryNo: '35', tenderNo: 'KHS/35/2026/2027', title: 'Provision of Tents, Public Address Systems & Chairs Hire', eligibility: 'Women', voteHead: 'Activity', description: 'High-peak dome tents, PA sound systems, plastic chairs and stage decoration for school events (Reserved for AGPO - Women)', standardFee: 1000 },
    { categoryNo: '36', tenderNo: 'KHS/36/2026/2027', title: 'Repair, Servicing & Mechanical Overhaul of School Fleet', eligibility: 'Open', voteHead: 'L.T.&T', description: 'Preventative and corrective mechanical/electrical maintenance of school buses, vans and tractors', standardFee: 1000 },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProcurementItem {
    id?: string;
    institutionId?: string;
    institution_id?: string;
    name: string;
    category: string;
    unit: string;
    unitCost?: number;
    unit_cost?: number;
    reorderLevel?: number;
    reorder_level?: number;
    currentStock?: number;
    current_stock?: number;
    description?: string;
    itemCode?: string;
    item_code?: string;
    isActive?: boolean;
}

interface ProcurementSupplier {
    id?: string;
    institutionId?: string;
    institution_id?: string;
    name: string;
    contactPerson?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    kraPin?: string;
    kra_pin?: string;
    paymentTerms?: string;
    payment_terms?: string;
    bankName?: string;
    bank_name?: string;
    bankAccount?: string;
    bank_account?: string;
    bankBranch?: string;
    bank_branch?: string;
    rating?: number;
    category?: string;
    outstandingBalance?: number;
    outstanding_balance?: number;
    totalPurchases?: number;
    total_purchases?: number;
    notes?: string;
    // Kenyan Tender & AGPO fields
    tenderRef?: string;
    tender_ref?: string;
    tenderCategoryNo?: string;
    tender_category_no?: string;
    isAgpo?: boolean;
    is_agpo?: boolean;
    agpoCategory?: 'none' | 'women' | 'youth' | 'pwd';
    agpo_category?: string;
    agpoCertNumber?: string;
    agpo_cert_number?: string;
    taxComplianceCert?: string;
    tax_compliance_cert?: string;
    businessPermitNo?: string;
    business_permit_no?: string;
    ncaRegNo?: string;
    nca_reg_no?: string;
    creditPeriodDays?: number;
    credit_period_days?: number;
    annualTurnover?: number;
    annual_turnover?: number;
    tenderFeePaid?: boolean;
    tender_fee_paid?: boolean;
    tenderFeeReceiptNo?: string;
    tender_fee_receipt_no?: string;
    prequalificationScore?: number;
    prequalification_score?: number;
    prequalificationStatus?: 'pending' | 'prequalified' | 'disqualified';
    prequalification_status?: string;
}

interface LPOItem {
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    total: number;
}

interface ProcurementLPO {
    id?: string;
    institutionId?: string;
    institution_id?: string;
    lpoNumber?: string;
    lpo_number?: string;
    supplierId?: string;
    supplier_id?: string;
    supplierName?: string;
    requisitionId?: string;
    requisition_id?: string;
    voteHead?: string;
    vote_head?: string;
    tenderCategoryNo?: string;
    tender_category_no?: string;
    tenderRef?: string;
    tender_ref?: string;
    issuedDate?: string;
    issued_date?: string;
    expectedDeliveryDate?: string;
    expected_delivery_date?: string;
    deliveryAddress?: string;
    delivery_address?: string;
    items?: LPOItem[];
    subtotal?: number;
    taxAmount?: number;
    tax_amount?: number;
    totalAmount?: number;
    total_amount?: number;
    status?: string;
    notes?: string;
    approvedBy?: string;
    approved_by?: string;
    createdBy?: string;
    created_by?: string;
}

interface ProcurementInvoice {
    id?: string;
    institutionId?: string;
    institution_id?: string;
    lpoId?: string;
    lpo_id?: string;
    lpoNumber?: string;
    supplierId?: string;
    supplier_id?: string;
    supplierName?: string;
    invoiceNumber?: string;
    invoice_number?: string;
    invoiceDate?: string;
    invoice_date?: string;
    dueDate?: string;
    due_date?: string;
    voteHead?: string;
    vote_head?: string;
    items?: LPOItem[];
    amount?: number;
    taxAmount?: number;
    tax_amount?: number;
    totalAmount?: number;
    total_amount?: number;
    withholdingTaxRate?: number;
    withholding_tax_rate?: number;
    withholdingTaxAmount?: number;
    withholding_tax_amount?: number;
    withholdingVatAmount?: number;
    withholding_vat_amount?: number;
    netPayableAmount?: number;
    net_payable_amount?: number;
    amountPaid?: number;
    amount_paid?: number;
    balanceOwing?: number;
    balance_owing?: number;
    status?: string;
    paymentReference?: string;
    payment_reference?: string;
    paymentDate?: string;
    payment_date?: string;
    paymentMethod?: string;
    payment_method?: string;
    notes?: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProcurementHubProps {
    institution: Institution;
    currentUser?: User;
}

// ─── Sub-tab config ───────────────────────────────────────────────────────────

const TABS = [
    { id: 'tenders',      label: 'Tenders & Pre-qualification', emoji: '📜' },
    { id: 'inventory',    label: 'Items Inventory',             emoji: '📦' },
    { id: 'suppliers',    label: 'Supplier Registration',        emoji: '🏭' },
    { id: 'requisitions', label: 'Requisitions',               emoji: '📋' },
    { id: 'lpos',         label: 'LPO Management',               emoji: '📄' },
    { id: 'invoices',     label: 'Supplier Invoices',            emoji: '🧾' },
    { id: 'reports',      label: 'Reports & AGPO Compliance',    emoji: '📊' },
] as const;
type TabId = typeof TABS[number]['id'];

const STATUS_COLORS: Record<string, string> = {
    pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    approved:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    rejected:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    draft:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    issued:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    received:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    paid:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    partial:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    overdue:   'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

// ─── Main Component ───────────────────────────────────────────────────────────

export const ProcurementHub: React.FC<ProcurementHubProps> = ({ institution, currentUser }) => {
    const [activeTab, setActiveTab] = useState<TabId>('tenders');

    // ── Data state ──
    const [items, setItems] = useState<ProcurementItem[]>([]);
    const [schoolItems, setSchoolItems] = useState<any[]>([]); // retail_inventory_items
    const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
    const [lpos, setLpos] = useState<ProcurementLPO[]>([]);
    const [invoices, setInvoices] = useState<ProcurementInvoice[]>([]);
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [inventoryView, setInventoryView] = useState<'all' | 'procurement' | 'school'>('all');
    const [importingId, setImportingId] = useState<string | null>(null);

    // ── Modal state ──
    const [showItemModal, setShowItemModal] = useState(false);
    const [editItem, setEditItem] = useState<ProcurementItem | null>(null);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editSupplier, setEditSupplier] = useState<ProcurementSupplier | null>(null);
    const [showLPOModal, setShowLPOModal] = useState(false);
    const [editLPO, setEditLPO] = useState<ProcurementLPO | null>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [editInvoice, setEditInvoice] = useState<ProcurementInvoice | null>(null);
    const [showReqModal, setShowReqModal] = useState(false);

    // ── Kenyan Tenders & Stamps State ──
    const [tenderSearch, setTenderSearch] = useState('');
    const [tenderEligibilityFilter, setTenderEligibilityFilter] = useState<'all' | 'Open' | 'Women' | 'Youth' | 'PWD'>('all');
    const [tenderVoteHeadFilter, setTenderVoteHeadFilter] = useState<string>('all');
    const [selectedLpoForPrint, setSelectedLpoForPrint] = useState<ProcurementLPO | null>(null);
    
    // Tender Fee Receipt modal
    const [showTenderFeeModal, setShowTenderFeeModal] = useState(false);
    const [tenderFeeForm, setTenderFeeForm] = useState({
        bidderName: '',
        kraPin: '',
        phone: '',
        email: '',
        categoryNo: '01',
        tenderRef: `KHS/REG/001/2026/2027`,
        paymentMode: 'M-Pesa',
        referenceNo: '',
        amount: 1000,
    });
    const [tenderFeeReceiptPrint, setTenderFeeReceiptPrint] = useState<any | null>(null);

    // Pre-qualification Evaluation Modal
    const [showEvaluationModal, setShowEvaluationModal] = useState(false);
    const [evaluatingSupplier, setEvaluatingSupplier] = useState<ProcurementSupplier | null>(null);
    const [evaluationScores, setEvaluationScores] = useState({
        mandatoryPassed: true,
        premise: 10,       // Max 10
        experience: 25,    // Max 30
        financial: 18,     // Max 20
        creditPeriod: 18,  // Max 20
        litigation: 10,    // Max 10
        agpoSpecial: 10,   // Max 10
        notes: '',
    });

    // ── Search / filter ──
    const [itemSearch, setItemSearch] = useState('');
    const [supplierSearch, setSupplierSearch] = useState('');
    const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');
    const [supplierAgpoFilter, setSupplierAgpoFilter] = useState('all');
    const [lpoSearch, setLpoSearch] = useState('');
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [reqSearch, setReqSearch] = useState('');

    // ── Forms ──
    const emptyItem = (): ProcurementItem => ({ name: '', category: 'General', unit: 'pcs', unitCost: 0, reorderLevel: 5, currentStock: 0, description: '', itemCode: '' });
    const emptySupplier = (): ProcurementSupplier => ({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        kraPin: '',
        paymentTerms: 'Net 30',
        bankName: '',
        bankAccount: '',
        bankBranch: '',
        rating: 3,
        category: '01',
        notes: '',
        tenderRef: `KHS/REG/001/2026/2027`,
        tenderCategoryNo: '01',
        isAgpo: false,
        agpoCategory: 'none',
        agpoCertNumber: '',
        taxComplianceCert: '',
        businessPermitNo: '',
        ncaRegNo: '',
        creditPeriodDays: 30,
        annualTurnover: 0,
        tenderFeePaid: false,
        tenderFeeReceiptNo: '',
        prequalificationScore: 0,
        prequalificationStatus: 'pending'
    });
    const emptyLPO = (): ProcurementLPO => ({
        lpoNumber: `LPO-${Date.now()}`,
        supplierId: '',
        issuedDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        deliveryAddress: '',
        voteHead: 'B.E.S (Boarding)',
        tenderCategoryNo: '01',
        tenderRef: 'KHS/REG/001/2026/2027',
        items: [],
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        status: 'draft',
        notes: ''
    });
    const emptyInvoice = (): ProcurementInvoice => ({
        lpoId: '',
        supplierId: '',
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        voteHead: 'B.E.S (Boarding)',
        items: [],
        amount: 0,
        taxAmount: 0,
        totalAmount: 0,
        withholdingTaxRate: 0,
        withholdingTaxAmount: 0,
        withholdingVatAmount: 0,
        netPayableAmount: 0,
        amountPaid: 0,
        status: 'pending',
        paymentMethod: 'Bank Transfer',
        notes: ''
    });
    const emptyReq = () => ({ title: '', departmentId: '', priority: 'normal', items: [], notes: '', status: 'pending' });

    const [itemForm, setItemForm] = useState<ProcurementItem>(emptyItem());
    const [supplierForm, setSupplierForm] = useState<ProcurementSupplier>(emptySupplier());
    const [lpoForm, setLpoForm] = useState<ProcurementLPO>(emptyLPO());
    const [invoiceForm, setInvoiceForm] = useState<ProcurementInvoice>(emptyInvoice());
    const [reqForm, setReqForm] = useState<any>(emptyReq());

    // LPO line items
    const [lpoLineItem, setLpoLineItem] = useState<LPOItem>({ name: '', quantity: 1, unit: 'pcs', unitCost: 0, total: 0 });

    // ── Load data ──
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [its, sups, lps, invs, reqs, schItems] = await Promise.all([
                apiService.fetchModuleRecords<ProcurementItem>('procurement_items', institution.id).catch(() => []),
                apiService.fetchModuleRecords<ProcurementSupplier>('procurement_suppliers', institution.id).catch(() => []),
                apiService.fetchModuleRecords<ProcurementLPO>('procurement_lpos', institution.id).catch(() => []),
                apiService.fetchModuleRecords<ProcurementInvoice>('procurement_invoices', institution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('requisitions', institution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('retail_inventory_items', institution.id).catch(() => []),
            ]);
            setItems(its);
            setSuppliers(sups);
            setLpos(lps);
            setInvoices(invs);
            setRequisitions(reqs);
            setSchoolItems(schItems);
        } finally {
            setLoading(false);
        }
    }, [institution.id]);

    useEffect(() => { load(); }, [load]);

    // ── Helpers ──
    const supplierName = (id?: string) => suppliers.find(s => s.id === id)?.name || '—';
    const lpoNumber = (id?: string) => lpos.find(l => l.id === id)?.lpoNumber || lpos.find(l => l.id === id)?.lpo_number || '—';

    // ── Save handlers ──
    const handleOpenCreateLPO = async (req?: any) => {
        setEditLPO(null);
        let nextLPO = `LPO-${Date.now().toString().slice(-6)}`;
        try {
            nextLPO = await apiService.getNextDocumentNumber(institution.id, 'lpo');
        } catch (e) {
            console.error("Failed to generate LPO number:", e);
        }
        
        const base = emptyLPO();
        setLpoForm({
            ...base,
            lpoNumber: nextLPO,
            requisitionId: req?.id || base.requisitionId,
            items: req?.items || base.items || []
        });
        setShowLPOModal(true);
        if (req) setActiveTab('lpos');
    };

    const saveItem = async () => {
        await apiService.saveModuleRecord('procurement_items', { ...itemForm, institution_id: institution.id, institutionId: institution.id, unit_cost: itemForm.unitCost, reorder_level: itemForm.reorderLevel, current_stock: itemForm.currentStock, item_code: itemForm.itemCode, is_active: true });
        setShowItemModal(false); setEditItem(null); setItemForm(emptyItem()); load();
    };

    const saveSupplier = async () => {
        await apiService.saveModuleRecord('procurement_suppliers', {
            ...supplierForm,
            institution_id: institution.id,
            institutionId: institution.id,
            contact_person: supplierForm.contactPerson,
            kra_pin: supplierForm.kraPin,
            payment_terms: supplierForm.paymentTerms,
            bank_name: supplierForm.bankName,
            bank_account: supplierForm.bankAccount,
            bank_branch: supplierForm.bankBranch,
            tender_ref: supplierForm.tenderRef,
            tender_category_no: supplierForm.tenderCategoryNo,
            is_agpo: supplierForm.isAgpo,
            agpo_category: supplierForm.agpoCategory,
            agpo_cert_number: supplierForm.agpoCertNumber,
            tax_compliance_cert: supplierForm.taxComplianceCert,
            business_permit_no: supplierForm.businessPermitNo,
            nca_reg_no: supplierForm.ncaRegNo,
            credit_period_days: supplierForm.creditPeriodDays,
            annual_turnover: supplierForm.annualTurnover,
            tender_fee_paid: supplierForm.tenderFeePaid,
            tender_fee_receipt_no: supplierForm.tenderFeeReceiptNo,
            prequalification_score: supplierForm.prequalificationScore,
            prequalification_status: supplierForm.prequalificationStatus || 'pending',
            is_active: true
        });
        setShowSupplierModal(false);
        setEditSupplier(null);
        setSupplierForm(emptySupplier());
        load();
    };

    const saveLPO = async () => {
        let finalLpoNumber = lpoForm.lpoNumber || lpoForm.lpo_number;
        if (!finalLpoNumber || finalLpoNumber.startsWith('LPO-17') || finalLpoNumber.includes(Date.now().toString().slice(0, 5))) {
            try {
                finalLpoNumber = await apiService.getNextDocumentNumber(institution.id, 'lpo');
            } catch (e) {}
        }
        const subtotal = (lpoForm.items || []).reduce((s, i) => s + i.total, 0);
        const tax = subtotal * 0.16;
        const total = subtotal + tax;
        await apiService.saveModuleRecord('procurement_lpos', { 
            ...lpoForm, 
            institution_id: institution.id, 
            institutionId: institution.id, 
            lpo_number: finalLpoNumber, 
            lpoNumber: finalLpoNumber,
            supplier_id: lpoForm.supplierId, 
            requisition_id: lpoForm.requisitionId, 
            vote_head: lpoForm.voteHead,
            tender_category_no: lpoForm.tenderCategoryNo,
            tender_ref: lpoForm.tenderRef,
            issued_date: lpoForm.issuedDate, 
            expected_delivery_date: lpoForm.expectedDeliveryDate, 
            delivery_address: lpoForm.deliveryAddress, 
            tax_amount: tax, 
            total_amount: total, 
            subtotal, 
            created_by: currentUser?.name || currentUser?.id 
        });
        setShowLPOModal(false); setEditLPO(null); setLpoForm(emptyLPO()); load();
    };

    const saveInvoice = async () => {
        const total = (invoiceForm.totalAmount || 0);
        const subtotal = (invoiceForm.amount || (total / 1.16));
        const whtRate = invoiceForm.withholdingTaxRate || 0;
        const whtAmount = subtotal * (whtRate / 100);
        const whvatAmount = invoiceForm.withholdingVatAmount || 0;
        const netPayable = total - whtAmount - whvatAmount;
        const balance = netPayable - (invoiceForm.amountPaid || 0);
        const status = (invoiceForm.amountPaid || 0) >= netPayable ? 'paid' : (invoiceForm.amountPaid || 0) > 0 ? 'partial' : 'pending';
        
        await apiService.saveModuleRecord('procurement_invoices', { 
            ...invoiceForm, 
            institution_id: institution.id, 
            institutionId: institution.id, 
            lpo_id: invoiceForm.lpoId, 
            supplier_id: invoiceForm.supplierId, 
            invoice_number: invoiceForm.invoiceNumber, 
            invoice_date: invoiceForm.invoiceDate, 
            due_date: invoiceForm.dueDate, 
            vote_head: invoiceForm.voteHead,
            subtotal,
            tax_amount: invoiceForm.taxAmount, 
            total_amount: total, 
            withholding_tax_rate: whtRate,
            withholding_tax_amount: whtAmount,
            withholding_vat_amount: whvatAmount,
            net_payable_amount: netPayable,
            amount_paid: invoiceForm.amountPaid, 
            payment_reference: invoiceForm.paymentReference, 
            payment_date: invoiceForm.paymentDate, 
            payment_method: invoiceForm.paymentMethod, 
            status 
        });
        setShowInvoiceModal(false); setEditInvoice(null); setInvoiceForm(emptyInvoice()); load();
    };

    const handleSaveTenderFee = async () => {
        if (!tenderFeeForm.bidderName) {
            alert("Please enter the Bidder / Supplier Name");
            return;
        }
        const receiptNo = `TR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        const cat = KENYAN_MOE_TENDER_CATEGORIES.find(c => c.categoryNo === tenderFeeForm.categoryNo);
        const existing = suppliers.find(s => s.name.toLowerCase() === tenderFeeForm.bidderName.toLowerCase() || (tenderFeeForm.kraPin && s.kraPin === tenderFeeForm.kraPin));

        if (existing) {
            await apiService.saveModuleRecord('procurement_suppliers', {
                id: existing.id,
                institution_id: institution.id,
                tender_category_no: tenderFeeForm.categoryNo,
                tender_ref: tenderFeeForm.tenderRef,
                tender_fee_paid: true,
                tender_fee_receipt_no: receiptNo,
                phone: tenderFeeForm.phone || existing.phone,
                email: tenderFeeForm.email || existing.email,
                kra_pin: tenderFeeForm.kraPin || existing.kraPin,
            });
        } else {
            await apiService.saveModuleRecord('procurement_suppliers', {
                institution_id: institution.id,
                name: tenderFeeForm.bidderName,
                contact_person: tenderFeeForm.bidderName,
                phone: tenderFeeForm.phone,
                email: tenderFeeForm.email,
                kra_pin: tenderFeeForm.kraPin,
                category: tenderFeeForm.categoryNo,
                tender_category_no: tenderFeeForm.categoryNo,
                tender_ref: tenderFeeForm.tenderRef,
                tender_fee_paid: true,
                tender_fee_receipt_no: receiptNo,
                prequalification_status: 'pending',
                is_active: true,
            });
        }

        const receiptData = {
            receiptNo,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            bidderName: tenderFeeForm.bidderName,
            kraPin: tenderFeeForm.kraPin,
            categoryNo: tenderFeeForm.categoryNo,
            categoryTitle: cat?.title || 'Tender Category',
            tenderRef: tenderFeeForm.tenderRef,
            amount: tenderFeeForm.amount || 1000,
            paymentMode: tenderFeeForm.paymentMode,
            referenceNo: tenderFeeForm.referenceNo || 'DIRECT/CASH',
            receivedBy: currentUser?.name || 'School Bursar / Finance Office'
        };

        setTenderFeeReceiptPrint(receiptData);
        setShowTenderFeeModal(false);
        await load();
    };

    const handleSaveEvaluation = async () => {
        if (!evaluatingSupplier?.id) return;
        const totalScore = evaluationScores.mandatoryPassed 
            ? (evaluationScores.premise + evaluationScores.experience + evaluationScores.financial + evaluationScores.creditPeriod + evaluationScores.litigation + evaluationScores.agpoSpecial)
            : 0;
        const status = (evaluationScores.mandatoryPassed && totalScore >= 80) ? 'prequalified' : 'disqualified';
        
        await apiService.saveModuleRecord('procurement_suppliers', {
            id: evaluatingSupplier.id,
            institution_id: institution.id,
            prequalification_score: totalScore,
            prequalification_status: status,
            notes: evaluatingSupplier.notes ? `${evaluatingSupplier.notes}\n[Evaluation: ${status.toUpperCase()} with ${totalScore}% score]` : `[Evaluation: ${status.toUpperCase()} with ${totalScore}% score]`
        });

        setShowEvaluationModal(false);
        setEvaluatingSupplier(null);
        await load();
    };

    const updateReqStatus = async (id: string, status: string) => {
        await apiService.saveModuleRecord('requisitions', { id, status, institution_id: institution.id });
        load();
    };

    const addLpoLine = () => {
        if (!lpoLineItem.name || lpoLineItem.quantity < 1) return;
        const line = { ...lpoLineItem, total: lpoLineItem.quantity * lpoLineItem.unitCost };
        setLpoForm(f => ({ ...f, items: [...(f.items || []), line] }));
        setLpoLineItem({ name: '', quantity: 1, unit: 'pcs', unitCost: 0, total: 0 });
    };

    // ── Import school store item into procurement catalogue ──
    const importFromSchool = async (schoolItem: any) => {
        setImportingId(schoolItem.id);
        try {
            // Check if already imported (match by name + institution)
            const existing = items.find(i => i.name.toLowerCase() === (schoolItem.name || '').toLowerCase());
            if (existing) {
                alert(`"${schoolItem.name}" is already in the Procurement catalogue.`);
                return;
            }
            await apiService.saveModuleRecord('procurement_items', {
                institution_id: institution.id,
                institutionId: institution.id,
                name: schoolItem.name,
                category: schoolItem.category || 'General',
                unit: schoolItem.unit || 'pcs',
                unit_cost: schoolItem.costPrice || schoolItem.cost_price || schoolItem.basePrice || schoolItem.base_price || 0,
                unitCost: schoolItem.costPrice || schoolItem.cost_price || schoolItem.basePrice || schoolItem.base_price || 0,
                reorder_level: schoolItem.reorderLevel || schoolItem.reorder_level || 5,
                reorderLevel: schoolItem.reorderLevel || schoolItem.reorder_level || 5,
                current_stock: schoolItem.quantity || 0,
                currentStock: schoolItem.quantity || 0,
                item_code: schoolItem.sku || '',
                itemCode: schoolItem.sku || '',
                description: schoolItem.description || '',
                is_active: true,
                // Store the retail item ID for two-way sync
                retail_item_id: schoolItem.id,
            });
            await load();
        } finally {
            setImportingId(null);
        }
    };

    // ── Mark LPO as Received and push qty into school store inventory ──
    const markLPOReceived = async (lpo: ProcurementLPO) => {
        if (!window.confirm(`Mark LPO ${lpo.lpoNumber || lpo.lpo_number} as RECEIVED?\n\nThis will update stock levels in both Procurement and School Store inventory.`)) return;
        // 1. Update LPO status
        await apiService.saveModuleRecord('procurement_lpos', { id: lpo.id, status: 'received', institution_id: institution.id });
        // 2. For each LPO line item, update procurement_items stock + retail_inventory_items quantity
        for (const line of (lpo.items || [])) {
            const procItem = items.find(i => i.name.toLowerCase() === line.name.toLowerCase());
            if (procItem?.id) {
                const newStock = (procItem.currentStock || procItem.current_stock || 0) + line.quantity;
                await apiService.saveModuleRecord('procurement_items', { id: procItem.id, current_stock: newStock, currentStock: newStock, institution_id: institution.id }).catch(() => null);
            }
            const schItem = schoolItems.find(s => s.name.toLowerCase() === line.name.toLowerCase());
            if (schItem?.id) {
                const newQty = (schItem.quantity || 0) + line.quantity;
                await apiService.saveModuleRecord('retail_inventory_items', { id: schItem.id, quantity: newQty, institution_id: institution.id }).catch(() => null);
            }
        }
        await load();
    };

    // ── Report computations ──
    const totalOwing = invoices.reduce((s, inv) => s + (inv.balanceOwing || inv.balance_owing || ((inv.totalAmount || inv.total_amount || 0) - (inv.amountPaid || inv.amount_paid || 0))), 0);
    const totalPaid = invoices.reduce((s, inv) => s + (inv.amountPaid || inv.amount_paid || 0), 0);
    const overdueInvoices = invoices.filter(inv => {
        const due = inv.dueDate || inv.due_date;
        return due && new Date(due) < new Date() && (inv.status !== 'paid');
    });

    // ── Tender & AGPO computations ──
    const tenderFeesTotal = suppliers.filter(s => s.tenderFeePaid || s.tender_fee_paid).length * 1000;
    const prequalifiedSuppliersCount = suppliers.filter(s => (s.prequalificationStatus || s.prequalification_status) === 'prequalified').length;
    
    // AGPO spend analysis
    const agpoSupplierIds = useMemo(() => {
        return new Set(suppliers.filter(s => s.isAgpo || s.is_agpo || (s.agpoCategory && s.agpoCategory !== 'none') || (s.agpo_category && s.agpo_category !== 'none')).map(s => s.id));
    }, [suppliers]);

    const totalProcurementSpend = useMemo(() => {
        return invoices.reduce((s, i) => s + (i.totalAmount || i.total_amount || 0), 0);
    }, [invoices]);

    const agpoSpend = useMemo(() => {
        return invoices.filter(i => agpoSupplierIds.has(i.supplierId || i.supplier_id)).reduce((s, i) => s + (i.totalAmount || i.total_amount || 0), 0);
    }, [invoices, agpoSupplierIds]);

    const agpoPercentage = totalProcurementSpend > 0 ? (agpoSpend / totalProcurementSpend) * 100 : 0;

    // Filtered categories
    const filteredTenderCategories = useMemo(() => {
        return KENYAN_MOE_TENDER_CATEGORIES.filter(cat => {
            const matchesSearch = !tenderSearch || 
                cat.categoryNo.includes(tenderSearch) ||
                cat.tenderNo.toLowerCase().includes(tenderSearch.toLowerCase()) ||
                cat.title.toLowerCase().includes(tenderSearch.toLowerCase()) ||
                cat.description.toLowerCase().includes(tenderSearch.toLowerCase());
            
            const matchesEligibility = tenderEligibilityFilter === 'all' || cat.eligibility === tenderEligibilityFilter;
            const matchesVoteHead = tenderVoteHeadFilter === 'all' || cat.voteHead === tenderVoteHeadFilter;

            return matchesSearch && matchesEligibility && matchesVoteHead;
        });
    }, [tenderSearch, tenderEligibilityFilter, tenderVoteHeadFilter]);

    // ─── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">🛒 Procurement & Tender Hub</h2>
                        <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                            PPADA 2015 & MOE Compliant
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Kenyan Secondary School standard tender management: 36 MOE categories, 30% AGPO statutory tracking, LPO rubber stamp & P2P workflow
                    </p>
                </div>
                <div className="flex gap-2 text-[10px] font-bold flex-wrap">
                    <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                        📜 Pre-qualified: {prequalifiedSuppliersCount} / {suppliers.length}
                    </div>
                    <div className={`px-3 py-2 border rounded-xl ${agpoPercentage >= 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'}`}>
                        ⚖️ AGPO Spend: {agpoPercentage.toFixed(1)}% / 30% Mandate
                    </div>
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl">
                        💰 Owing: {fmt(totalOwing)}
                    </div>
                    <div className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
                        ⚠️ Overdue: {overdueInvoices.length}
                    </div>
                </div>
            </div>

            {/* Sub-tab navigation */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span>{tab.emoji}</span> {tab.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading procurement data...
                </div>
            )}

            {/* ══════════════════ TAB: TENDERS & PRE-QUALIFICATION ══════════════════ */}
            {activeTab === 'tenders' && !loading && (
                <div className="space-y-5">
                    {/* Legal Banner & Overview */}
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                                        Republic of Kenya • Ministry of Education
                                    </span>
                                    <span className="px-2.5 py-0.5 bg-blue-400/20 text-blue-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-400/30">
                                        Tender Ref: KHS/REG/001/2026/2027
                                    </span>
                                </div>
                                <h3 className="text-xl font-black tracking-tight text-white">
                                    Official School Pre-qualification & Tender Register (36 Categories)
                                </h3>
                                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                                    Aligned with the Public Procurement and Asset Disposal Act (PPADA 2015). Statutory non-refundable tender document fee is <strong>KES 1,000/-</strong> (Appropriation-in-Aid - AIA). <strong>30% statutory spend</strong> reserved for Youth, Women, and Persons with Disability (PWD). Minimum pre-qualification threshold is <strong>80%</strong>.
                                </p>
                            </div>
                            <div className="flex gap-2 flex-wrap items-center">
                                <button
                                    onClick={() => {
                                        setTenderFeeForm({
                                            bidderName: '',
                                            kraPin: '',
                                            phone: '',
                                            email: '',
                                            categoryNo: '01',
                                            tenderRef: 'KHS/REG/001/2026/2027',
                                            paymentMode: 'M-Pesa',
                                            referenceNo: '',
                                            amount: 1000,
                                        });
                                        setShowTenderFeeModal(true);
                                    }}
                                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                                >
                                    💰 Record Tender Fee (KES 1,000)
                                </button>
                                <button
                                    onClick={() => {
                                        setEditSupplier(null);
                                        setSupplierForm(emptySupplier());
                                        setShowSupplierModal(true);
                                    }}
                                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider border border-white/20 transition-all"
                                >
                                    + Register Bidder
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                            { label: 'Total MOE Categories', value: '36', sub: 'Standard Registry', color: 'indigo' },
                            { label: '👩 Women Reserved', value: '3', sub: 'Cats 02, 04, 35', color: 'rose' },
                            { label: '⚡ Youth Reserved', value: '2', sub: 'Cats 23, 24', color: 'amber' },
                            { label: '♿ PWD Reserved', value: '1', sub: 'Cat 10 (Cleaning)', color: 'purple' },
                            { label: 'Pre-qualified Bidders', value: `${prequalifiedSuppliersCount}`, sub: '>80% Evaluation Mark', color: 'emerald' },
                            { label: 'Tender Fees (AIA)', value: fmt(tenderFeesTotal), sub: `${suppliers.filter(s => s.tenderFeePaid || s.tender_fee_paid).length} Documents Sold`, color: 'blue', isText: true },
                        ].map((stat, i) => (
                            <div key={i} className={`p-4 rounded-2xl border bg-${stat.color}-50 dark:bg-${stat.color}-950/30 border-${stat.color}-100 dark:border-${stat.color}-900`}>
                                <p className={`text-[10px] font-bold text-${stat.color}-600 dark:text-${stat.color}-400 uppercase tracking-wider truncate`}>{stat.label}</p>
                                <p className={`text-xl font-black text-${stat.color}-700 dark:text-${stat.color}-300 mt-1`}>{stat.value}</p>
                                <p className={`text-[9px] text-${stat.color}-500 dark:text-${stat.color}-400 mt-0.5 truncate`}>{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <input
                                value={tenderSearch}
                                onChange={e => setTenderSearch(e.target.value)}
                                placeholder="🔍 Search tender number, category title (e.g. Meat, Chemicals, ICT, Stationeries)..."
                                className="flex-1 min-w-[260px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            {/* AGPO Eligibility Filter */}
                            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto">
                                {[
                                    { id: 'all', label: 'All Eligibility' },
                                    { id: 'Open', label: '🌐 Open (30)' },
                                    { id: 'Women', label: '👩 Women (3)' },
                                    { id: 'Youth', label: '⚡ Youth (2)' },
                                    { id: 'PWD', label: '♿ PWD (1)' },
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setTenderEligibilityFilter(f.id as any)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                                            tenderEligibilityFilter === f.id
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Vote Head Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1">Vote Head:</span>
                            {['all', 'B.E.S (Boarding)', 'Tuition', 'R.M.I', 'Operations', 'Administration', 'L.T.&T', 'Activity', 'Development'].map(vh => (
                                <button
                                    key={vh}
                                    onClick={() => setTenderVoteHeadFilter(vh)}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                                        tenderVoteHeadFilter === vh
                                            ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    {vh === 'all' ? 'All Vote Heads' : vh}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 36 Categories Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTenderCategories.map(cat => {
                            const catSuppliers = suppliers.filter(s => (s.tenderCategoryNo || s.tender_category_no || s.category) === cat.categoryNo);
                            const prequalifiedInCat = catSuppliers.filter(s => (s.prequalificationStatus || s.prequalification_status) === 'prequalified');
                            const feesCollectedInCat = catSuppliers.filter(s => s.tenderFeePaid || s.tender_fee_paid).length * 1000;

                            const isWomen = cat.eligibility === 'Women';
                            const isYouth = cat.eligibility === 'Youth';
                            const isPwd = cat.eligibility === 'PWD';

                            return (
                                <div
                                    key={cat.categoryNo}
                                    className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
                                        isWomen ? 'border-rose-200 dark:border-rose-900/50' :
                                        isYouth ? 'border-amber-200 dark:border-amber-900/50' :
                                        isPwd ? 'border-purple-200 dark:border-purple-900/50' :
                                        'border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    {/* Top badges */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="px-2 py-0.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg font-mono font-black text-[10px]">
                                                    CAT {cat.categoryNo}
                                                </span>
                                                <span className="font-mono text-[10px] text-slate-500 font-bold">
                                                    {cat.tenderNo}
                                                </span>
                                            </div>
                                            <span className="inline-block text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md mt-1">
                                                📌 Vote Head: {cat.voteHead}
                                            </span>
                                        </div>

                                        {/* AGPO reservation label */}
                                        {isWomen && (
                                            <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0">
                                                👩 AGPO: Women
                                            </span>
                                        )}
                                        {isYouth && (
                                            <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0">
                                                ⚡ AGPO: Youth
                                            </span>
                                        )}
                                        {isPwd && (
                                            <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0">
                                                ♿ AGPO: PWD
                                            </span>
                                        )}
                                        {cat.eligibility === 'Open' && (
                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0">
                                                🌐 Open Tender
                                            </span>
                                        )}
                                    </div>

                                    {/* Title & Description */}
                                    <div className="space-y-1">
                                        <h4 className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                                            {cat.title}
                                        </h4>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {cat.description}
                                        </p>
                                    </div>

                                    {/* Stats Strip */}
                                    <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl text-[9px] text-center border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-slate-400 uppercase font-bold">Doc Fee</p>
                                            <p className="font-black text-slate-700 dark:text-slate-200">KES 1,000</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 uppercase font-bold">Registered</p>
                                            <p className="font-black text-indigo-600 dark:text-indigo-400">{catSuppliers.length} Bidders</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 uppercase font-bold">Pre-qualified</p>
                                            <p className={`font-black ${prequalifiedInCat.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {prequalifiedInCat.length} Approved
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={() => {
                                                setTenderFeeForm({
                                                    bidderName: '',
                                                    kraPin: '',
                                                    phone: '',
                                                    email: '',
                                                    categoryNo: cat.categoryNo,
                                                    tenderRef: cat.tenderNo,
                                                    paymentMode: 'M-Pesa',
                                                    referenceNo: '',
                                                    amount: 1000,
                                                });
                                                setShowTenderFeeModal(true);
                                            }}
                                            className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-[10px] font-black hover:bg-emerald-100 transition-colors"
                                        >
                                            💰 Pay Fee (KES 1K)
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditSupplier(null);
                                                setSupplierForm({
                                                    ...emptySupplier(),
                                                    category: cat.categoryNo,
                                                    tenderCategoryNo: cat.categoryNo,
                                                    tenderRef: cat.tenderNo,
                                                    isAgpo: cat.eligibility !== 'Open',
                                                    agpoCategory: cat.eligibility === 'Women' ? 'women' : cat.eligibility === 'Youth' ? 'youth' : cat.eligibility === 'PWD' ? 'pwd' : 'none'
                                                });
                                                setShowSupplierModal(true);
                                            }}
                                            className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition-colors"
                                        >
                                            + Bidder
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSupplierCategoryFilter(cat.categoryNo);
                                                setActiveTab('suppliers');
                                            }}
                                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-colors"
                                        >
                                            View ({catSuppliers.length})
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB: ITEMS INVENTORY ══════════════════ */}
            {activeTab === 'inventory' && !loading && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="🔍 Search items..." className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        {/* View filter pills */}
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                            {(['all', 'procurement', 'school'] as const).map(v => (
                                <button key={v} onClick={() => setInventoryView(v)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                    inventoryView === v ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}>{v === 'all' ? 'All' : v === 'procurement' ? '🛒 Procurement' : '🏪 School Store'}</button>
                            ))}
                        </div>
                        <button onClick={() => { setEditItem(null); setItemForm(emptyItem()); setShowItemModal(true); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md">
                            + Add Item
                        </button>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Procurement Items', value: items.length, color: 'indigo' },
                            { label: 'School Store Items', value: schoolItems.length, color: 'purple' },
                            { label: 'Low Stock (Procurement)', value: items.filter(i => (i.currentStock || i.current_stock || 0) <= (i.reorderLevel || i.reorder_level || 0)).length, color: 'amber' },
                            { label: 'Procurement Value', value: fmt(items.reduce((s, i) => s + (i.currentStock || i.current_stock || 0) * (i.unitCost || i.unit_cost || 0), 0)), color: 'emerald', isText: true },
                        ].map(stat => (
                            <div key={stat.label} className={`p-4 rounded-2xl border bg-${stat.color}-50 dark:bg-${stat.color}-950/30 border-${stat.color}-100 dark:border-${stat.color}-900`}>
                                <p className={`text-[10px] font-bold text-${stat.color}-600 dark:text-${stat.color}-400 uppercase tracking-wider`}>{stat.label}</p>
                                <p className={`text-xl font-black text-${stat.color}-700 dark:text-${stat.color}-300 mt-1`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Procurement Items Table ── */}
                    {(inventoryView === 'all' || inventoryView === 'procurement') && (
                        <div>
                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">🛒 Procurement Catalogue</p>
                            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                        <tr>{['Code', 'Name', 'Category', 'Unit', 'Unit Cost', 'Stock', 'Reorder', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                                        ))}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {items.filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()) || (i.category || '').toLowerCase().includes(itemSearch.toLowerCase())).map(item => {
                                            const stock = item.currentStock ?? item.current_stock ?? 0;
                                            const reorder = item.reorderLevel ?? item.reorder_level ?? 0;
                                            const isLow = stock <= reorder;
                                            const linkedSchool = schoolItems.find(s => s.name.toLowerCase() === item.name.toLowerCase());
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-slate-500">{item.itemCode || item.item_code || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-bold text-slate-800 dark:text-white">{item.name}</span>
                                                        {linkedSchool && <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full text-[8px] font-black">🏪 LINKED</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.category}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.unit}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{fmt(item.unitCost ?? item.unit_cost ?? 0)}</td>
                                                    <td className={`px-4 py-3 font-black ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>{stock}</td>
                                                    <td className="px-4 py-3 text-slate-500">{reorder}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {isLow ? '⚠ Low' : '✓ OK'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button onClick={() => { setItemForm({ ...item, unitCost: item.unitCost ?? item.unit_cost, reorderLevel: item.reorderLevel ?? item.reorder_level, currentStock: item.currentStock ?? item.current_stock, itemCode: item.itemCode ?? item.item_code }); setEditItem(item); setShowItemModal(true); }} className="text-indigo-600 hover:text-indigo-800 font-black">Edit</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {items.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No procurement items yet. Click + Add Item or import from School Store below.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── School Store Items Table ── */}
                    {(inventoryView === 'all' || inventoryView === 'school') && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">🏪 School Store Inventory</p>
                                <p className="text-[10px] text-slate-400">Items imported into Procurement get a <span className="font-black text-indigo-600">🛒 IMPORTED</span> badge</p>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-purple-200 dark:border-purple-800">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-purple-50 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-800">
                                        <tr>{['SKU', 'Name', 'Category', 'Unit', 'Cost Price', 'Qty in Store', 'Reorder', 'Linked', 'Action'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left font-black text-purple-500 dark:text-purple-400 uppercase tracking-wider">{h}</th>
                                        ))}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-purple-50 dark:divide-purple-900/30">
                                        {schoolItems.filter(s => !itemSearch || (s.name || '').toLowerCase().includes(itemSearch.toLowerCase())).map(si => {
                                            const alreadyImported = items.some(i => i.name.toLowerCase() === (si.name || '').toLowerCase());
                                            return (
                                                <tr key={si.id} className="hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-slate-500">{si.sku || '—'}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{si.name}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{si.category || '—'}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{si.unit || 'pcs'}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{fmt(si.costPrice || si.cost_price || si.basePrice || si.base_price || 0)}</td>
                                                    <td className={`px-4 py-3 font-black ${(si.quantity || 0) <= (si.reorderLevel || si.reorder_level || 0) ? 'text-rose-600' : 'text-emerald-600'}`}>{si.quantity || 0}</td>
                                                    <td className="px-4 py-3 text-slate-500">{si.reorderLevel || si.reorder_level || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        {alreadyImported
                                                            ? <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full font-black text-[9px]">🛒 Imported</span>
                                                            : <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full font-black text-[9px]">Not imported</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {!alreadyImported && (
                                                            <button
                                                                onClick={() => importFromSchool(si)}
                                                                disabled={importingId === si.id}
                                                                className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-[9px] font-black hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                            >
                                                                {importingId === si.id ? '...' : '⬆ Import'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {schoolItems.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No school store items found. Add items in the Retail/Store module first.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════ TAB: SUPPLIERS ══════════════════ */}
            {activeTab === 'suppliers' && !loading && (
                <div className="space-y-4">
                    {/* Toolbar & Filters */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <input
                                value={supplierSearch}
                                onChange={e => setSupplierSearch(e.target.value)}
                                placeholder="🔍 Search supplier name, PIN, contact, certificate..."
                                className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setTenderFeeForm({
                                            bidderName: '',
                                            kraPin: '',
                                            phone: '',
                                            email: '',
                                            categoryNo: '01',
                                            tenderRef: 'KHS/REG/001/2026/2027',
                                            paymentMode: 'M-Pesa',
                                            referenceNo: '',
                                            amount: 1000,
                                        });
                                        setShowTenderFeeModal(true);
                                    }}
                                    className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                                >
                                    💰 Record Fee (KES 1K)
                                </button>
                                <button
                                    onClick={() => {
                                        setEditSupplier(null);
                                        setSupplierForm(emptySupplier());
                                        setShowSupplierModal(true);
                                    }}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md"
                                >
                                    + Register Supplier
                                </button>
                            </div>
                        </div>

                        {/* Filter pills */}
                        <div className="flex items-center gap-2 flex-wrap text-[10px]">
                            {/* AGPO Filter */}
                            <span className="font-black text-slate-400 uppercase">AGPO:</span>
                            {['all', 'agpo_only', 'women', 'youth', 'pwd'].map(af => (
                                <button
                                    key={af}
                                    onClick={() => setSupplierAgpoFilter(af)}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                        supplierAgpoFilter === af
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    {af === 'all' ? 'All Groups' : af === 'agpo_only' ? '✨ All AGPO' : af === 'women' ? '👩 Women' : af === 'youth' ? '⚡ Youth' : '♿ PWD'}
                                </button>
                            ))}

                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                            {/* Category Filter */}
                            <span className="font-black text-slate-400 uppercase">Category:</span>
                            <select
                                value={supplierCategoryFilter}
                                onChange={e => setSupplierCategoryFilter(e.target.value)}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-[10px] outline-none border border-slate-200 dark:border-slate-700"
                            >
                                <option value="all">All 36 Categories</option>
                                {KENYAN_MOE_TENDER_CATEGORIES.map(c => (
                                    <option key={c.categoryNo} value={c.categoryNo}>
                                        Cat {c.categoryNo}: {c.title.slice(0, 35)}...
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Suppliers Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suppliers.filter(sup => {
                            const nameMatch = !supplierSearch || 
                                sup.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                                (sup.kraPin || sup.kra_pin || '').toLowerCase().includes(supplierSearch.toLowerCase()) ||
                                (sup.contactPerson || sup.contact_person || '').toLowerCase().includes(supplierSearch.toLowerCase());

                            const cat = sup.tenderCategoryNo || sup.tender_category_no || sup.category;
                            const catMatch = supplierCategoryFilter === 'all' || cat === supplierCategoryFilter;

                            const agpo = sup.agpoCategory || sup.agpo_category || 'none';
                            const isAgpo = sup.isAgpo || sup.is_agpo || agpo !== 'none';
                            const agpoMatch = supplierAgpoFilter === 'all' ||
                                (supplierAgpoFilter === 'agpo_only' && isAgpo) ||
                                (supplierAgpoFilter === 'women' && agpo === 'women') ||
                                (supplierAgpoFilter === 'youth' && agpo === 'youth') ||
                                (supplierAgpoFilter === 'pwd' && agpo === 'pwd');

                            return nameMatch && catMatch && agpoMatch;
                        }).map(sup => {
                            const owing = sup.outstandingBalance ?? sup.outstanding_balance ?? 0;
                            const catNo = sup.tenderCategoryNo || sup.tender_category_no || sup.category;
                            const catInfo = KENYAN_MOE_TENDER_CATEGORIES.find(c => c.categoryNo === catNo);
                            const agpoCat = sup.agpoCategory || sup.agpo_category || 'none';
                            const isAgpo = sup.isAgpo || sup.is_agpo || agpoCat !== 'none';
                            const feePaid = sup.tenderFeePaid || sup.tender_fee_paid;
                            const prequalStatus = sup.prequalificationStatus || sup.prequalification_status || 'pending';
                            const prequalScore = sup.prequalificationScore ?? sup.prequalification_score ?? 0;
                            const creditDays = sup.creditPeriodDays ?? sup.credit_period_days ?? 30;

                            return (
                                <div key={sup.id} className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow space-y-3.5">
                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-black text-slate-800 dark:text-white text-sm">{sup.name}</p>
                                                {isAgpo && (
                                                    <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-full font-black text-[9px] uppercase tracking-wider">
                                                        {agpoCat === 'women' ? '👩 Women' : agpoCat === 'youth' ? '⚡ Youth' : agpoCat === 'pwd' ? '♿ PWD' : 'AGPO'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                Cat {catNo || '01'} • {catInfo ? catInfo.title : sup.category}
                                            </p>
                                        </div>
                                        <span className="text-sm shrink-0">{'⭐'.repeat(sup.rating || 3)}</span>
                                    </div>

                                    {/* Badges strip: Pre-qualification & Fee */}
                                    <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-black">
                                        {prequalStatus === 'prequalified' ? (
                                            <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg">
                                                ✓ Pre-qualified ({prequalScore}%)
                                            </span>
                                        ) : prequalStatus === 'disqualified' ? (
                                            <span className="px-2.5 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-lg">
                                                ✗ Unsuccessful ({prequalScore}%)
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-lg">
                                                ⏳ Pending Eval
                                            </span>
                                        )}

                                        {feePaid ? (
                                            <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg">
                                                ✓ Fee Paid ({sup.tenderFeeReceiptNo || sup.tender_fee_receipt_no || 'TR-OK'})
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
                                                ⚠️ Fee Pending (KES 1K)
                                            </span>
                                        )}

                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                                            💳 Net {creditDays} Days Credit
                                        </span>
                                    </div>

                                    {/* Compliance & Bank Details */}
                                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div><span className="text-slate-400">Contact:</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{sup.contactPerson || sup.contact_person || '—'}</span></div>
                                        <div><span className="text-slate-400">Phone:</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{sup.phone || '—'}</span></div>
                                        <div><span className="text-slate-400">KRA PIN:</span><br /><span className="font-mono font-bold text-slate-700 dark:text-slate-200">{sup.kraPin || sup.kra_pin || '—'}</span></div>
                                        <div><span className="text-slate-400">Banker:</span><br /><span className="font-bold text-slate-700 dark:text-slate-200">{sup.bankName || sup.bank_name || '—'} ({sup.bankBranch || sup.bank_branch || 'Main'})</span></div>
                                    </div>

                                    {/* Outstanding & Action buttons */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-1.5 flex-wrap">
                                        <div>
                                            <p className="text-[9px] text-slate-400 uppercase font-bold">Outstanding</p>
                                            <p className={`font-black text-sm ${owing > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(owing)}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => {
                                                    setEvaluatingSupplier(sup);
                                                    setEvaluationScores({
                                                        mandatoryPassed: true,
                                                        premise: 10,
                                                        experience: 25,
                                                        financial: 18,
                                                        creditPeriod: 18,
                                                        litigation: 10,
                                                        agpoSpecial: 10,
                                                        notes: '',
                                                    });
                                                    setShowEvaluationModal(true);
                                                }}
                                                className="px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-[10px] font-black hover:bg-purple-100 transition-colors"
                                            >
                                                ⚖️ Score / Eval
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSupplierForm({
                                                        ...sup,
                                                        contactPerson: sup.contactPerson ?? sup.contact_person,
                                                        kraPin: sup.kraPin ?? sup.kra_pin,
                                                        paymentTerms: sup.paymentTerms ?? sup.payment_terms,
                                                        bankName: sup.bankName ?? sup.bank_name,
                                                        bankAccount: sup.bankAccount ?? sup.bank_account,
                                                        bankBranch: sup.bankBranch ?? sup.bank_branch,
                                                        tenderRef: sup.tenderRef ?? sup.tender_ref ?? 'KHS/REG/001/2026/2027',
                                                        tenderCategoryNo: sup.tenderCategoryNo ?? sup.tender_category_no ?? '01',
                                                        isAgpo: sup.isAgpo ?? sup.is_agpo ?? false,
                                                        agpoCategory: (sup.agpoCategory ?? sup.agpo_category ?? 'none') as any,
                                                        agpoCertNumber: sup.agpoCertNumber ?? sup.agpo_cert_number ?? '',
                                                        taxComplianceCert: sup.taxComplianceCert ?? sup.tax_compliance_cert ?? '',
                                                        businessPermitNo: sup.businessPermitNo ?? sup.business_permit_no ?? '',
                                                        ncaRegNo: sup.ncaRegNo ?? sup.nca_reg_no ?? '',
                                                        creditPeriodDays: sup.creditPeriodDays ?? sup.credit_period_days ?? 30,
                                                        annualTurnover: sup.annualTurnover ?? sup.annual_turnover ?? 0,
                                                        tenderFeePaid: sup.tenderFeePaid ?? sup.tender_fee_paid ?? false,
                                                        tenderFeeReceiptNo: sup.tenderFeeReceiptNo ?? sup.tender_fee_receipt_no ?? '',
                                                    });
                                                    setEditSupplier(sup);
                                                    setShowSupplierModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {suppliers.length === 0 && <div className="col-span-3 py-12 text-center text-slate-400">No suppliers registered yet. Click + Register Supplier or Record Tender Fee to begin.</div>}
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB: REQUISITIONS ══════════════════ */}
            {activeTab === 'requisitions' && !loading && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <input value={reqSearch} onChange={e => setReqSearch(e.target.value)} placeholder="🔍 Search requisitions..." className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={() => { setReqForm(emptyReq()); setShowReqModal(true); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md">
                            + New Requisition
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-[11px]">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>{['REQ #', 'Title / Description', 'Requested By', 'Date', 'Amount', 'Priority', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {requisitions.filter(r => !reqSearch || (r.title || r.description || '').toLowerCase().includes(reqSearch.toLowerCase())).map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                        <td className="px-4 py-3 font-mono text-slate-500">{req.id?.slice(0, 8) || '—'}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white max-w-[180px] truncate">{req.title || req.description || req.notes || '(No title)'}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{req.requestedBy || req.requested_by || req.createdBy || '—'}</td>
                                        <td className="px-4 py-3 text-slate-500">{req.requestedDate || req.requested_date || req.createdAt?.split('T')[0] || '—'}</td>
                                        <td className="px-4 py-3 font-bold">{fmt(req.totalAmount || req.total_amount || 0)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${req.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : req.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {req.priority || 'Normal'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${STATUS_COLORS[req.status] || STATUS_COLORS.pending}`}>
                                                {req.status || 'pending'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {req.status === 'pending' && <>
                                                    <button onClick={() => updateReqStatus(req.id, 'approved')} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-black text-[9px] hover:bg-emerald-200">✓ Approve</button>
                                                    <button onClick={() => updateReqStatus(req.id, 'rejected')} className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg font-black text-[9px] hover:bg-rose-200">✗ Reject</button>
                                                </>}
                                                {req.status === 'approved' && (
                                                    <button onClick={() => handleOpenCreateLPO(req)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-black text-[9px] hover:bg-blue-200">📄 Create LPO</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {requisitions.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No requisitions found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB: LPO MANAGEMENT ══════════════════ */}
            {activeTab === 'lpos' && !loading && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <input value={lpoSearch} onChange={e => setLpoSearch(e.target.value)} placeholder="🔍 Search LPOs..." className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={() => handleOpenCreateLPO()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md">
                            + Create LPO
                        </button>
                    </div>

                    {/* LPO cards */}
                    <div className="space-y-3">
                        {lpos.filter(l => !lpoSearch || (l.lpoNumber || l.lpo_number || '').toLowerCase().includes(lpoSearch.toLowerCase()) || supplierName(l.supplierId || l.supplier_id).toLowerCase().includes(lpoSearch.toLowerCase())).map(lpo => {
                            const sName = supplierName(lpo.supplierId || lpo.supplier_id);
                            const total = lpo.totalAmount || lpo.total_amount || 0;
                            const lpoNum = lpo.lpoNumber || lpo.lpo_number;
                            const status = lpo.status || 'draft';
                            const voteHead = lpo.voteHead || lpo.vote_head || 'B.E.S (Boarding)';
                            const tenderCat = lpo.tenderCategoryNo || lpo.tender_category_no;

                            return (
                                <div key={lpo.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-slate-800 dark:text-white text-sm">{lpoNum}</span>
                                                <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>{status}</span>
                                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md font-bold text-[9px]">
                                                    📌 {voteHead}
                                                </span>
                                                {tenderCat && (
                                                    <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-md font-bold text-[9px]">
                                                        Cat {tenderCat}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500">Supplier: <span className="font-bold text-slate-700 dark:text-slate-200">{sName}</span></p>
                                            <p className="text-[11px] text-slate-500">Issued: <span className="font-bold">{lpo.issuedDate || lpo.issued_date}</span> {lpo.expectedDeliveryDate || lpo.expected_delivery_date ? `• Expected: ${lpo.expectedDeliveryDate || lpo.expected_delivery_date}` : ''}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="text-xl font-black text-slate-800 dark:text-white">{fmt(total)}</p>
                                            <p className="text-[10px] text-slate-400">{(lpo.items || []).length} line items (incl. 16% VAT)</p>
                                            <div className="flex gap-1.5 justify-end flex-wrap">
                                                {/* Printable Official LPO with Stamp button */}
                                                <button
                                                    onClick={() => setSelectedLpoForPrint(lpo)}
                                                    className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-[9px] font-black hover:bg-blue-100 flex items-center gap-1"
                                                >
                                                    🖨️ Official LPO (Stamp)
                                                </button>
                                                <button onClick={() => { setInvoiceForm({ ...emptyInvoice(), lpoId: lpo.id, supplierId: lpo.supplierId || lpo.supplier_id, totalAmount: total, voteHead }); setShowInvoiceModal(true); setActiveTab('invoices'); }} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-xl text-[9px] font-black hover:bg-amber-200">🧾 Record Invoice</button>
                                                {status === 'issued' && (
                                                    <button onClick={() => markLPOReceived(lpo)} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-xl text-[9px] font-black hover:bg-emerald-200">✅ Mark Received</button>
                                                )}
                                                <button onClick={() => { setLpoForm({ ...lpo, lpoNumber: lpo.lpoNumber ?? lpo.lpo_number, supplierId: lpo.supplierId ?? lpo.supplier_id, voteHead: lpo.voteHead ?? lpo.vote_head ?? 'B.E.S (Boarding)' }); setEditLPO(lpo); setShowLPOModal(true); }} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black hover:bg-indigo-100">Edit</button>
                                            </div>
                                        </div>
                                    </div>
                                    {(lpo.items || []).length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <table className="w-full text-[10px]">
                                                <thead><tr className="text-slate-400 font-black uppercase tracking-wider"><th className="text-left py-1">Item</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Unit Cost</th><th className="text-right py-1">Total</th></tr></thead>
                                                <tbody>{(lpo.items || []).map((line, i) => (
                                                    <tr key={i} className="border-t border-slate-50 dark:border-slate-800/50">
                                                        <td className="py-1 text-slate-700 dark:text-slate-200">{line.name}</td>
                                                        <td className="py-1 text-right text-slate-500">{line.quantity} {line.unit}</td>
                                                        <td className="py-1 text-right text-slate-500">{fmt(line.unitCost)}</td>
                                                        <td className="py-1 text-right font-bold text-slate-700 dark:text-slate-200">{fmt(line.total)}</td>
                                                    </tr>
                                                ))}</tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {lpos.length === 0 && <div className="py-12 text-center text-slate-400">No LPOs created yet. Approve a requisition and click "Create LPO".</div>}
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB: SUPPLIER INVOICES ══════════════════ */}
            {activeTab === 'invoices' && !loading && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <input value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} placeholder="🔍 Search invoices..." className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={() => { setEditInvoice(null); setInvoiceForm(emptyInvoice()); setShowInvoiceModal(true); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md">
                            + Record Invoice
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-[11px]">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>{['Invoice #', 'Supplier', 'Vote Head', 'LPO #', 'Date', 'Gross Total', 'WHT (3/5%)', 'Net Payable', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {invoices.filter(inv => !invoiceSearch || (inv.invoiceNumber || inv.invoice_number || '').toLowerCase().includes(invoiceSearch.toLowerCase()) || supplierName(inv.supplierId || inv.supplier_id).toLowerCase().includes(invoiceSearch.toLowerCase())).map(inv => {
                                    const total = inv.totalAmount ?? inv.total_amount ?? 0;
                                    const wht = inv.withholdingTaxAmount ?? inv.withholding_tax_amount ?? 0;
                                    const whvat = inv.withholdingVatAmount ?? inv.withholding_vat_amount ?? 0;
                                    const netPayable = inv.netPayableAmount ?? inv.net_payable_amount ?? (total - wht - whvat);
                                    const paid = inv.amountPaid ?? inv.amount_paid ?? 0;
                                    const balance = netPayable - paid;
                                    const dueDate = inv.dueDate || inv.due_date;
                                    const isOverdue = dueDate && new Date(dueDate) < new Date() && inv.status !== 'paid';
                                    const status = isOverdue ? 'overdue' : (inv.status || 'pending');
                                    const vh = inv.voteHead || inv.vote_head || 'B.E.S';

                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                            <td className="px-3 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">{inv.invoiceNumber || inv.invoice_number || '—'}</td>
                                            <td className="px-3 py-3 font-bold text-slate-800 dark:text-white">{supplierName(inv.supplierId || inv.supplier_id)}</td>
                                            <td className="px-3 py-3 text-slate-500 font-bold text-[10px]">{vh}</td>
                                            <td className="px-3 py-3 font-mono text-slate-500">{lpoNumber(inv.lpoId || inv.lpo_id)}</td>
                                            <td className="px-3 py-3 text-slate-500">{inv.invoiceDate || inv.invoice_date}</td>
                                            <td className="px-3 py-3 font-bold text-slate-700 dark:text-slate-200">{fmt(total)}</td>
                                            <td className="px-3 py-3 font-mono text-amber-600 font-bold">-{fmt(wht + whvat)}</td>
                                            <td className="px-3 py-3 font-black text-indigo-700 dark:text-indigo-300">{fmt(netPayable)}</td>
                                            <td className="px-3 py-3 font-bold text-emerald-600">{fmt(paid)}</td>
                                            <td className={`px-3 py-3 font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(balance)}</td>
                                            <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>{status}</span></td>
                                            <td className="px-3 py-3"><button onClick={() => { setInvoiceForm({ ...inv, lpoId: inv.lpoId ?? inv.lpo_id, supplierId: inv.supplierId ?? inv.supplier_id, invoiceNumber: inv.invoiceNumber ?? inv.invoice_number, invoiceDate: inv.invoiceDate ?? inv.invoice_date, dueDate: inv.dueDate ?? inv.due_date, voteHead: vh, totalAmount: total, taxAmount: inv.taxAmount ?? inv.tax_amount, withholdingTaxRate: inv.withholdingTaxRate ?? inv.withholding_tax_rate ?? 0, withholdingTaxAmount: wht, withholdingVatAmount: whvat, netPayableAmount: netPayable, amountPaid: paid, paymentReference: inv.paymentReference ?? inv.payment_reference, paymentDate: inv.paymentDate ?? inv.payment_date, paymentMethod: inv.paymentMethod ?? inv.payment_method }); setEditInvoice(inv); setShowInvoiceModal(true); }} className="text-indigo-600 hover:text-indigo-800 font-black">Pay / Edit</button></td>
                                        </tr>
                                    );
                                })}
                                {invoices.length === 0 && <tr><td colSpan={12} className="px-4 py-10 text-center text-slate-400">No invoices recorded yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB: REPORTS ══════════════════ */}
            {activeTab === 'reports' && !loading && (
                <div className="space-y-6">
                    {/* Summary KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Total LPOs Issued', value: lpos.length, sub: fmt(lpos.reduce((s, l) => s + (l.totalAmount || l.total_amount || 0), 0)), color: 'indigo' },
                            { label: 'Total Invoiced', value: invoices.length, sub: fmt(invoices.reduce((s, i) => s + (i.totalAmount || i.total_amount || 0), 0)), color: 'blue' },
                            { label: 'Total Paid', value: '', sub: fmt(totalPaid), color: 'emerald' },
                            { label: 'Total Owing', value: '', sub: fmt(totalOwing), color: 'rose' },
                        ].map(kpi => (
                            <div key={kpi.label} className={`p-5 rounded-2xl border bg-${kpi.color}-50 dark:bg-${kpi.color}-950/30 border-${kpi.color}-100 dark:border-${kpi.color}-900`}>
                                <p className={`text-[10px] font-black text-${kpi.color}-600 dark:text-${kpi.color}-400 uppercase tracking-wider`}>{kpi.label}</p>
                                {kpi.value !== '' && <p className={`text-2xl font-black text-${kpi.color}-700 dark:text-${kpi.color}-300`}>{kpi.value}</p>}
                                <p className={`text-sm font-black text-${kpi.color}-700 dark:text-${kpi.color}-300 mt-1`}>{kpi.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── AGPO 30% Statutory Spend Compliance Gauge (PPADA 2015 Sec 53(6)) ── */}
                    <div className="p-6 rounded-3xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-br from-purple-50 via-white to-pink-50/50 dark:from-purple-950/30 dark:via-slate-900 dark:to-pink-950/20 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-100 dark:border-purple-800/40">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">⚖️</span>
                                    <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight">
                                        AGPO 30% Statutory Reservation Compliance Gauge
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        agpoPercentage >= 30 
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                    }`}>
                                        {agpoPercentage >= 30 ? '✅ Statutory Target Achieved' : '⚠️ Below Statutory 30% Target'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Public Procurement and Asset Disposal Act (PPADA 2015 Section 53(6)) mandates at least 30% of public procurement spend to Women, Youth, and PWD enterprises.
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current AGPO Spend Rate</p>
                                <p className={`text-3xl font-black ${agpoPercentage >= 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                    {agpoPercentage.toFixed(1)}%
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">Statutory Minimum: 30.0%</p>
                            </div>
                        </div>

                        {/* Progress Bar with 30% Marker */}
                        <div className="mt-5 space-y-2">
                            <div className="relative w-full h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        agpoPercentage >= 30 
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, agpoPercentage))}%` }}
                                />
                                {/* 30% threshold notch */}
                                <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 shadow-sm"
                                    style={{ left: '30%' }}
                                    title="Mandatory 30% Statutory Marker"
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                <span>0%</span>
                                <span className="text-red-500 font-black">▲ 30% Statutory Requirement</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* AGPO Breakdown Sub-cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5">
                            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Total School Procurement</p>
                                <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">{fmt(totalProcurementSpend)}</p>
                                <p className="text-[10px] text-slate-400">{invoices.length} invoices recorded</p>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-pink-50/70 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-pink-700 dark:text-pink-300 uppercase">👩 Women Enterprises</p>
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-pink-200 dark:bg-pink-900 text-pink-800 dark:text-pink-200 rounded">Cats 02, 04, 35</span>
                                </div>
                                {(() => {
                                    const womenSuppliers = new Set(suppliers.filter(s => (s.agpoCategory || s.agpo_category) === 'women').map(s => s.id));
                                    const womenSpend = invoices.filter(i => womenSuppliers.has(i.supplierId || i.supplier_id)).reduce((s, i) => s + (i.totalAmount || i.total_amount || 0), 0);
                                    return (
                                        <>
                                            <p className="text-base font-black text-pink-700 dark:text-pink-300 mt-0.5">{fmt(womenSpend)}</p>
                                            <p className="text-[10px] text-pink-600 dark:text-pink-400">{totalProcurementSpend > 0 ? ((womenSpend / totalProcurementSpend) * 100).toFixed(1) : 0}% of total spend</p>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase">🧑 Youth Enterprises</p>
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">Cats 23, 24</span>
                                </div>
                                {(() => {
                                    const youthSuppliers = new Set(suppliers.filter(s => (s.agpoCategory || s.agpo_category) === 'youth').map(s => s.id));
                                    const youthSpend = invoices.filter(i => youthSuppliers.has(i.supplierId || i.supplier_id)).reduce((s, i) => s + (i.totalAmount || i.total_amount || 0), 0);
                                    return (
                                        <>
                                            <p className="text-base font-black text-blue-700 dark:text-blue-300 mt-0.5">{fmt(youthSpend)}</p>
                                            <p className="text-[10px] text-blue-600 dark:text-blue-400">{totalProcurementSpend > 0 ? ((youthSpend / totalProcurementSpend) * 100).toFixed(1) : 0}% of total spend</p>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase">♿ PWD Enterprises</p>
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">Cat 10</span>
                                </div>
                                {(() => {
                                    const pwdSuppliers = new Set(suppliers.filter(s => (s.agpoCategory || s.agpo_category) === 'pwd').map(s => s.id));
                                    const pwdSpend = invoices.filter(i => pwdSuppliers.has(i.supplierId || i.supplier_id)).reduce((s, i) => s + (i.totalAmount || i.total_amount || 0), 0);
                                    return (
                                        <>
                                            <p className="text-base font-black text-amber-700 dark:text-amber-300 mt-0.5">{fmt(pwdSpend)}</p>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400">{totalProcurementSpend > 0 ? ((pwdSpend / totalProcurementSpend) * 100).toFixed(1) : 0}% of total spend</p>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* ── Ministry of Education Vote Head Expenditure Distribution ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                🏛️ Ministry of Education Vote Head Expenditure Summary
                            </h3>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Public School Financial Guidelines</span>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        {['Vote Head', 'Categories Covered', 'Invoices', 'Gross Total', 'WHT Deducted', 'Net Paid', 'Balance Owing'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {[
                                        { name: 'B.E.S (Boarding)', cats: '01–07, 11–13, 15', desc: 'Boarding Equipment & Stores' },
                                        { name: 'Tuition', cats: '08, 16', desc: 'Teaching, Lab & Textbooks' },
                                        { name: 'R.M.I', cats: '09, 14, 17, 26', desc: 'Repairs, Maintenance & Improvement' },
                                        { name: 'Operations', cats: '10, 24, 25, 32', desc: 'Sanitation, Fumigation & Hospitality' },
                                        { name: 'Administration', cats: '20–22, 29–31, 33–34', desc: 'Office, Security, Legal & Insurance' },
                                        { name: 'L.T.&T', cats: '18, 19, 36', desc: 'Local Transport & Travel, Fleet & Fuel' },
                                        { name: 'Activity', cats: '27, 35', desc: 'Co-Curricular, Sports & Hire' },
                                        { name: 'Development', cats: '28', desc: 'Capital Infrastructure & Works' },
                                    ].map(vh => {
                                        const vhInvoices = invoices.filter(i => {
                                            const v = i.voteHead || i.vote_head;
                                            return v && v.toLowerCase().includes(vh.name.toLowerCase().split(' ')[0]);
                                        });
                                        const gross = vhInvoices.reduce((s, i) => s + (i.totalAmount || i.total_amount || 0), 0);
                                        const wht = vhInvoices.reduce((s, i) => s + (i.withholdingTaxAmount || i.withholding_tax_amount || 0), 0);
                                        const paid = vhInvoices.reduce((s, i) => s + (i.amountPaid || i.amount_paid || 0), 0);
                                        const owing = vhInvoices.reduce((s, i) => s + (i.balanceOwing || i.balance_owing || ((i.totalAmount || i.total_amount || 0) - (i.amountPaid || i.amount_paid || 0))), 0);
                                        return (
                                            <tr key={vh.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">
                                                    {vh.name}
                                                    <span className="block text-[10px] text-slate-400 font-normal">{vh.desc}</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{vh.cats}</td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-bold">{vhInvoices.length}</td>
                                                <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{fmt(gross)}</td>
                                                <td className="px-4 py-3 text-amber-600 font-bold">{fmt(wht)}</td>
                                                <td className="px-4 py-3 text-emerald-600 font-bold">{fmt(paid)}</td>
                                                <td className={`px-4 py-3 font-black ${owing > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{fmt(owing)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Supplier Owing Report */}
                    <div>
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">📋 Supplier Outstanding Balances</h3>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    <tr>{['Supplier', 'Total Invoiced', 'Total Paid', 'Balance Owing', 'Overdue Invoices', 'Risk'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {suppliers.map(sup => {
                                        const supInvoices = invoices.filter(i => (i.supplierId || i.supplier_id) === sup.id);
                                        const totalInv = supInvoices.reduce((s, i) => s + (i.totalAmount || i.total_amount || 0), 0);
                                        const totalPd = supInvoices.reduce((s, i) => s + (i.amountPaid || i.amount_paid || 0), 0);
                                        const balance = totalInv - totalPd;
                                        const overdueCount = supInvoices.filter(i => { const d = i.dueDate || i.due_date; return d && new Date(d) < new Date() && i.status !== 'paid'; }).length;
                                        return (
                                            <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{sup.name}</td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmt(totalInv)}</td>
                                                <td className="px-4 py-3 text-emerald-600 font-bold">{fmt(totalPd)}</td>
                                                <td className={`px-4 py-3 font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(balance)}</td>
                                                <td className="px-4 py-3">{overdueCount > 0 ? <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-black text-[9px]">{overdueCount} overdue</span> : <span className="text-slate-400">None</span>}</td>
                                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${overdueCount > 0 ? 'bg-rose-100 text-rose-700' : balance > 50000 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{overdueCount > 0 ? '🔴 High' : balance > 50000 ? '🟡 Medium' : '🟢 Low'}</span></td>
                                            </tr>
                                        );
                                    })}
                                    {suppliers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No supplier data yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Invoice Aging Report */}
                    <div>
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">⏰ Invoice Aging Report</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: 'Current (not due)', days: null, max: 0 },
                                { label: '1-30 Days Overdue', days: 30, max: 0 },
                                { label: '31-60 Days', days: 60, max: 31 },
                                { label: '60+ Days', days: null, max: 61 },
                            ].map((bucket, bi) => {
                                const now = new Date();
                                const bucketInvoices = invoices.filter(inv => {
                                    const due = inv.dueDate || inv.due_date;
                                    if (!due || inv.status === 'paid') return false;
                                    const daysOver = Math.floor((now.getTime() - new Date(due).getTime()) / 86400000);
                                    if (bi === 0) return daysOver < 0;
                                    if (bi === 1) return daysOver >= 0 && daysOver <= 30;
                                    if (bi === 2) return daysOver > 30 && daysOver <= 60;
                                    return daysOver > 60;
                                });
                                const total = bucketInvoices.reduce((s, i) => s + ((i.totalAmount || i.total_amount || 0) - (i.amountPaid || i.amount_paid || 0)), 0);
                                const colors = ['emerald', 'amber', 'orange', 'rose'];
                                const c = colors[bi];
                                return (
                                    <div key={bi} className={`p-4 rounded-2xl border bg-${c}-50 dark:bg-${c}-950/30 border-${c}-100 dark:border-${c}-900`}>
                                        <p className={`text-[10px] font-black text-${c}-600 dark:text-${c}-400 uppercase`}>{bucket.label}</p>
                                        <p className={`text-lg font-black text-${c}-700 dark:text-${c}-300 mt-1`}>{fmt(total)}</p>
                                        <p className={`text-[10px] text-${c}-500`}>{bucketInvoices.length} invoices</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* LPO Register */}
                    <div>
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">📄 LPO Register</h3>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    <tr>{['LPO Number', 'Supplier', 'Vote Head', 'Issued Date', 'Amount', 'Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {lpos.map(l => (
                                        <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">{l.lpoNumber || l.lpo_number}</td>
                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{supplierName(l.supplierId || l.supplier_id)}</td>
                                            <td className="px-4 py-3 text-slate-500">{l.voteHead || l.vote_head || 'B.E.S'}</td>
                                            <td className="px-4 py-3 text-slate-500">{l.issuedDate || l.issued_date}</td>
                                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{fmt(l.totalAmount || l.total_amount || 0)}</td>
                                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${STATUS_COLORS[l.status || 'draft']}`}>{l.status || 'draft'}</span></td>
                                        </tr>
                                    ))}
                                    {lpos.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No LPOs issued yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: ADD / EDIT ITEM ══════════════ */}
            {showItemModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-wider text-md">{editItem ? 'Edit Item' : 'Add Inventory Item'}</h3>
                            <button onClick={() => setShowItemModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Item Name *', key: 'name', type: 'text', full: true },
                                    { label: 'Item Code', key: 'itemCode', type: 'text' },
                                    { label: 'Category', key: 'category', type: 'text' },
                                    { label: 'Unit (pcs/kg/ltrs...)', key: 'unit', type: 'text' },
                                    { label: 'Unit Cost (KES)', key: 'unitCost', type: 'number' },
                                    { label: 'Current Stock', key: 'currentStock', type: 'number' },
                                    { label: 'Reorder Level', key: 'reorderLevel', type: 'number' },
                                ].map(f => (
                                    <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{f.label}</label>
                                        <input
                                            type={f.type}
                                            value={(itemForm as any)[f.key] || ''}
                                            onChange={e => setItemForm(p => ({ ...p, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                ))}
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Description</label>
                                    <textarea value={itemForm.description || ''} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowItemModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={saveItem} className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black hover:bg-indigo-700 transition-all shadow-md">Save Item</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: ADD / EDIT SUPPLIER ══════════════ */}
            {showSupplierModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-emerald-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="font-black uppercase tracking-wider text-md">{editSupplier ? 'Edit Supplier / Bidder' : 'Register Supplier / Tender Bidder'}</h3>
                                <p className="text-[10px] text-emerald-100">Kanga High School Pre-qualification & AGPO Compliance</p>
                            </div>
                            <button onClick={() => setShowSupplierModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
                            {/* Section 1: Basic Information */}
                            <div>
                                <h4 className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider mb-2">1. Company & Contact Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Company / Business Name *</label>
                                        <input value={supplierForm.name || ''} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Migori Fresh Supplies Ltd" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Contact Person</label>
                                        <input value={supplierForm.contactPerson || ''} onChange={e => setSupplierForm(p => ({ ...p, contactPerson: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Phone Number *</label>
                                        <input value={supplierForm.phone || ''} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. 0712345678" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                                        <input type="email" value={supplierForm.email || ''} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Postal / Physical Address</label>
                                        <input value={supplierForm.address || ''} onChange={e => setSupplierForm(p => ({ ...p, address: e.target.value }))} placeholder="e.g. P.O. Box 45, Rongo" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Tender Category & Ref */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                                <h4 className="text-[11px] font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider">2. Tender Category & Prequalification</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Pre-qualification Category (36 MOE Standard Categories)</label>
                                        <select 
                                            value={supplierForm.tenderCategoryNo || '01'} 
                                            onChange={e => {
                                                const cat = KENYAN_MOE_TENDER_CATEGORIES.find(c => c.categoryNo === e.target.value);
                                                setSupplierForm(p => ({ 
                                                    ...p, 
                                                    tenderCategoryNo: e.target.value, 
                                                    category: e.target.value,
                                                    notes: p.notes || cat?.title || ''
                                                }));
                                            }}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {KENYAN_MOE_TENDER_CATEGORIES.map(c => (
                                                <option key={c.categoryNo} value={c.categoryNo}>
                                                    Cat {c.categoryNo}: {c.title} [{c.eligibility} • {c.voteHead}]
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Tender Reference No.</label>
                                        <input value={supplierForm.tenderRef || 'KHS/REG/001/2026/2027'} onChange={e => setSupplierForm(p => ({ ...p, tenderRef: e.target.value }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Pre-qualification Status</label>
                                        <select value={supplierForm.prequalificationStatus || 'pending'} onChange={e => setSupplierForm(p => ({ ...p, prequalificationStatus: e.target.value as any }))} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none">
                                            <option value="pending">🟡 Pending Evaluation</option>
                                            <option value="prequalified">🟢 Pre-qualified (Approved)</option>
                                            <option value="disqualified">🔴 Disqualified / Unsuccessful</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: AGPO Statutory Reservation */}
                            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-black uppercase text-purple-700 dark:text-purple-300 tracking-wider">3. AGPO Statutory Reservation (PPADA 2015)</h4>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={!!supplierForm.isAgpo} onChange={e => setSupplierForm(p => ({ ...p, isAgpo: e.target.checked, agpoCategory: e.target.checked ? (p.agpoCategory === 'none' ? 'women' : p.agpoCategory) : 'none' }))} className="rounded text-purple-600 focus:ring-purple-500" />
                                        <span className="text-xs font-black text-purple-800 dark:text-purple-300">Is AGPO Registered Enterprise?</span>
                                    </label>
                                </div>
                                {supplierForm.isAgpo && (
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-purple-100 dark:border-purple-800/40">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 mb-1">AGPO Target Group</label>
                                            <select value={supplierForm.agpoCategory || 'women'} onChange={e => setSupplierForm(p => ({ ...p, agpoCategory: e.target.value as any }))} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold outline-none">
                                                <option value="women">👩 Women Enterprise</option>
                                                <option value="youth">🧑 Youth Enterprise</option>
                                                <option value="pwd">♿ Persons with Disabilities (PWD)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 mb-1">AGPO Certificate Number</label>
                                            <input value={supplierForm.agpoCertNumber || ''} onChange={e => setSupplierForm(p => ({ ...p, agpoCertNumber: e.target.value }))} placeholder="e.g. AGPO/2026/89431" className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-mono outline-none" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section 4: Mandatory Legal & Statutory Compliance */}
                            <div>
                                <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2">4. Mandatory Statutory Compliance (Form 1)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">KRA PIN Number *</label>
                                        <input value={supplierForm.kraPin || ''} onChange={e => setSupplierForm(p => ({ ...p, kraPin: e.target.value.toUpperCase() }))} placeholder="e.g. P051234567Z" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Tax Compliance Cert (TCC) No.</label>
                                        <input value={supplierForm.taxComplianceCert || ''} onChange={e => setSupplierForm(p => ({ ...p, taxComplianceCert: e.target.value }))} placeholder="e.g. KRAMS09384812" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Single Business Permit No.</label>
                                        <input value={supplierForm.businessPermitNo || ''} onChange={e => setSupplierForm(p => ({ ...p, businessPermitNo: e.target.value }))} placeholder="e.g. MIGORI/SBP/2026/0491" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">NCA Registration No. (if works)</label>
                                        <input value={supplierForm.ncaRegNo || ''} onChange={e => setSupplierForm(p => ({ ...p, ncaRegNo: e.target.value }))} placeholder="e.g. NCA-7/BUILDING/29481" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Financial Capability & Banker (Form 5) */}
                            <div>
                                <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2">5. Financial Capability & Banking (Form 5)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Credit Period Offered (Days)</label>
                                        <select value={supplierForm.creditPeriodDays || 30} onChange={e => setSupplierForm(p => ({ ...p, creditPeriodDays: parseInt(e.target.value) || 30 }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none">
                                            <option value={30}>30 Days Credit (Standard)</option>
                                            <option value={60}>60 Days Credit</option>
                                            <option value={90}>90 Days Credit (Preferred for Boarding)</option>
                                            <option value={14}>14 Days Credit</option>
                                            <option value={0}>Cash on Delivery (No Credit)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Estimated Annual Turnover (KES)</label>
                                        <input type="number" value={supplierForm.annualTurnover || ''} onChange={e => setSupplierForm(p => ({ ...p, annualTurnover: parseFloat(e.target.value) || 0 }))} placeholder="e.g. 2500000" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bank Name</label>
                                        <input value={supplierForm.bankName || ''} onChange={e => setSupplierForm(p => ({ ...p, bankName: e.target.value }))} placeholder="e.g. KCB Bank Kenya" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bank Account Number</label>
                                        <input value={supplierForm.bankAccount || ''} onChange={e => setSupplierForm(p => ({ ...p, bankAccount: e.target.value }))} placeholder="e.g. 1102938475" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bank Branch</label>
                                        <input value={supplierForm.bankBranch || ''} onChange={e => setSupplierForm(p => ({ ...p, bankBranch: e.target.value }))} placeholder="e.g. Rongo Branch" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3 pt-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={!!supplierForm.tenderFeePaid} onChange={e => setSupplierForm(p => ({ ...p, tenderFeePaid: e.target.checked }))} className="rounded text-emerald-600 focus:ring-emerald-500" />
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Tender Fee Paid (KES 1,000)?</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Section 6: Rating & Notes */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Performance Rating (1–5 Stars)</label>
                                    <div className="flex gap-2">
                                        {[1,2,3,4,5].map(star => (
                                            <button key={star} type="button" onClick={() => setSupplierForm(p => ({ ...p, rating: star }))} className={`text-2xl transition-all ${(supplierForm.rating || 3) >= star ? 'opacity-100' : 'opacity-30'}`}>⭐</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Evaluation & General Notes</label>
                                    <textarea value={supplierForm.notes || ''} onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowSupplierModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={saveSupplier} className="px-8 py-2.5 bg-emerald-600 text-white rounded-2xl text-[11px] font-black hover:bg-emerald-700 transition-all shadow-md">Save Supplier / Bidder</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: CREATE / EDIT LPO ══════════════ */}
            {showLPOModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-blue-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="font-black uppercase tracking-wider text-md">{editLPO ? 'Edit LPO' : 'Create Local Purchase Order (L.P.O.)'}</h3>
                                <p className="text-[10px] text-blue-100">Republic of Kenya Ministry of Education Standard Form</p>
                            </div>
                            <button onClick={() => setShowLPOModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">LPO Number *</label>
                                    <input value={lpoForm.lpoNumber || ''} onChange={e => setLpoForm(p => ({ ...p, lpoNumber: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Supplier / Contractor *</label>
                                    <select value={lpoForm.supplierId || ''} onChange={e => setLpoForm(p => ({ ...p, supplierId: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">— Select Supplier —</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} {s.isAgpo ? `[AGPO - ${s.agpoCategory}]` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Ministry of Education Vote Head *</label>
                                    <select 
                                        value={lpoForm.voteHead || 'B.E.S (Boarding)'} 
                                        onChange={e => setLpoForm(p => ({ ...p, voteHead: e.target.value as any }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="B.E.S (Boarding)">B.E.S (Boarding Equipment & Stores)</option>
                                        <option value="Tuition">Tuition (Teaching, Labs & Textbooks)</option>
                                        <option value="R.M.I">R.M.I (Repairs, Maintenance & Improvement)</option>
                                        <option value="Operations">Operations (Sanitation, Fumigation & Fuel)</option>
                                        <option value="Administration">Administration (Office, Security, Legal & Insurance)</option>
                                        <option value="L.T.&T">L.T.&T (Local Transport & Travel, Fleet)</option>
                                        <option value="Activity">Activity (Sports & Co-curricular)</option>
                                        <option value="Development">Development (Capital Projects)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Tender Category</label>
                                    <select 
                                        value={lpoForm.tenderCategoryNo || '01'} 
                                        onChange={e => {
                                            const cat = KENYAN_MOE_TENDER_CATEGORIES.find(c => c.categoryNo === e.target.value);
                                            setLpoForm(p => ({ 
                                                ...p, 
                                                tenderCategoryNo: e.target.value,
                                                voteHead: cat?.voteHead || p.voteHead
                                            }));
                                        }}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {KENYAN_MOE_TENDER_CATEGORIES.map(c => (
                                            <option key={c.categoryNo} value={c.categoryNo}>
                                                Cat {c.categoryNo}: {c.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Issue Date</label>
                                    <input type="date" value={lpoForm.issuedDate || ''} onChange={e => setLpoForm(p => ({ ...p, issuedDate: e.target.value }))} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Expected Delivery Date</label>
                                    <input type="date" value={lpoForm.expectedDeliveryDate || ''} onChange={e => setLpoForm(p => ({ ...p, expectedDeliveryDate: e.target.value }))} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Delivery Address / Stores Location</label>
                                    <input value={lpoForm.deliveryAddress || ''} onChange={e => setLpoForm(p => ({ ...p, deliveryAddress: e.target.value }))} placeholder={`e.g. ${institution.name} Central Stores, Main Campus`} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>

                            {/* Line items */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Order Line Items</p>
                                <div className="flex gap-2 flex-wrap">
                                    <input placeholder="Item name / specification" value={lpoLineItem.name} onChange={e => setLpoLineItem(p => ({ ...p, name: e.target.value }))} className="flex-1 min-w-[140px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                    <input type="number" placeholder="Qty" value={lpoLineItem.quantity} onChange={e => setLpoLineItem(p => ({ ...p, quantity: parseFloat(e.target.value) || 1 }))} className="w-16 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                    <input placeholder="Unit" value={lpoLineItem.unit} onChange={e => setLpoLineItem(p => ({ ...p, unit: e.target.value }))} className="w-16 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                    <input type="number" placeholder="Unit Cost" value={lpoLineItem.unitCost} onChange={e => setLpoLineItem(p => ({ ...p, unitCost: parseFloat(e.target.value) || 0 }))} className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                    <button onClick={addLpoLine} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all">+ Add Item</button>
                                </div>
                                {(lpoForm.items || []).length > 0 && (
                                    <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-black uppercase text-[10px]">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Item</th>
                                                    <th className="px-3 py-2 text-right">Qty</th>
                                                    <th className="px-3 py-2 text-right">Unit</th>
                                                    <th className="px-3 py-2 text-right">Unit Cost</th>
                                                    <th className="px-3 py-2 text-right">Total</th>
                                                    <th className="px-3 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {(lpoForm.items || []).map((line, i) => (
                                                    <tr key={i}>
                                                        <td className="px-3 py-2 font-bold">{line.name}</td>
                                                        <td className="px-3 py-2 text-right font-mono">{line.quantity}</td>
                                                        <td className="px-3 py-2 text-right">{line.unit}</td>
                                                        <td className="px-3 py-2 text-right font-mono">{fmt(line.unitCost)}</td>
                                                        <td className="px-3 py-2 text-right font-bold font-mono">{fmt(line.total)}</td>
                                                        <td className="px-3 py-2 text-center"><button onClick={() => setLpoForm(f => ({ ...f, items: (f.items || []).filter((_, idx) => idx !== i) }))} className="text-rose-500 hover:text-rose-700 font-black">✕</button></td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-50 dark:bg-slate-800 font-bold">
                                                    <td colSpan={4} className="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Subtotal (excl. 16% VAT)</td>
                                                    <td className="px-3 py-2 text-right font-mono">{fmt((lpoForm.items || []).reduce((s, i) => s + i.total, 0))}</td>
                                                    <td></td>
                                                </tr>
                                                <tr className="bg-slate-50 dark:bg-slate-800 font-black">
                                                    <td colSpan={4} className="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Total (incl. 16% VAT)</td>
                                                    <td className="px-3 py-2 text-right text-blue-700 dark:text-blue-300 font-mono text-sm">{fmt((lpoForm.items || []).reduce((s, i) => s + i.total, 0) * 1.16)}</td>
                                                    <td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Notes / Special Instructions</label>
                                <textarea value={lpoForm.notes || ''} onChange={e => setLpoForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowLPOModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={saveLPO} className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black hover:bg-blue-700 transition-all shadow-md">Save LPO</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: RECORD / EDIT INVOICE ══════════════ */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-amber-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="font-black uppercase tracking-wider text-md">{editInvoice ? 'Edit Invoice / Payment' : 'Record Supplier Invoice'}</h3>
                                <p className="text-[10px] text-amber-100">KRA Statutory Withholding Tax (WHT) & P2P Finance Workflow</p>
                            </div>
                            <button onClick={() => setShowInvoiceModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Invoice Number *</label>
                                    <input value={invoiceForm.invoiceNumber || ''} onChange={e => setInvoiceForm(p => ({ ...p, invoiceNumber: e.target.value }))} placeholder="e.g. INV-2026-089" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Supplier *</label>
                                    <select value={invoiceForm.supplierId || ''} onChange={e => setInvoiceForm(p => ({ ...p, supplierId: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500">
                                        <option value="">— Select Supplier —</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Linked LPO (optional)</label>
                                    <select value={invoiceForm.lpoId || ''} onChange={e => setInvoiceForm(p => ({ ...p, lpoId: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none">
                                        <option value="">— No LPO —</option>
                                        {lpos.map(l => <option key={l.id} value={l.id}>{l.lpoNumber || l.lpo_number}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Ministry of Education Vote Head</label>
                                    <select 
                                        value={invoiceForm.voteHead || 'B.E.S (Boarding)'} 
                                        onChange={e => setInvoiceForm(p => ({ ...p, voteHead: e.target.value as any }))}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                                    >
                                        <option value="B.E.S (Boarding)">B.E.S (Boarding)</option>
                                        <option value="Tuition">Tuition</option>
                                        <option value="R.M.I">R.M.I</option>
                                        <option value="Operations">Operations</option>
                                        <option value="Administration">Administration</option>
                                        <option value="L.T.&T">L.T.&T</option>
                                        <option value="Activity">Activity</option>
                                        <option value="Development">Development</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Invoice Date</label>
                                    <input type="date" value={invoiceForm.invoiceDate || ''} onChange={e => setInvoiceForm(p => ({ ...p, invoiceDate: e.target.value }))} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Due Date</label>
                                    <input type="date" value={invoiceForm.dueDate || ''} onChange={e => setInvoiceForm(p => ({ ...p, dueDate: e.target.value }))} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Gross Invoice Total (KES) *</label>
                                    <input type="number" value={invoiceForm.totalAmount || ''} onChange={e => setInvoiceForm(p => ({ ...p, totalAmount: parseFloat(e.target.value) || 0 }))} placeholder="e.g. 150000" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>

                                {/* KRA Statutory Withholding Tax Section */}
                                <div className="col-span-2 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                                            🇰🇪 KRA Statutory Withholding Tax (WHT) Deductions
                                        </h4>
                                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">Public School as Withholding Agent</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Withholding Tax (WHT Rate)</label>
                                            <select 
                                                value={invoiceForm.withholdingTaxRate || 0} 
                                                onChange={e => {
                                                    const rate = parseFloat(e.target.value) || 0;
                                                    const gross = invoiceForm.totalAmount || 0;
                                                    const subtotal = invoiceForm.amount || (gross / 1.16);
                                                    const wht = subtotal * (rate / 100);
                                                    const whvat = invoiceForm.withholdingVatAmount || 0;
                                                    setInvoiceForm(p => ({
                                                        ...p,
                                                        withholdingTaxRate: rate,
                                                        withholdingTaxAmount: wht,
                                                        netPayableAmount: gross - wht - whvat
                                                    }));
                                                }}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-xl text-xs font-bold outline-none"
                                            >
                                                <option value={0}>0% - Exempt / None</option>
                                                <option value={3}>3% - Supply of Goods / Foodstuffs</option>
                                                <option value={5}>5% - Supply of Services / Maintenance</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Withholding VAT (WHVAT 2%)</label>
                                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={(invoiceForm.withholdingVatAmount || 0) > 0} 
                                                    onChange={e => {
                                                        const gross = invoiceForm.totalAmount || 0;
                                                        const subtotal = invoiceForm.amount || (gross / 1.16);
                                                        const whvat = e.target.checked ? (subtotal * 0.02) : 0;
                                                        const wht = invoiceForm.withholdingTaxAmount || 0;
                                                        setInvoiceForm(p => ({
                                                            ...p,
                                                            withholdingVatAmount: whvat,
                                                            netPayableAmount: gross - wht - whvat
                                                        }));
                                                    }} 
                                                    className="rounded text-amber-600 focus:ring-amber-500" 
                                                />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Deduct 2% WHVAT</span>
                                            </label>
                                        </div>
                                    </div>
                                    {/* Live Net Computation Pill */}
                                    {(() => {
                                        const gross = invoiceForm.totalAmount || 0;
                                        const subtotal = invoiceForm.amount || (gross / 1.16);
                                        const wht = subtotal * ((invoiceForm.withholdingTaxRate || 0) / 100);
                                        const whvat = invoiceForm.withholdingVatAmount || 0;
                                        const net = gross - wht - whvat;
                                        return (
                                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/60 flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="text-slate-400 font-bold block text-[9px] uppercase">WHT Deducted: {fmt(wht)} • WHVAT: {fmt(whvat)}</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">Net Payable to Supplier:</span>
                                                </div>
                                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{fmt(net)}</span>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Amount Paid (KES)</label>
                                    <input type="number" value={invoiceForm.amountPaid || ''} onChange={e => setInvoiceForm(p => ({ ...p, amountPaid: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Payment Method</label>
                                    <select value={invoiceForm.paymentMethod || 'Bank Transfer'} onChange={e => setInvoiceForm(p => ({ ...p, paymentMethod: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none">
                                        {['Bank Transfer', 'Cheque', 'M-Pesa', 'Cash', 'EFT', 'RTGS'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Payment Reference</label>
                                    <input value={invoiceForm.paymentReference || ''} onChange={e => setInvoiceForm(p => ({ ...p, paymentReference: e.target.value }))} placeholder="e.g. CHEQUE #00492 or EFT REF" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Payment Date</label>
                                    <input type="date" value={invoiceForm.paymentDate || ''} onChange={e => setInvoiceForm(p => ({ ...p, paymentDate: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Notes</label>
                                    <textarea value={invoiceForm.notes || ''} onChange={e => setInvoiceForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowInvoiceModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={saveInvoice} className="px-8 py-2.5 bg-amber-600 text-white rounded-2xl text-[11px] font-black hover:bg-amber-700 transition-all shadow-md">Save Invoice</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: NEW REQUISITION ══════════════ */}
            {showReqModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-purple-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-wider text-md">New Purchase Requisition</h3>
                            <button onClick={() => setShowReqModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Title / Purpose *</label>
                                    <input value={reqForm.title || ''} onChange={e => setReqForm((p: any) => ({ ...p, title: e.target.value }))} placeholder="e.g. Purchase of Office Stationery Q3 2026" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Priority</label>
                                    <select value={reqForm.priority || 'normal'} onChange={e => setReqForm((p: any) => ({ ...p, priority: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500">
                                        {['normal', 'high', 'urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Est. Amount (KES)</label>
                                    <input type="number" value={reqForm.totalAmount || ''} onChange={e => setReqForm((p: any) => ({ ...p, totalAmount: parseFloat(e.target.value) || 0 }))} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Notes / Justification</label>
                                    <textarea value={reqForm.notes || ''} onChange={e => setReqForm((p: any) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowReqModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={async () => {
                                await apiService.saveModuleRecord('requisitions', { ...reqForm, institution_id: institution.id, institutionId: institution.id, requested_by: currentUser?.name || currentUser?.id, requestedBy: currentUser?.name || currentUser?.id, requested_date: new Date().toISOString().split('T')[0], requestedDate: new Date().toISOString().split('T')[0], status: 'pending', total_amount: reqForm.totalAmount, totalAmount: reqForm.totalAmount });
                                setShowReqModal(false); setReqForm(emptyReq()); load();
                            }} className="px-8 py-2.5 bg-purple-600 text-white rounded-2xl text-[11px] font-black hover:bg-purple-700 transition-all shadow-md">Submit Requisition</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: OFFICIAL PRINTABLE LPO WITH KENYAN STAMP ══════════════ */}
            {selectedLpoForPrint && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white text-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 my-8">
                        {/* Top Toolbar */}
                        <div className="px-8 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🖨️</span>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-wider">Official Local Purchase Order (L.P.O.)</h3>
                                    <p className="text-[10px] text-slate-400 font-mono">{selectedLpoForPrint.lpoNumber || selectedLpoForPrint.lpo_number}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => window.print()} 
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2"
                                >
                                    <span>🖨️</span> Print / Save PDF
                                </button>
                                <button 
                                    onClick={() => setSelectedLpoForPrint(null)} 
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>

                        {/* Document Body (Printable LPO Document) */}
                        <div className="p-10 space-y-6 bg-white text-slate-900 printable-lpo">
                            {/* Header */}
                            <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Republic of Kenya • Ministry of Education</p>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">State Department for Basic Education</p>
                                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950 font-serif">
                                    {institution.name || 'KANGA HIGH SCHOOL'}
                                </h1>
                                <p className="text-xs text-slate-600">
                                    P.O. Box {institution.address || 'PRIVATE BAG - 40404, RONGO'}, Kenya • Email: {institution.email || 'info@school.ac.ke'}
                                </p>
                                <div className="inline-block mt-2 px-6 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-full">
                                    LOCAL PURCHASE ORDER (L.P.O.)
                                </div>
                            </div>

                            {/* Metadata Row */}
                            <div className="grid grid-cols-2 gap-6 text-xs">
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Order Placed To (Supplier / Contractor):</p>
                                    <p className="text-sm font-black text-slate-900">{supplierName(selectedLpoForPrint.supplierId || selectedLpoForPrint.supplier_id)}</p>
                                    {(() => {
                                        const sup = suppliers.find(s => s.id === (selectedLpoForPrint.supplierId || selectedLpoForPrint.supplier_id));
                                        return (
                                            <div className="space-y-0.5 text-slate-600">
                                                <p><strong>KRA PIN:</strong> {sup?.kraPin || 'N/A'}</p>
                                                <p><strong>Address:</strong> {sup?.address || 'N/A'}</p>
                                                <p><strong>Phone:</strong> {sup?.phone || 'N/A'}</p>
                                                {sup?.bankName && <p><strong>Bank:</strong> {sup.bankName} - A/C {sup.bankAccount}</p>}
                                                {sup?.isAgpo && <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[9px] font-black uppercase">AGPO Registered ({sup.agpoCategory})</span>}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Order & Vote Head Reference:</p>
                                    <p><strong>LPO Number:</strong> <span className="font-mono font-black text-blue-700">{selectedLpoForPrint.lpoNumber || selectedLpoForPrint.lpo_number}</span></p>
                                    <p><strong>Issued Date:</strong> {selectedLpoForPrint.issuedDate || selectedLpoForPrint.issued_date}</p>
                                    <p><strong>Expected Delivery:</strong> {selectedLpoForPrint.expectedDeliveryDate || selectedLpoForPrint.expected_delivery_date || 'Prompt'}</p>
                                    <p><strong>Vote Head:</strong> <span className="font-bold text-slate-900">{selectedLpoForPrint.voteHead || selectedLpoForPrint.vote_head || 'B.E.S (Boarding)'}</span></p>
                                    <p><strong>Tender Reference:</strong> {selectedLpoForPrint.tenderRef || selectedLpoForPrint.tender_ref || 'KHS/REG/001/2026/2027'} (Cat {selectedLpoForPrint.tenderCategoryNo || selectedLpoForPrint.tender_category_no || '01'})</p>
                                    <p><strong>Delivery Location:</strong> {selectedLpoForPrint.deliveryAddress || `${institution.name} Central Stores`}</p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="border border-slate-300 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-black text-[10px]">
                                        <tr>
                                            <th className="px-3 py-2.5 text-center w-12">Item</th>
                                            <th className="px-4 py-2.5 text-left">Description / Specification of Goods or Services</th>
                                            <th className="px-3 py-2.5 text-center w-20">Unit</th>
                                            <th className="px-3 py-2.5 text-right w-20">Qty</th>
                                            <th className="px-4 py-2.5 text-right w-28">Unit Price (KES)</th>
                                            <th className="px-4 py-2.5 text-right w-32">Total Price (KES)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {(selectedLpoForPrint.items || []).map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="px-3 py-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                                                <td className="px-4 py-2.5 font-bold text-slate-800">{item.name}</td>
                                                <td className="px-3 py-2.5 text-center text-slate-600">{item.unit || 'pcs'}</td>
                                                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">{item.quantity}</td>
                                                <td className="px-4 py-2.5 text-right font-mono text-slate-700">{fmt(item.unitCost)}</td>
                                                <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{fmt(item.total)}</td>
                                            </tr>
                                        ))}
                                        {(selectedLpoForPrint.items || []).length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No items specified on this LPO.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
                                        <tr>
                                            <td colSpan={5} className="px-4 py-2 text-right uppercase text-[10px] text-slate-600">Subtotal</td>
                                            <td className="px-4 py-2 text-right font-mono">{fmt(selectedLpoForPrint.subtotal || (selectedLpoForPrint.totalAmount ? selectedLpoForPrint.totalAmount / 1.16 : 0))}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={5} className="px-4 py-2 text-right uppercase text-[10px] text-slate-600">Value Added Tax (16% VAT if applicable)</td>
                                            <td className="px-4 py-2 text-right font-mono">{fmt(selectedLpoForPrint.taxAmount || (selectedLpoForPrint.totalAmount ? (selectedLpoForPrint.totalAmount / 1.16) * 0.16 : 0))}</td>
                                        </tr>
                                        <tr className="bg-slate-100 text-sm">
                                            <td colSpan={5} className="px-4 py-3 text-right uppercase font-black text-slate-900">Grand Total Payable (KES)</td>
                                            <td className="px-4 py-3 text-right font-mono font-black text-slate-950">{fmt(selectedLpoForPrint.totalAmount || selectedLpoForPrint.total_amount || 0)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Terms & Conditions */}
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-[11px] text-slate-600 space-y-1">
                                <p className="font-bold text-slate-800 uppercase text-[10px]">Statutory Conditions of Order:</p>
                                <ol className="list-decimal pl-4 space-y-0.5">
                                    <li>Goods delivered must strictly comply with KEBS standards, public health regulations, and tender specifications.</li>
                                    <li>An official delivery note and duplicate invoice quoting this LPO number must accompany every consignment.</li>
                                    <li>Withholding Tax (3% Goods / 5% Services) will be deducted at source in compliance with KRA Section 35 of the Income Tax Act.</li>
                                </ol>
                            </div>

                            {/* Authorizations and Kenyan Official Stamp */}
                            <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-6 items-end">
                                {/* Commitment */}
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">1. Vote Book Commitment</p>
                                        <p className="text-[10px] text-slate-600 mt-1">
                                            Funds certified available in Vote Head: <strong>{selectedLpoForPrint.voteHead || selectedLpoForPrint.vote_head || 'B.E.S'}</strong>
                                        </p>
                                    </div>
                                    <div className="pt-8 border-b border-dashed border-slate-400"></div>
                                    <p className="text-[10px] font-bold text-slate-700">School Bursar / Finance Officer</p>
                                </div>

                                {/* Official Rubber Stamp */}
                                <div className="flex flex-col items-center justify-center p-2">
                                    <KenyanOfficialStamp 
                                        institution={institution} 
                                        departmentOverride="PROCUREMENT & STORES" 
                                        size={135} 
                                    />
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1 text-center">
                                        Official School Store Stamp
                                    </p>
                                </div>

                                {/* Head of Institution Approval */}
                                <div className="space-y-4 text-right">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">2. Accounting Officer Approval</p>
                                        <p className="text-[10px] text-slate-600 mt-1">
                                            Approved under PPADA 2015 authority
                                        </p>
                                    </div>
                                    <div className="pt-8 border-b border-dashed border-slate-400"></div>
                                    <p className="text-[10px] font-bold text-slate-700">Principal / Head of Institution</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: RECORD TENDER DOCUMENT PURCHASE FEE ══════════════ */}
            {showTenderFeeModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-amber-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="font-black uppercase tracking-wider text-md">Record Tender Document Purchase Fee</h3>
                                <p className="text-[10px] text-amber-100">Appropriation-in-Aid (A.I.A.) Revenue • PPADA 2015 Sec 72</p>
                            </div>
                            <button onClick={() => setShowTenderFeeModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                                💡 All prospective bidders purchasing non-refundable pre-qualification tender documents pay KES 1,000 per category into the school accounts.
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bidder / Company Name *</label>
                                    <input 
                                        value={tenderFeeForm.bidderName} 
                                        onChange={e => setTenderFeeForm(p => ({ ...p, bidderName: e.target.value }))} 
                                        placeholder="e.g. Migori Agro Supplies Ltd" 
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">KRA PIN</label>
                                        <input 
                                            value={tenderFeeForm.kraPin} 
                                            onChange={e => setTenderFeeForm(p => ({ ...p, kraPin: e.target.value.toUpperCase() }))} 
                                            placeholder="e.g. P051234567Z" 
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Phone Number</label>
                                        <input 
                                            value={tenderFeeForm.phone} 
                                            onChange={e => setTenderFeeForm(p => ({ ...p, phone: e.target.value }))} 
                                            placeholder="e.g. 0712345678" 
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Tender Category Purchased</label>
                                    <select 
                                        value={tenderFeeForm.categoryNo} 
                                        onChange={e => setTenderFeeForm(p => ({ ...p, categoryNo: e.target.value }))} 
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        {KENYAN_MOE_TENDER_CATEGORIES.map(c => (
                                            <option key={c.categoryNo} value={c.categoryNo}>
                                                Cat {c.categoryNo}: {c.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Payment Method</label>
                                        <select 
                                            value={tenderFeeForm.paymentMode} 
                                            onChange={e => setTenderFeeForm(p => ({ ...p, paymentMode: e.target.value }))} 
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                                        >
                                            {['M-Pesa', 'Bank Deposit / Paybill', 'Cash', 'Direct Transfer'].map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Reference / M-Pesa Code</label>
                                        <input 
                                            value={tenderFeeForm.referenceNo} 
                                            onChange={e => setTenderFeeForm(p => ({ ...p, referenceNo: e.target.value.toUpperCase() }))} 
                                            placeholder="e.g. SLK8928392" 
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none" 
                                        />
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500">Document Fee Payable:</span>
                                    <span className="text-base font-black text-amber-600">KES 1,000.00</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowTenderFeeModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={handleSaveTenderFee} className="px-8 py-2.5 bg-amber-600 text-white rounded-2xl text-[11px] font-black hover:bg-amber-700 transition-all shadow-md">Record & Issue Official Receipt</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: PRINTABLE OFFICIAL TENDER FEE RECEIPT WITH STAMP ══════════════ */}
            {tenderFeeReceiptPrint && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white text-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 my-8">
                        {/* Top Toolbar */}
                        <div className="px-8 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
                            <div className="flex items-center gap-2">
                                <span>🧾</span>
                                <h3 className="font-black text-sm uppercase tracking-wider">Official Tender Purchase Receipt</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => window.print()} 
                                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-md"
                                >
                                    🖨️ Print Receipt
                                </button>
                                <button 
                                    onClick={() => setTenderFeeReceiptPrint(null)} 
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>

                        {/* Receipt Body */}
                        <div className="p-8 space-y-5 bg-white text-slate-900">
                            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Republic of Kenya • Ministry of Education</p>
                                <h2 className="text-xl font-black uppercase text-slate-950 font-serif">{institution.name || 'KANGA HIGH SCHOOL'}</h2>
                                <p className="text-[11px] text-slate-600">P.O. Box {institution.address || 'PRIVATE BAG, RONGO'}</p>
                                <div className="inline-block mt-1 px-4 py-0.5 bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                                    OFFICIAL TENDER DOCUMENT RECEIPT (A.I.A.)
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                                <div>
                                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Receipt Number</span>
                                    <span className="font-mono font-black text-amber-700 text-sm">{tenderFeeReceiptPrint.receiptNo}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Date of Issue</span>
                                    <span className="font-bold">{tenderFeeReceiptPrint.date}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span className="text-slate-500 font-bold">Received From:</span>
                                    <span className="font-black text-slate-900">{tenderFeeReceiptPrint.bidderName}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span className="text-slate-500 font-bold">KRA PIN Number:</span>
                                    <span className="font-mono font-bold">{tenderFeeReceiptPrint.kraPin || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span className="text-slate-500 font-bold">Tender Reference:</span>
                                    <span className="font-mono font-bold text-slate-700">{tenderFeeReceiptPrint.tenderRef}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span className="text-slate-500 font-bold">Category Purchased:</span>
                                    <span className="font-bold text-slate-900 text-right max-w-[260px]">
                                        Cat {tenderFeeReceiptPrint.categoryNo}: {tenderFeeReceiptPrint.categoryTitle}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span className="text-slate-500 font-bold">Payment Method & Ref:</span>
                                    <span className="font-mono font-bold">{tenderFeeReceiptPrint.paymentMode} ({tenderFeeReceiptPrint.referenceNo})</span>
                                </div>
                                <div className="flex justify-between py-2 border-t-2 border-slate-900 bg-amber-50/50 px-3 rounded-xl">
                                    <span className="text-sm font-black text-slate-900 uppercase">Amount Received:</span>
                                    <span className="text-base font-black text-amber-700 font-mono">KES {tenderFeeReceiptPrint.amount.toLocaleString()}.00</span>
                                </div>
                                <p className="text-[10px] text-slate-500 italic text-center">
                                    Amount in words: One Thousand Kenya Shillings Only (Non-refundable fee)
                                </p>
                            </div>

                            {/* Stamp & Signature Footer */}
                            <div className="pt-4 border-t-2 border-slate-900 flex items-center justify-between">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Cashier / Bursar:</p>
                                    <p className="text-xs font-bold text-slate-800">{tenderFeeReceiptPrint.receivedBy}</p>
                                    <div className="w-32 border-b border-slate-400 pt-4"></div>
                                    <p className="text-[9px] text-slate-400">Authorized Signature</p>
                                </div>
                                <div>
                                    <KenyanOfficialStamp 
                                        institution={institution} 
                                        departmentOverride="ACCOUNTS & REVENUE" 
                                        size={120} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: PRE-QUALIFICATION EVALUATION SHEET (FORM 5) ══════════════ */}
            {showEvaluationModal && evaluatingSupplier && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="font-black uppercase tracking-wider text-md">Bidder Pre-qualification Evaluation Sheet</h3>
                                <p className="text-[10px] text-indigo-100">Kanga High School 2026/2027 Tender Evaluation (Form 5 — 80% Threshold)</p>
                            </div>
                            <button onClick={() => setShowEvaluationModal(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-xl">✕</button>
                        </div>
                        <div className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
                            {/* Bidder Banner */}
                            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
                                <div>
                                    <p className="text-base font-black text-indigo-950 dark:text-indigo-200">{evaluatingSupplier.name}</p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-400">
                                        PIN: {evaluatingSupplier.kraPin || 'N/A'} • Cat {evaluatingSupplier.tenderCategoryNo || '01'} ({KENYAN_MOE_TENDER_CATEGORIES.find(c => c.categoryNo === evaluatingSupplier.tenderCategoryNo)?.title || 'Supply'})
                                    </p>
                                </div>
                                {evaluatingSupplier.isAgpo && (
                                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-black uppercase">
                                        AGPO: {evaluatingSupplier.agpoCategory}
                                    </span>
                                )}
                            </div>

                            {/* Section A: Mandatory Evaluation (Pass/Fail) */}
                            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Section A: Preliminary Mandatory Evaluation (Pass / Fail)
                                    </h4>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={evaluationScores.mandatoryPassed} 
                                            onChange={e => setEvaluationScores(p => ({ ...p, mandatoryPassed: e.target.checked }))} 
                                            className="rounded text-indigo-600 focus:ring-indigo-500" 
                                        />
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                            {evaluationScores.mandatoryPassed ? '✅ Mandatory Requirements Passed' : '❌ Mandatory Requirements Failed'}
                                        </span>
                                    </label>
                                </div>
                                <ul className="text-[10px] text-slate-500 space-y-1 list-disc pl-4">
                                    <li>Valid KRA Tax Compliance Certificate (TCC)</li>
                                    <li>Certificate of Incorporation / Business Name Registration</li>
                                    <li>Valid Single Business Permit (County Government)</li>
                                    <li>Fully completed & signed Confidential Business Questionnaire</li>
                                </ul>
                            </div>

                            {/* Section B: Technical Evaluation (100 Marks) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Section B: Technical & Financial Evaluation (Max 100 Marks, Pass Mark: 80%)
                                    </h4>
                                </div>

                                {[
                                    { key: 'premise', label: '1. Business Premise & Physical Location (Title/Lease/Utility Bill)', max: 10 },
                                    { key: 'experience', label: '2. Past Experience & Track Record (3 LPOs/Recommendation Letters)', max: 30 },
                                    { key: 'financial', label: '3. Financial Capability & Working Capital (12 Months Bank Statements)', max: 20 },
                                    { key: 'creditPeriod', label: '4. Credit Period Offered (30 to 90 Days)', max: 20 },
                                    { key: 'litigation', label: '5. Litigation History & Good Standing', max: 10 },
                                    { key: 'agpoSpecial', label: '6. AGPO / Special Criteria Compliance', max: 10 },
                                ].map(crit => (
                                    <div key={crit.key} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">{crit.label}</label>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">Maximum: {crit.max} Marks</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min={0} 
                                                max={crit.max} 
                                                value={(evaluationScores as any)[crit.key]} 
                                                onChange={e => {
                                                    const val = Math.min(crit.max, Math.max(0, parseFloat(e.target.value) || 0));
                                                    setEvaluationScores(p => ({ ...p, [crit.key]: val }));
                                                }} 
                                                className="w-16 px-2.5 py-1.5 text-center font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs" 
                                            />
                                            <span className="text-xs text-slate-400 font-bold">/ {crit.max}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Score Summary & Status */}
                            {(() => {
                                const total = evaluationScores.mandatoryPassed 
                                    ? (evaluationScores.premise + evaluationScores.experience + evaluationScores.financial + evaluationScores.creditPeriod + evaluationScores.litigation + evaluationScores.agpoSpecial)
                                    : 0;
                                const passed = evaluationScores.mandatoryPassed && total >= 80;
                                return (
                                    <div className={`p-4 rounded-2xl border ${passed ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'} flex items-center justify-between`}>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider">Evaluation Verdict (Threshold: 80%)</p>
                                            <p className="text-sm font-black mt-0.5">
                                                {passed ? '🟢 RECOMMENDED FOR PRE-QUALIFICATION' : '🔴 UNSUCCESSFUL / DISQUALIFIED'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black font-mono">{total}</span>
                                            <span className="text-xs font-bold text-slate-400"> / 100</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Tender Evaluation Committee Remarks</label>
                                <textarea 
                                    value={evaluationScores.notes} 
                                    onChange={e => setEvaluationScores(p => ({ ...p, notes: e.target.value }))} 
                                    placeholder="Add committee notes or reasons for qualification/disqualification..." 
                                    rows={2} 
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none" 
                                />
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowEvaluationModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={handleSaveEvaluation} className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black hover:bg-indigo-700 transition-all shadow-md">Save Evaluation & Update Status</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
