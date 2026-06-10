import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Institution, SportEvent, EventCategory, EventParticipant, EventSplit, EventMedicalLog, EventPledge } from '../../types';
import { apiService } from '../../services/apiService';
import { EventRegistrationModal } from './EventRegistrationModal';
import { RaceDayControl } from './RaceDayControl';
import { EventLeaderboard } from './EventLeaderboard';
import { FundraisingTracker } from './FundraisingTracker';
import { 
    CalendarDaysIcon, SparklesIcon, UserGroupIcon, MapPinIcon, 
    BanknotesIcon, PlusIcon, Trash2Icon, AlertTriangleIcon, CheckCircleIcon,
    ChartBarIcon, ClockIcon, Edit2Icon, XIcon, ShareIcon
} from '../icons';

interface EventManagementViewProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction?: (actionType: string, details: string) => void;
}

export const EventManagementView: React.FC<EventManagementViewProps> = ({
    currentUser,
    currentInstitution,
    onLogAction
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'runners' | 'raceday' | 'medical' | 'fundraising' | 'leaderboard' | 'bankfeeds' | 'staff' | 'reports'>('dashboard');
    const [isLoading, setIsLoading] = useState(true);

    // Module entities states
    const [events, setEvents] = useState<SportEvent[]>([]);
    const [categories, setCategories] = useState<EventCategory[]>([]);
    const [participants, setParticipants] = useState<EventParticipant[]>([]);
    const [splits, setSplits] = useState<EventSplit[]>([]);
    const [medicalLogs, setMedicalLogs] = useState<EventMedicalLog[]>([]);
    const [pledges, setPledges] = useState<EventPledge[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [eventManagers, setEventManagers] = useState<User[]>([]);

    // Form modals
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [isAddManagerOpen, setIsAddManagerOpen] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingParticipant, setEditingParticipant] = useState<EventParticipant | null>(null);

    // Active selected Event context
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    const detailsFileInputRef = useRef<HTMLInputElement>(null);
    const formFileInputRef = useRef<HTMLInputElement>(null);

    // New Event / Category Form States
    const [eventForm, setEventForm] = useState({ name: '', description: '', date: '', location: '', customSubdomain: '', paymentInstructions: '', bankIntegrationEnabled: false, bannerUrl: '' });
    const [categoryForm, setCategoryForm] = useState({ name: '', distanceKm: '', registrationFee: '', capacity: '', genderRestriction: 'any' as 'any' | 'male' | 'female', startTime: '' });
    const [managerForm, setManagerForm] = useState({ name: '', email: '', phone: '', staffId: '', gender: 'Male', password: '' });

    // Fetch and Sync
    const loadEventData = async () => {
        setIsLoading(true);
        try {
            // Load from mock API or local storage fallback
            let evs = await apiService.fetchModuleRecords<SportEvent>('events').catch(() => []);
            let cats = await apiService.fetchModuleRecords<EventCategory>('event_categories').catch(() => []);
            let parts = await apiService.fetchModuleRecords<EventParticipant>('event_participants').catch(() => []);
            let spls = await apiService.fetchModuleRecords<EventSplit>('event_splits').catch(() => []);
            let med = await apiService.fetchModuleRecords<EventMedicalLog>('event_medical_logs').catch(() => []);
            let plg = await apiService.fetchModuleRecords<EventPledge>('event_pledges').catch(() => []);
            let txs = await apiService.fetchModuleRecords<any>('mpesa_transactions').catch(() => []);
            let bankTxs = await apiService.fetchModuleRecords<any>('bank_transactions').catch(() => []);
            let usrs = await apiService.fetchModuleRecords<User>('users', currentInstitution.id).catch(() => []);

            // Check if we need to seed demo data
            if (evs.length === 0) {
                const demoEventId = 'evt_' + Date.now();
                const demoEvent: SportEvent = {
                    id: demoEventId,
                    institutionId: currentInstitution.id,
                    name: 'Nairobi City Elite Marathon 2026',
                    description: 'The annual regional marathon promoting environmental sustainability and athletic development.',
                    date: '2026-06-20',
                    location: 'Nairobi National Park Circuit, Kenya',
                    status: 'planning',
                    createdAt: new Date().toISOString()
                };

                const demoCats: EventCategory[] = [
                    { id: 'cat_42k_' + Date.now(), eventId: demoEventId, name: 'Full Marathon', distanceKm: 42.2, registrationFee: 2000, capacity: 500, genderRestriction: 'any', startTime: '06:00:00' },
                    { id: 'cat_21k_' + Date.now(), eventId: demoEventId, name: 'Half Marathon', distanceKm: 21.1, registrationFee: 1500, capacity: 1000, genderRestriction: 'any', startTime: '06:30:00' },
                    { id: 'cat_10k_' + Date.now(), eventId: demoEventId, name: '10K Fun Run', distanceKm: 10, registrationFee: 1000, capacity: 1500, genderRestriction: 'any', startTime: '07:00:00' }
                ];

                const demoParts: EventParticipant[] = [
                    { id: 'part_1', categoryId: demoCats[0].id, bibNumber: '1001', firstName: 'Kipchoge', lastName: 'Keino', email: 'kipchoge.keino@sports.ke', phone: '0711223344', gender: 'male', age: 34, tShirtSize: 'M', status: 'checked_in', waiverSigned: true, paymentStatus: 'paid', mpesaReference: 'MPK908123', emergencyContactName: 'Jane Keino', emergencyContactPhone: '0722334455' },
                    { id: 'part_2', categoryId: demoCats[0].id, bibNumber: '1002', firstName: 'Brigid', lastName: 'Kosgei', email: 'brigid.kosgei@sports.ke', phone: '0722445566', gender: 'female', age: 29, tShirtSize: 'S', status: 'checked_in', waiverSigned: true, paymentStatus: 'paid', mpesaReference: 'MPK781902', emergencyContactName: 'Sam Kosgei', emergencyContactPhone: '0711902819' },
                    { id: 'part_3', categoryId: demoCats[1].id, bibNumber: '2001', firstName: 'David', lastName: 'Rudisha', email: 'david@sports.ke', phone: '0733556677', gender: 'male', age: 31, tShirtSize: 'L', status: 'checked_in', waiverSigned: true, paymentStatus: 'paid', mpesaReference: 'MPK610928', emergencyContactName: 'Ruth Rudisha', emergencyContactPhone: '0722883399' },
                    { id: 'part_4', categoryId: demoCats[2].id, bibNumber: '3001', firstName: 'Tegla', lastName: 'Loroupe', email: 'tegla@loroupe.org', phone: '0700112233', gender: 'female', age: 45, tShirtSize: 'S', status: 'checked_in', waiverSigned: true, paymentStatus: 'paid', mpesaReference: 'MPK309102', emergencyContactName: 'Albert Loroupe', emergencyContactPhone: '0722309102' }
                ];

                const demoPledges: EventPledge[] = [
                    { id: 'plg_1', participantId: 'part_1', sponsorName: 'Safaricom Ltd', amount: 15000, paymentStatus: 'paid', createdAt: new Date().toISOString() },
                    { id: 'plg_2', participantId: 'part_2', sponsorName: 'Kenya Airways', amount: 25000, paymentStatus: 'pending', createdAt: new Date().toISOString() },
                    { id: 'plg_3', participantId: 'part_3', sponsorName: 'KCB Bank', amount: 10000, paymentStatus: 'paid', createdAt: new Date().toISOString() }
                ];

                await apiService.saveModuleRecord('events', demoEvent);
                for (const c of demoCats) await apiService.saveModuleRecord('event_categories', c);
                for (const p of demoParts) await apiService.saveModuleRecord('event_participants', p);
                for (const pl of demoPledges) await apiService.saveModuleRecord('event_pledges', pl);

                evs = [demoEvent];
                cats = demoCats;
                parts = demoParts;
                plg = demoPledges;
            }

            // Deduplicate lists to prevent database duplication visual bugs
            const safeEvs = Array.isArray(evs) ? evs : [];
            const safeCats = Array.isArray(cats) ? cats : [];
            const safeParts = Array.isArray(parts) ? parts : [];
            const safeSpls = Array.isArray(spls) ? spls : [];
            const safeMed = Array.isArray(med) ? med : [];
            const safePlg = Array.isArray(plg) ? plg : [];
            const safeTxs = Array.isArray(txs) ? txs : [];
            
            const normalizedBankTxs = (Array.isArray(bankTxs) ? bankTxs : []).map(bt => {
                const meta = typeof bt.payload === 'string' ? safeParseMetadata(bt.payload) : (bt.payload || {});
                return {
                    ...bt,
                    _table: 'bank_transactions',
                    timestamp: bt.transaction_date || bt.created_at,
                    transactionId: bt.reference || bt.id,
                    payerName: bt.sender_name || 'External Deposit',
                    phoneNumber: meta?.customerMobileNumber || meta?.phoneNumber || '',
                    metadata: bt.payload
                };
            });
            
            const safeUsrs = Array.isArray(usrs) ? usrs : [];

            const uniqueEvs = Array.from(new Map(safeEvs.map(e => [e?.id, e])).values()).filter(Boolean);
            const uniqueCats = Array.from(new Map(safeCats.map(c => [c?.id, c])).values()).filter(Boolean);
            const uniqueParts = Array.from(new Map(safeParts.map(p => [p?.id, p])).values()).filter(Boolean);
            
            const combinedTxs = [...safeTxs, ...normalizedBankTxs];
            const uniqueTxs = Array.from(new Map(combinedTxs.map(t => [t?.id, t])).values()).filter(Boolean);

            setEvents(uniqueEvs);
            setCategories(uniqueCats);
            setParticipants(uniqueParts);
            setTransactions(uniqueTxs);
            setSplits(uniqueEvs.length > 0 ? safeSpls : []);
            setMedicalLogs(uniqueEvs.length > 0 ? safeMed : []);
            setPledges(uniqueEvs.length > 0 ? safePlg : []);
            setEventManagers(safeUsrs.filter(u => u && u.role === 'event_manager'));

            if (uniqueEvs.length > 0) {
                setSelectedEventId(uniqueEvs[0].id);
            }
        } catch (error) {
            console.error('Failed to load event module data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadEventData();
    }, [currentInstitution.id]);

    const activeEvent = events.find(e => e.id === selectedEventId);

    const safeParseMetadata = (metadata: any) => {
        if (!metadata) return null;
        if (typeof metadata === 'object') return metadata;
        try {
            const parsed = JSON.parse(metadata);
            return typeof parsed === 'object' ? parsed : null;
        } catch (e) {
            return null;
        }
    };

    const activeEventCategories = useMemo(() => {
        return categories.filter(c => c.eventId === selectedEventId);
    }, [categories, selectedEventId]);

    const activeEventParticipants = useMemo(() => {
        const catIds = activeEventCategories.map(c => c.id);
        return participants.filter(p => catIds.includes(p.categoryId)).map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            return {
                ...p,
                categoryName: cat?.name,
                distanceKm: cat?.distanceKm
            };
        });
    }, [participants, activeEventCategories, categories]);

    const activeEventTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Bank transactions from bank_transactions table — show all for this institution
            if (t._table === 'bank_transactions') return true;
            // M-PESA transactions — filter by eventId in metadata
            const meta = safeParseMetadata(t.metadata);
            return meta && meta.eventId === selectedEventId;
        });
    }, [transactions, selectedEventId]);

    const handleVerifyTransactionStatus = async (tx: any) => {
        try {
            const confirmed = window.confirm("Would you like to manually verify and reconcile this payment transaction?");
            if (!confirmed) return;

            const reference = window.prompt("Confirm or enter the manual payment/bank code reference:", tx.transactionId || tx.checkoutRequestId || "");
            if (reference === null) return; // cancelled prompt

            const updatedTx = { ...tx, status: 'completed', transactionId: reference || tx.transactionId };
            const tableName = tx._table || 'mpesa_transactions';
            
            // Clean up custom metadata before saving
            delete updatedTx._table;
            
            await apiService.saveModuleRecord(tableName, updatedTx);
            
            // Find matching participant to update payment status
            const meta = safeParseMetadata(tx.metadata);
            if (meta && meta.eventId) {
                const allParts = await apiService.fetchModuleRecords<EventParticipant>('event_participants');
                const matchedPart = allParts.find(p => p.email === tx.payerName || p.phone === tx.phoneNumber || (p.firstName && tx.payerName?.includes(p.firstName)));
                if (matchedPart) {
                    const updatedPart = { ...matchedPart, paymentStatus: 'paid', mpesaReference: reference || tx.transactionId };
                    await apiService.saveModuleRecord('event_participants', updatedPart);
                }
            }
            
            alert('Payment verified and reconciled successfully!');
            await loadEventData();
        } catch (err: any) {
            console.error("Failed to manually verify transaction", err);
            alert("Verification failed: " + (err.message || err));
        }
    };

    const activeEventSplits = useMemo(() => {
        const partIds = activeEventParticipants.map(p => p.id);
        return splits.filter(s => partIds.includes(s.participantId));
    }, [splits, activeEventParticipants]);

    const activeEventMedicalLogs = useMemo(() => {
        return medicalLogs.filter(m => m.eventId === selectedEventId).map(m => {
            const p = participants.find(part => part.id === m.participantId);
            return {
                ...m,
                participantName: p ? `${p.firstName} ${p.lastName}` : 'Unknown Runner',
                bibNumber: p?.bibNumber
            };
        });
    }, [medicalLogs, selectedEventId, participants]);

    const activeEventPledges = useMemo(() => {
        const partIds = activeEventParticipants.map(p => p.id);
        return pledges.filter(pl => partIds.includes(pl.participantId)).map(pl => {
            const p = participants.find(part => part.id === pl.participantId);
            return {
                ...pl,
                participantName: p ? `${p.firstName} ${p.lastName}` : 'Unknown Runner',
                bibNumber: p?.bibNumber
            };
        });
    }, [pledges, activeEventParticipants, participants]);

    // Handlers
    const getEventRegistrationLink = (event: SportEvent) => {
        const origin = window.location.origin;
        if (event.customSubdomain) {
            try {
                const url = new URL(origin);
                url.hostname = `${event.customSubdomain}.${url.hostname}`;
                return `${url.origin}/?view=event-register&id=${event.id}`;
            } catch (e) {
                return `${origin}/?view=event-register&id=${event.id}`;
            }
        }
        return `${origin}/?view=event-register&id=${event.id}`;
    };

    const handleUpdateEventSubdomain = async (eventId: string, subdomain: string) => {
        const ev = events.find(e => e.id === eventId);
        if (!ev) return;
        const updatedEvent = { ...ev, customSubdomain: subdomain || undefined };
        try {
            await apiService.saveModuleRecord('events', updatedEvent);
            if (onLogAction) onLogAction('update_event_subdomain', `Updated subdomain for event ${ev.name} to ${subdomain}`);
            await loadEventData();
            alert('Custom subdomain updated successfully!');
        } catch (err: any) {
            alert('Failed to update subdomain: ' + (err.message || err));
        }
    };

    const handleUpdateEventPaymentInstructions = async (eventId: string, instructions: string) => {
        const ev = events.find(e => e.id === eventId);
        if (!ev) return;
        const updatedEvent = { ...ev, paymentInstructions: instructions || undefined };
        try {
            await apiService.saveModuleRecord('events', updatedEvent);
            if (onLogAction) onLogAction('update_event_payment_instructions', `Updated payment instructions for event ${ev.name}`);
            await loadEventData();
            alert('Payment instructions updated successfully!');
        } catch (err: any) {
            alert('Failed to update payment instructions: ' + (err.message || err));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, eventId?: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingBanner(true);
        try {
            // Upload directly via the Super Admin Google Drive Configuration
            const response = await apiService.uploadToGoogleDrive(file, 'Event_Banners', { useGlobalConfig: true });
            
            if (response.success && response.url) {
                if (eventId) {
                    await handleUpdateEventBanner(eventId, response.url);
                } else {
                    setEventForm(prev => ({ ...prev, bannerUrl: response.url }));
                }
            } else {
                alert(`Upload to Google Drive failed: ${response.error || 'Unknown error'}. Please check Super Admin Drive configuration.`);
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Failed to upload image to Google Drive.");
        } finally {
            setIsUploadingBanner(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleUpdateEventBanner = async (eventId: string, url: string) => {
        const ev = events.find(e => e.id === eventId);
        if (!ev) return;
        const updatedEvent = { ...ev, bannerUrl: url || undefined };
        try {
            await apiService.saveModuleRecord('events', updatedEvent);
            if (onLogAction) onLogAction('update_event_banner', `Updated banner for event ${ev.name}`);
            await loadEventData();
        } catch (err: any) {
            alert('Failed to update event banner: ' + (err.message || err));
        }
    };

    const handleToggleBankIntegration = async (eventId: string, enabled: boolean) => {
        const ev = events.find(e => e.id === eventId);
        if (!ev) return;
        const updatedEvent = { ...ev, bankIntegrationEnabled: enabled };
        try {
            await apiService.saveModuleRecord('events', updatedEvent);
            if (onLogAction) onLogAction('toggle_bank_integration', `${enabled ? 'Enabled' : 'Disabled'} bank integration for event ${ev.name}`);
            await loadEventData();
        } catch (err: any) {
            alert('Failed to update bank integration status: ' + (err.message || err));
        }
    };

    // Handlers
    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        const newEvent: SportEvent = {
            id: 'evt_' + Date.now(),
            institutionId: currentInstitution.id,
            name: eventForm.name,
            description: eventForm.description,
            date: eventForm.date,
            location: eventForm.location,
            status: 'planning',
            customSubdomain: eventForm.customSubdomain ? eventForm.customSubdomain.trim().toLowerCase() : undefined,
            paymentInstructions: eventForm.paymentInstructions ? eventForm.paymentInstructions.trim() : undefined,
            bankIntegrationEnabled: eventForm.bankIntegrationEnabled,
            bannerUrl: eventForm.bannerUrl ? eventForm.bannerUrl.trim() : undefined,
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('events', newEvent);
            setEventForm({ name: '', description: '', date: '', location: '', customSubdomain: '', paymentInstructions: '', bankIntegrationEnabled: false, bannerUrl: '' });
            setIsAddEventOpen(false);
            if (onLogAction) onLogAction('create_event', `Created event: ${newEvent.name}`);
            await loadEventData();
            setSelectedEventId(newEvent.id);
            alert('Event created successfully!');
        } catch (err: any) {
            alert('Failed to save event: ' + (err.message || err));
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEventId) return;

        const distanceVal = parseFloat(categoryForm.distanceKm);
        if (isNaN(distanceVal) || distanceVal <= 0) {
            alert('Please enter a valid distance in kilometers (greater than 0).');
            return;
        }

        const categoryData: EventCategory = {
            id: editingCategoryId || 'cat_' + Date.now(),
            eventId: selectedEventId,
            name: categoryForm.name,
            distanceKm: distanceVal,
            registrationFee: parseFloat(categoryForm.registrationFee || '0'),
            capacity: categoryForm.capacity ? parseInt(categoryForm.capacity) : undefined,
            genderRestriction: categoryForm.genderRestriction,
            startTime: categoryForm.startTime || undefined,
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('event_categories', categoryData);
            setCategoryForm({ name: '', distanceKm: '', registrationFee: '', capacity: '', genderRestriction: 'any', startTime: '' });
            setIsAddCategoryOpen(false);
            setEditingCategoryId(null);
            if (onLogAction) onLogAction(editingCategoryId ? 'update_event_category' : 'create_event_category', `${editingCategoryId ? 'Updated' : 'Created'} category: ${categoryData.name}`);
            await loadEventData();
            alert(`Category ${editingCategoryId ? 'updated' : 'created'} successfully!`);
        } catch (err: any) {
            alert('Failed to save category: ' + (err.message || err));
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm('Are you sure you want to delete this race category? All participants registered under this category will also be removed.')) {
            return;
        }
        try {
            await apiService.deleteModuleRecord('event_categories', categoryId);
            await loadEventData();
            alert('Category deleted successfully!');
        } catch (err: any) {
            alert('Failed to delete category: ' + (err.message || err));
        }
    };

    const handleDeleteRunner = async (runnerId: string) => {
        const runner = participants.find(p => p.id === runnerId);
        const runnerName = runner ? `${runner.firstName} ${runner.lastName}` : 'Runner';
        if (!confirm(`Are you sure you want to delete runner ${runnerName}? This action cannot be undone.`)) {
            return;
        }
        try {
            await apiService.deleteModuleRecord('event_participants', runnerId);
            if (onLogAction) onLogAction('delete_runner', `Deleted runner: ${runnerName}`);
            await loadEventData();
            alert('Runner deleted successfully!');
        } catch (err: any) {
            alert('Failed to delete runner: ' + (err.message || err));
        }
    };

    const handleRegisterRunner = async (data: Partial<EventParticipant>) => {
        // Check if runner is already registered for this event
        const activeCategoryIds = activeEventCategories.map(c => c.id);
        const emailLower = data.email?.trim().toLowerCase();
        const phoneTrim = data.phone?.trim();
        
        const duplicate = participants.find(p => 
            p.id !== data.id && 
            activeCategoryIds.includes(p.categoryId) && 
            ((emailLower && p.email?.toLowerCase() === emailLower) || (phoneTrim && p.phone === phoneTrim))
        );
        if (duplicate) {
            throw new Error(`A runner with this email or phone number is already registered for this event (BIB: ${duplicate.bibNumber}).`);
        }

        // Find highest BIB number and increment (only if creating a new runner)
        const existingBibs = participants
            .map(p => parseInt(p.bibNumber || '0'))
            .filter(b => !isNaN(b));
        const maxBib = existingBibs.length > 0 ? Math.max(...existingBibs) : 1000;
        const newBib = data.bibNumber || String(maxBib + 1);

        const newParticipant: EventParticipant = {
            id: 'part_' + Date.now(),
            createdAt: new Date().toISOString(),
            ...(data as any),
            bibNumber: newBib,
            updatedAt: new Date().toISOString()
        };

        const savedParticipant = await apiService.saveModuleRecord('event_participants', newParticipant);
        
        // Log transaction for bank feeds if registration is paid (only if creating a new runner)
        const category = categories.find(c => c.id === data.categoryId);
        const fee = category ? Number(category.registrationFee || 0) : 0;
        if (!data.id && fee > 0 && data.mpesaReference) {
            const mpesaTx = {
                id: 'tx_' + Date.now(),
                transactionId: data.mpesaReference,
                checkoutRequestId: data.mpesaReference,
                institutionId: activeEvent?.institutionId || 'GLOBAL',
                amount: fee,
                phoneNumber: data.phone || '',
                payerName: `${data.firstName} ${data.lastName}`,
                status: 'completed',
                timestamp: new Date().toISOString(),
                metadata: {
                    type: 'event_registration',
                    eventId: selectedEventId,
                    categoryId: data.categoryId,
                    reference: data.mpesaReference
                }
            };
            await apiService.saveModuleRecord('mpesa_transactions', mpesaTx).catch(e => console.error("Failed to auto-record admin mpesa_transaction", e));
        }

        if (onLogAction) onLogAction(data.id ? 'update_runner' : 'register_runner', `${data.id ? 'Updated' : 'Registered'} runner BIB ${newBib}: ${newParticipant.firstName} ${newParticipant.lastName}`);
        await loadEventData();
        if (!savedParticipant) {
            throw new Error('Failed to save event participant record.');
        }
        return savedParticipant;
    };

    const handleUpdateEventStatus = async (status: SportEvent['status']) => {
        if (!activeEvent) return;
        const updated = {
            ...activeEvent,
            status,
            updatedAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('events', updated);
        if (onLogAction) onLogAction('update_event_status', `Updated event status to ${status}`);
        await loadEventData();
    };

    const handleRecordSplit = async (data: Partial<EventSplit>) => {
        const newSplit: EventSplit = {
            ...(data as any),
            id: 'split_' + Date.now(),
            recordedAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('event_splits', newSplit);
        await loadEventData();
    };

    const handleUpdateParticipantStatus = async (id: string, status: EventParticipant['status']) => {
        const participant = participants.find(p => p.id === id);
        if (!participant) return;
        const updated = {
            ...participant,
            status,
            updatedAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('event_participants', updated);
        await loadEventData();
    };

    const handleLogMedical = async (data: Partial<EventMedicalLog>) => {
        if (!selectedEventId) return;
        const newLog: EventMedicalLog = {
            ...(data as any),
            id: 'med_' + Date.now(),
            eventId: selectedEventId,
            recordedAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('event_medical_logs', newLog);
        if (onLogAction) onLogAction('log_medical_incident', `Logged medical incident for participant ${newLog.participantId}`);
        await loadEventData();
    };

    const handleAddPledge = async (data: Partial<EventPledge>) => {
        const newPledge: EventPledge = {
            ...(data as any),
            id: 'pledge_' + Date.now(),
            createdAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('event_pledges', newPledge);
        if (onLogAction) onLogAction('add_pledge', `Logged pledge of KES ${newPledge.amount} by ${newPledge.sponsorName}`);
        await loadEventData();
    };

    const handleConfirmPledgePayment = async (id: string) => {
        const pledge = pledges.find(pl => pl.id === id);
        if (!pledge) return;
        const updated = {
            ...pledge,
            paymentStatus: 'paid' as const
        };
        await apiService.saveModuleRecord('event_pledges', updated);
        if (onLogAction) onLogAction('confirm_pledge_payment', `Confirmed payment for pledge ${id}`);
        await loadEventData();
    };

    const handleDeleteEvent = async (id: string) => {
        if (confirm('Are you sure you want to delete this event? This will erase all categories, participants, splits, and medical logs associated with it.')) {
            await apiService.deleteModuleRecord('events', id);
            await loadEventData();
        }
    };

    const handleCreateManager = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!managerForm.name || !managerForm.email || !managerForm.password) {
            alert('Name, Email, and Password are required');
            return;
        }
        try {
            const newUser: User = {
                id: `u_evt_mgr_${Date.now()}`,
                institutionId: currentInstitution.id,
                name: managerForm.name,
                email: managerForm.email,
                phoneNumber: managerForm.phone,
                gender: managerForm.gender as any,
                staffId: managerForm.staffId,
                role: 'event_manager',
                password: managerForm.password,
                expertise: ['Event Management']
            };
            await apiService.saveModuleRecord('users', newUser);
            setIsAddManagerOpen(false);
            setManagerForm({ name: '', email: '', phone: '', staffId: '', gender: 'Male', password: '' });
            await loadEventData();
            if (onLogAction) {
                onLogAction('create_event_manager', `Created event manager: ${newUser.name} (${newUser.email})`);
            }
        } catch (error: any) {
            console.error('Failed to create event manager:', error);
            alert(error.message || 'Failed to save event manager');
        }
    };

    const handleDeleteManager = async (id: string) => {
        if (!confirm('Are you sure you want to revoke access and delete this Event Manager?')) return;
        try {
            await apiService.deleteModuleRecord('users', id);
            await loadEventData();
            if (onLogAction) {
                const deletedName = eventManagers.find(m => m.id === id)?.name || id;
                onLogAction('delete_event_manager', `Deleted event manager with ID: ${id} (${deletedName})`);
            }
        } catch (error: any) {
            console.error('Failed to delete event manager:', error);
            alert(error.message || 'Failed to delete event manager');
        }
    };

    // Dashboard calculations
    const totals = useMemo(() => {
        const revenue = activeEventParticipants
            .filter(p => p.paymentStatus === 'paid')
            .reduce((sum, p) => {
                const cat = categories.find(c => c.id === p.categoryId);
                return sum + (cat ? Number(cat.registrationFee) : 0);
            }, 0);

        const checkedInCount = activeEventParticipants.filter(p => p.status === 'checked_in' || p.status === 'started' || p.status === 'completed').length;
        const completedCount = activeEventParticipants.filter(p => p.status === 'completed').length;
        const activeCount = activeEventParticipants.filter(p => p.status === 'started').length;

        return {
            revenue,
            totalRunners: activeEventParticipants.length,
            checkedIn: checkedInCount,
            completed: completedCount,
            running: activeCount
        };
    }, [activeEventParticipants, categories]);

    const eventInsights = useMemo(() => {
        const total = activeEventParticipants.length;
        if (total === 0) return null;

        let maleCount = 0;
        let femaleCount = 0;
        let checkedInCount = 0;
        let totalExpectedRevenue = 0;
        let totalCollectedRevenue = 0;

        const categoryStats: Record<string, { name: string, runners: number, checkedIn: number, revenue: number }> = {};

        activeEventCategories.forEach(c => {
            categoryStats[c.id] = { name: c.name, runners: 0, checkedIn: 0, revenue: 0 };
        });

        activeEventParticipants.forEach(p => {
            if (p.gender === 'male') maleCount++;
            if (p.gender === 'female') femaleCount++;
            
            const isCheckedIn = p.status === 'checked_in' || p.status === 'started' || p.status === 'completed';
            if (isCheckedIn) checkedInCount++;

            const cat = activeEventCategories.find(c => c.id === p.categoryId);
            const fee = cat ? Number(cat.registrationFee || 0) : 0;
            totalExpectedRevenue += fee;
            
            if (p.paymentStatus === 'paid') {
                totalCollectedRevenue += fee;
            }

            if (categoryStats[p.categoryId]) {
                categoryStats[p.categoryId].runners++;
                if (isCheckedIn) categoryStats[p.categoryId].checkedIn++;
                if (p.paymentStatus === 'paid') categoryStats[p.categoryId].revenue += fee;
            }
        });

        const attendanceRate = (checkedInCount / total) * 100;
        const malePct = (maleCount / total) * 100;
        const femalePct = (femaleCount / total) * 100;
        const medicalIncidentRate = (activeEventMedicalLogs.length / total) * 100;

        return {
            total,
            malePct,
            femalePct,
            attendanceRate,
            totalExpectedRevenue,
            totalCollectedRevenue,
            medicalIncidentRate,
            categoryStats: Object.values(categoryStats).sort((a, b) => b.runners - a.runners)
        };
    }, [activeEventParticipants, activeEventCategories, activeEventMedicalLogs]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-slate-500">Loading Sports Event Command Desk...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            
            {/* Event Selector & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <CalendarDaysIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Active Event Desk</span>
                        <select
                            value={selectedEventId}
                            onChange={e => setSelectedEventId(e.target.value)}
                            className="bg-transparent text-lg font-bold text-slate-800 dark:text-white border-none p-0 focus:ring-0 cursor-pointer"
                        >
                            {events.map(ev => (
                                <option key={ev.id} value={ev.id} className="text-slate-800 dark:text-white bg-white dark:bg-slate-800">{ev.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {activeEvent && (
                        <button
                            onClick={() => {
                                const link = getEventRegistrationLink(activeEvent);
                                navigator.clipboard.writeText(link);
                                alert(`Public self-registration link copied to clipboard:\n${link}`);
                            }}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-650 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                            title="Copy public self-registration link"
                        >
                            <ShareIcon className="w-4 h-4" />
                            <span>Share Link</span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsRegModalOpen(true)}
                        disabled={!selectedEventId || activeEventCategories.length === 0}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:bg-slate-200"
                    >
                        Register Runner
                    </button>
                    <button
                        onClick={() => {
                            setEditingCategoryId(null);
                            setCategoryForm({ name: '', distanceKm: '', registrationFee: '', capacity: '', genderRestriction: 'any', startTime: '' });
                            setIsAddCategoryOpen(true);
                        }}
                        disabled={!selectedEventId}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                        Add Race Category
                    </button>
                    <button
                        onClick={() => setIsAddEventOpen(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                        New Event
                    </button>
                    {activeEvent && (
                        <button
                            onClick={() => handleDeleteEvent(activeEvent.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-xl transition-all"
                            title="Delete Event"
                        >
                            <Trash2Icon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Dashboard Sub Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto whitespace-nowrap scrollbar-hide py-1">
                {(['dashboard', 'events', 'runners', 'raceday', 'medical', 'fundraising', 'leaderboard', 'bankfeeds', 'staff', 'reports'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                            activeTab === tab 
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
                        }`}
                    >
                        {tab === 'raceday' ? 'Race Day Control' : tab === 'bankfeeds' ? 'Bank Feeds' : tab === 'staff' ? 'Event Staff' : tab === 'reports' ? 'Reports & Insights' : tab}
                    </button>
                ))}
            </div>

            {/* View Switching */}
            <div className="animate-fade-in">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Registration Revenue</span>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">KES {totals.revenue?.toLocaleString()}</div>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600">
                                    <BanknotesIcon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Registered Participants</span>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totals.totalRunners}</div>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600">
                                    <UserGroupIcon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kit Collected & Checked-In</span>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totals.checkedIn}</div>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600">
                                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                </div>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Charity Raised</span>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                                        KES {activeEventPledges.reduce((sum, pl) => sum + Number(pl.amount), 0)?.toLocaleString()}
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600">
                                    <SparklesIcon className="w-5 h-5 text-amber-500" />
                                </div>
                            </div>
                        </div>

                        {/* Split layouts */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Active Event details */}
                            <div className="lg:col-span-2 space-y-6">
                                {activeEvent ? (
                                    <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm relative overflow-hidden">
                                        {activeEvent.bannerUrl ? (
                                            <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-6 relative group border border-slate-200 dark:border-slate-700 shadow-inner">
                                                <img src={activeEvent.bannerUrl} alt={activeEvent.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-4">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        ref={detailsFileInputRef} 
                                                        onChange={(e) => handleFileUpload(e, activeEvent.id)} 
                                                    />
                                                    <button onClick={() => detailsFileInputRef.current?.click()} disabled={isUploadingBanner} className="px-4 py-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-xl text-xs font-bold transition-all shadow-lg border border-white/30">
                                                        {isUploadingBanner ? 'Uploading...' : 'Change Banner'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-32 rounded-2xl mb-6 relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-dashed border-indigo-200 dark:border-indigo-500/30 flex flex-col items-center justify-center text-center p-6 group transition-all hover:bg-indigo-500/20">
                                                <SparklesIcon className="w-8 h-8 text-indigo-400 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-2">No Event Banner</p>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    ref={detailsFileInputRef} 
                                                    onChange={(e) => handleFileUpload(e, activeEvent.id)} 
                                                />
                                                <button onClick={() => detailsFileInputRef.current?.click()} disabled={isUploadingBanner} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:bg-indigo-400">
                                                    {isUploadingBanner ? 'Uploading...' : 'Upload Banner'}
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="text-lg font-bold text-slate-800 dark:text-white">{activeEvent.name}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{activeEvent.description}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const link = getEventRegistrationLink(activeEvent);
                                                    navigator.clipboard.writeText(link);
                                                    alert(`Public self-registration link copied to clipboard:\n${link}`);
                                                }}
                                                className="ml-4 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-650 dark:text-indigo-400 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                                                title="Copy public self-registration link"
                                            >
                                                <ShareIcon className="w-4 h-4" />
                                                <span>Share Link</span>
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 mt-6 text-xs border-t border-slate-100 dark:border-slate-700 pt-4">
                                            <div>
                                                <span className="block text-slate-400">Date</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{activeEvent.date}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400">Location</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{activeEvent.location}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Subdomain (Registration Link)</span>
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                        {activeEvent.customSubdomain ? `${activeEvent.customSubdomain}.[domain]` : 'Default Domain (Not configured)'}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const sub = prompt("Enter custom subdomain for this event's registration link (e.g. marathon):", activeEvent.customSubdomain || "");
                                                        if (sub !== null) {
                                                            handleUpdateEventSubdomain(activeEvent.id, sub.trim().toLowerCase());
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all"
                                                >
                                                    {activeEvent.customSubdomain ? "Edit" : "Configure"}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                                            <div>
                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Instructions</span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    {activeEvent.paymentInstructions ? "Custom instructions configured" : "Default instructions"}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const inst = prompt("Enter payment instructions (e.g. Bank details or Paybill):", activeEvent.paymentInstructions || "");
                                                    if (inst !== null) {
                                                        handleUpdateEventPaymentInstructions(activeEvent.id, inst.trim());
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all"
                                            >
                                                {activeEvent.paymentInstructions ? "Edit" : "Configure"}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                                            <div>
                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank / Payment Gateway Integration</span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    {activeEvent.bankIntegrationEnabled ? "Enabled (Automated Collection)" : "Disabled (Manual Verification)"}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleToggleBankIntegration(activeEvent.id, !activeEvent.bankIntegrationEnabled)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${activeEvent.bankIntegrationEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeEvent.bankIntegrationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-3xl">No Event Selected. Click "New Event" above.</div>
                                )}

                                {/* Category overview */}
                                <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Race Categories Configured</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {activeEventCategories.map(cat => (
                                            <div key={cat.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                                <h5 className="font-bold text-slate-800 dark:text-white text-sm">{cat.name}</h5>
                                                <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1">{cat.distanceKm} KM</div>
                                                <div className="text-[10px] text-slate-400 mt-2">KES {Number(cat.registrationFee)?.toLocaleString()} entry fee</div>
                                            </div>
                                        ))}
                                        {activeEventCategories.length === 0 && (
                                            <div className="col-span-3 text-center py-6 text-slate-400 text-xs">No categories setup. Click "Add Race Category" above.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Urgent Bulletins & Recent medical log */}
                            <div className="space-y-6">
                                {/* Medical tent logs */}
                                <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm space-y-4">
                                    <h4 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <AlertTriangleIcon className="w-4 h-4" /> Medical Dispatch Desk
                                    </h4>

                                    <div className="space-y-3">
                                        {activeEventMedicalLogs.slice(0, 3).map(med => (
                                            <div key={med.id} className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-xs space-y-1">
                                                <div className="flex items-center justify-between font-bold">
                                                    <span className="text-red-700 dark:text-red-400">BIB {med.bibNumber} - {med.participantName}</span>
                                                    <span className="text-[10px] text-slate-400">{med.tentNumber}</span>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-400">{med.diagnosis}</p>
                                                <div className="text-[9px] font-bold uppercase text-red-600">{med.status.replace(/_/g, ' ')}</div>
                                            </div>
                                        ))}
                                        {activeEventMedicalLogs.length === 0 && (
                                            <div className="text-center py-6 text-slate-400 text-xs">No active medical incidents logged.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'events' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Event Categories List</h4>
                                <button
                                    onClick={() => {
                                        setEditingCategoryId(null);
                                        setCategoryForm({ name: '', distanceKm: '', registrationFee: '', capacity: '', genderRestriction: 'any', startTime: '' });
                                        setIsAddCategoryOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-755 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                                >
                                    <PlusIcon className="w-4 h-4" /> Add Category
                                </button>
                            </div>
                            <div className="overflow-x-auto text-xs">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                            <th className="pb-2">Category Name</th>
                                            <th className="pb-2">Distance (KM)</th>
                                            <th className="pb-2">Entry Fee</th>
                                            <th className="pb-2">Max Capacity</th>
                                            <th className="pb-2">Gender Restriction</th>
                                            <th className="pb-2">Start Time</th>
                                            <th className="pb-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeEventCategories.map(cat => (
                                            <tr key={cat.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="py-3 font-bold text-slate-800 dark:text-white">{cat.name}</td>
                                                <td className="py-3 font-bold text-indigo-600 font-mono">{cat.distanceKm} KM</td>
                                                <td className="py-3 font-mono">KES {Number(cat.registrationFee)?.toLocaleString()}</td>
                                                <td className="py-3">{cat.capacity || 'Unlimited'}</td>
                                                <td className="py-3 uppercase">{cat.genderRestriction}</td>
                                                <td className="py-3 font-mono">{cat.startTime || 'TBD'}</td>
                                                <td className="py-3 text-right flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setCategoryForm({
                                                                name: cat.name,
                                                                distanceKm: String(cat.distanceKm),
                                                                registrationFee: String(cat.registrationFee),
                                                                capacity: cat.capacity ? String(cat.capacity) : '',
                                                                genderRestriction: cat.genderRestriction as any,
                                                                startTime: cat.startTime || ''
                                                            });
                                                            setEditingCategoryId(cat.id);
                                                            setIsAddCategoryOpen(true);
                                                        }}
                                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded text-[9px] transition-all"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat.id)}
                                                        className="px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-bold rounded text-[9px] transition-all"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'runners' && (
                    <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Runner Registration Database</h4>
                            <button
                                onClick={() => {
                                    setEditingParticipant(null);
                                    setIsRegModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                                <PlusIcon className="w-4 h-4" /> Add Runner
                            </button>
                        </div>

                        <div className="overflow-x-auto text-xs">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                        <th className="pb-2">BIB</th>
                                        <th className="pb-2">Runner Name</th>
                                        <th className="pb-2">Category</th>
                                        <th className="pb-2">Age/Gender</th>
                                        <th className="pb-2">Shirt Size</th>
                                        <th className="pb-2">Payment Status</th>
                                        <th className="pb-2">Status</th>
                                        <th className="pb-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeEventParticipants.map(runner => (
                                        <tr key={runner.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="py-3 font-mono font-bold text-slate-500">{runner.bibNumber}</td>
                                            <td className="py-3 font-bold text-slate-800 dark:text-white">{runner.firstName} {runner.lastName}</td>
                                            <td className="py-3 text-slate-500">{runner.categoryName}</td>
                                            <td className="py-3">{runner.age} / <span className="uppercase">{runner.gender}</span></td>
                                            <td className="py-3 font-mono font-bold">{runner.tShirtSize}</td>
                                            <td className="py-3">
                                                {runner.paymentStatus === 'paid' ? (
                                                    <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-600 rounded text-[9px] font-bold">PAID</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded text-[9px] font-bold">PENDING</span>
                                                )}
                                            </td>
                                            <td className="py-3 uppercase font-bold text-[10px]">
                                                {runner.status === 'registered' && <span className="text-slate-500">Registered</span>}
                                                {runner.status === 'checked_in' && <span className="text-blue-500">Checked-in</span>}
                                                {runner.status === 'started' && <span className="text-indigo-600 animate-pulse">On Course</span>}
                                                {runner.status === 'completed' && <span className="text-green-600">Finished</span>}
                                            </td>
                                            <td className="py-3 text-right flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        setEditingParticipant(runner);
                                                        setIsRegModalOpen(true);
                                                    }}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded text-[9px] transition-all active:scale-95"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRunner(runner.id)}
                                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-650 dark:text-red-400 font-bold rounded text-[9px] transition-all active:scale-95"
                                                >
                                                    Delete
                                                </button>
                                                {runner.status === 'registered' && (
                                                    <button
                                                        onClick={() => handleUpdateParticipantStatus(runner.id, 'checked_in')}
                                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-650 dark:text-indigo-400 font-bold rounded text-[9px] transition-all active:scale-95"
                                                    >
                                                        Collect Kit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {activeEventParticipants.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-slate-400">No runners registered yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'raceday' && (
                    <RaceDayControl
                        eventStatus={activeEvent?.status || 'planning'}
                        onUpdateEventStatus={handleUpdateEventStatus}
                        categories={activeEventCategories}
                        participants={activeEventParticipants}
                        splits={activeEventSplits}
                        onRecordSplit={handleRecordSplit}
                        onUpdateParticipantStatus={handleUpdateParticipantStatus}
                        onLogMedicalIssue={handleLogMedical}
                    />
                )}

                {activeTab === 'medical' && (
                    <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Medical Log Cases</h4>
                        <div className="overflow-x-auto text-xs">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                        <th className="pb-2">Tent</th>
                                        <th className="pb-2">Runner Name</th>
                                        <th className="pb-2">BIB</th>
                                        <th className="pb-2">Diagnosis</th>
                                        <th className="pb-2">Treatment</th>
                                        <th className="pb-2">Status</th>
                                        <th className="pb-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeEventMedicalLogs.map(log => (
                                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="py-3 font-bold text-slate-800 dark:text-white">{log.tentNumber}</td>
                                            <td className="py-3 font-bold">{log.participantName}</td>
                                            <td className="py-3 font-mono text-slate-500">{log.bibNumber}</td>
                                            <td className="py-3">{log.diagnosis}</td>
                                            <td className="py-3 text-slate-500">{log.treatment || '-'}</td>
                                            <td className="py-3">
                                                {log.status === 'treated_and_released' && <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-bold">RELEASED</span>}
                                                {log.status === 'under_observation' && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-bold">OBSERVATION</span>}
                                                {log.status === 'referred_to_hospital' && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-bold">REFERRED (ER)</span>}
                                            </td>
                                            <td className="py-3 text-right">
                                                {log.status === 'under_observation' && (
                                                    <button
                                                        onClick={() => {
                                                            const updated = { ...log, status: 'treated_and_released' as const };
                                                            apiService.saveModuleRecord('event_medical_logs', updated).then(() => loadEventData());
                                                        }}
                                                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-[9px]"
                                                    >
                                                        Clear Patient
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {activeEventMedicalLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400">No medical cases logged.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'fundraising' && (
                    <FundraisingTracker
                        participants={activeEventParticipants}
                        pledges={activeEventPledges}
                        onAddPledge={handleAddPledge}
                        onConfirmPledgePayment={handleConfirmPledgePayment}
                    />
                )}

                {activeTab === 'leaderboard' && (
                    <EventLeaderboard
                        categories={activeEventCategories}
                        participants={activeEventParticipants}
                        splits={activeEventSplits}
                        eventName={activeEvent?.name || ''}
                    />
                )}

                {activeTab === 'bankfeeds' && (
                    <div className="space-y-6">
                        {/* Summary cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Bank Receipts (Paid)</span>
                                <div className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">
                                    KES {activeEventTransactions.filter(t => t.status === 'completed' || t.status === 'success' || t.status === 'paid' || t.status === 'reconciled').reduce((acc, curr) => acc + Number(curr.amount || 0), 0)?.toLocaleString()}
                                </div>
                                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                                    {activeEventTransactions.filter(t => t.status === 'completed' || t.status === 'success' || t.status === 'paid' || t.status === 'reconciled').length} successful transactions
                                </span>
                            </div>
                            
                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pending / Unreconciled</span>
                                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                                    KES {activeEventTransactions.filter(t => t.status === 'pending' || t.status === 'idle' || t.status === 'unreconciled').reduce((acc, curr) => acc + Number(curr.amount || 0), 0)?.toLocaleString()}
                                </div>
                                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                                    {activeEventTransactions.filter(t => t.status === 'pending' || t.status === 'idle' || t.status === 'unreconciled').length} pending checks
                                </span>
                            </div>

                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Failed Attempts</span>
                                <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
                                    {activeEventTransactions.filter(t => t.status === 'failed' || t.status === 'cancelled').length}
                                </div>
                                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                                    Transactions timed out or rejected
                                </span>
                            </div>
                        </div>

                        {/* Transaction List Table */}
                        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Live Bank Feed &amp; API logs</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">Real-time payment logs received via Safaricom M-PESA and NCBA Bank Express API gateways.</p>
                                </div>
                                <button
                                    onClick={loadEventData}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H19" />
                                    </svg>
                                    <span>Refresh Feeds</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto text-xs">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                            <th className="pb-2">Date/Time</th>
                                            <th className="pb-2">Reference</th>
                                            <th className="pb-2">Payer Details</th>
                                            <th className="pb-2">Race Category</th>
                                            <th className="pb-2">Amount (KES)</th>
                                            <th className="pb-2">Gateway Status</th>
                                            <th className="pb-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeEventTransactions.map(tx => {
                                            const meta = safeParseMetadata(tx.metadata);
                                            const catName = categories.find(c => c.id === meta?.categoryId)?.name || 'Unknown Category';
                                            return (
                                                <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                    <td className="py-3 text-slate-500 font-mono">
                                                        {tx.timestamp ? new Date(tx.timestamp)?.toLocaleString() : 'N/A'}
                                                    </td>
                                                    <td className="py-3 font-mono font-bold text-slate-750 dark:text-slate-350">
                                                        {tx.transactionId || tx.checkoutRequestId || 'N/A'}
                                                    </td>
                                                    <td className="py-3">
                                                        <span className="font-bold text-slate-800 dark:text-white block">{tx.payerName || 'Guest Runner'}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">{tx.phoneNumber || tx.customerMobileNumber}</span>
                                                    </td>
                                                    <td className="py-3 text-slate-500">{catName}</td>
                                                    <td className="py-3 font-bold text-slate-850 dark:text-slate-200">
                                                        KES {Number(tx.amount || 0)?.toLocaleString()}
                                                    </td>
                                                    <td className="py-3">
                                                        {(tx.status === 'completed' || tx.status === 'success' || tx.status === 'paid' || tx.status === 'reconciled') ? (
                                                            <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-600 rounded text-[9px] font-bold">PAID</span>
                                                        ) : (tx.status === 'failed' || tx.status === 'cancelled') ? (
                                                            <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/20 text-red-600 rounded text-[9px] font-bold">FAILED</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded text-[9px] font-bold animate-pulse">PENDING</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        {(tx.status === 'pending' || tx.status === 'idle') && (
                                                            <button
                                                                onClick={() => handleVerifyTransactionStatus(tx)}
                                                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-650 dark:text-indigo-400 font-bold rounded text-[9px] transition-all"
                                                            >
                                                                Verify Status
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {activeEventTransactions.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="text-center py-8 text-slate-500 font-bold">
                                                    No API transactions or bank feeds found for this event.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'staff' && (
                    <div className="space-y-6">
                        {/* Table for Staff / Event Managers */}
                        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Event Staff Registry</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">Manage staff members authorized to access and control the Marathon &amp; Event Management console.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setManagerForm({ name: '', email: '', phone: '', staffId: '', gender: 'Male', password: '' });
                                        setIsAddManagerOpen(true);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 animate-fade-in"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>Add Event Manager</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto text-xs">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                            <th className="pb-2">Name</th>
                                            <th className="pb-2">Email</th>
                                            <th className="pb-2">Phone Number</th>
                                            <th className="pb-2">Staff ID / National ID</th>
                                            <th className="pb-2">Gender</th>
                                            <th className="pb-2">System Role</th>
                                            <th className="pb-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {eventManagers.map(mgr => (
                                            <tr key={mgr.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="py-3 font-bold text-slate-850 dark:text-slate-250 flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center text-indigo-650 dark:text-indigo-400 font-black uppercase text-[10px]">
                                                        {mgr.name.slice(0, 2)}
                                                    </div>
                                                    <span>{mgr.name}</span>
                                                </td>
                                                <td className="py-3 text-slate-650 dark:text-slate-400">{mgr.email}</td>
                                                <td className="py-3 font-mono text-slate-500">{mgr.phoneNumber || 'N/A'}</td>
                                                <td className="py-3 font-mono text-slate-500">{mgr.staffId || 'N/A'}</td>
                                                <td className="py-3 capitalize text-slate-500">{mgr.gender || 'N/A'}</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded text-[9px] font-black uppercase">
                                                        Event Manager
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button
                                                        onClick={() => handleDeleteManager(mgr.id)}
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-all active:scale-90"
                                                        title="Revoke Access"
                                                    >
                                                        <Trash2Icon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {eventManagers.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="text-center py-8 text-slate-500 font-bold">
                                                    No registered Event Managers found for this institution.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            <EventRegistrationModal
                isOpen={isRegModalOpen}
                onClose={() => {
                    setIsRegModalOpen(false);
                    setEditingParticipant(null);
                }}
                categories={activeEventCategories}
                eventName={activeEvent?.name || ''}
                onRegister={handleRegisterRunner}
                editingParticipant={editingParticipant}
            />

            {/* Add Event Modal */}
            {isAddEventOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Configure New Event</h3>
                            <button onClick={() => setIsAddEventOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddEvent} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Event Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={eventForm.name}
                                    onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                                    placeholder="e.g. County Charity Marathon 2026"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Banner Image (Optional)</label>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="url"
                                        value={eventForm.bannerUrl}
                                        onChange={e => setEventForm({ ...eventForm, bannerUrl: e.target.value })}
                                        placeholder="Banner URL or click Upload..."
                                        className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        ref={formFileInputRef} 
                                        onChange={(e) => handleFileUpload(e)} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => formFileInputRef.current?.click()} 
                                        disabled={isUploadingBanner}
                                        className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-sm font-bold transition-all whitespace-nowrap disabled:opacity-50"
                                    >
                                        {isUploadingBanner ? 'Uploading...' : 'Upload'}
                                    </button>
                                </div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Description</label>
                                <textarea
                                    value={eventForm.description}
                                    onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                                    placeholder="Brief event outline..."
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Payment Instructions (Optional)</label>
                                <textarea
                                    value={eventForm.paymentInstructions}
                                    onChange={e => setEventForm({ ...eventForm, paymentInstructions: e.target.value })}
                                    placeholder="Enter bank account details, paybill, or till number..."
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="bankIntegrationEnabled"
                                    checked={eventForm.bankIntegrationEnabled}
                                    onChange={e => setEventForm({ ...eventForm, bankIntegrationEnabled: e.target.checked })}
                                    className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <label htmlFor="bankIntegrationEnabled" className="block text-sm font-bold text-slate-800 dark:text-white">Enable Bank / Payment Gateway Integration</label>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">If checked, automated collection will be used when the integration is ready.</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Event Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={eventForm.date}
                                        onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={eventForm.location}
                                        onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                                        placeholder="e.g. Athletic Stadium"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Custom Subdomain (e.g. marathon)</label>
                                <input
                                    type="text"
                                    value={eventForm.customSubdomain}
                                    onChange={e => setEventForm({ ...eventForm, customSubdomain: e.target.value })}
                                    placeholder="Optional subdomain"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md">Create Event</button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && eventInsights && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Collected Revenue</span>
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">KES {eventInsights.totalCollectedRevenue?.toLocaleString()}</div>
                            <p className="text-xs text-slate-500 mt-2 font-medium">Out of KES {eventInsights.totalExpectedRevenue?.toLocaleString()} Expected</p>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Registered</span>
                            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{eventInsights.total}</div>
                            <div className="flex gap-2 mt-2">
                                <span className="text-xs text-slate-500 font-medium">{eventInsights.malePct.toFixed(1)}% Male</span>
                                <span className="text-xs text-slate-500 font-medium">&bull;</span>
                                <span className="text-xs text-slate-500 font-medium">{eventInsights.femalePct.toFixed(1)}% Female</span>
                            </div>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Attendance Rate</span>
                            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{eventInsights.attendanceRate.toFixed(1)}%</div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${eventInsights.attendanceRate}%` }}></div>
                            </div>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Medical Incidents</span>
                            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{activeEventMedicalLogs.length}</div>
                            <p className="text-xs text-slate-500 mt-2 font-medium">{eventInsights.medicalIncidentRate.toFixed(2)}% incident rate</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">Category Breakdown</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Detailed metrics across race divisions</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="p-4 border-b border-slate-100 dark:border-slate-700">Category Name</th>
                                        <th className="p-4 border-b border-slate-100 dark:border-slate-700 text-right">Runners</th>
                                        <th className="p-4 border-b border-slate-100 dark:border-slate-700 text-right">Check-in Rate</th>
                                        <th className="p-4 border-b border-slate-100 dark:border-slate-700 text-right">Collected Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eventInsights.categoryStats.map((cat, i) => {
                                        const checkInPct = cat.runners > 0 ? (cat.checkedIn / cat.runners) * 100 : 0;
                                        return (
                                            <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="p-4">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cat.name}</span>
                                                </td>
                                                <td className="p-4 text-right text-sm font-black text-slate-600 dark:text-slate-400">{cat.runners}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{checkInPct.toFixed(1)}%</span>
                                                        <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                                                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${checkInPct}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                    KES {cat.revenue?.toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'reports' && !eventInsights && (
                <div className="p-12 text-center text-slate-400 text-sm font-bold">
                    No participants registered for this event yet to generate insights.
                </div>
            )}

            {/* Add Category Modal */}
            {isAddCategoryOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{editingCategoryId ? 'Edit Race Category' : 'Add Race Category'}</h3>
                            <button onClick={() => { setIsAddCategoryOpen(false); setEditingCategoryId(null); setCategoryForm({ name: '', distanceKm: '', registrationFee: '', capacity: '', genderRestriction: 'any', startTime: '' }); }} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddCategory} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Category Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={categoryForm.name}
                                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    placeholder="e.g. 21K Half Marathon"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Distance (KM) *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={categoryForm.distanceKm}
                                        onChange={e => setCategoryForm({ ...categoryForm, distanceKm: e.target.value })}
                                        placeholder="21.1"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Entry Fee (KES)</label>
                                    <input
                                        type="number"
                                        value={categoryForm.registrationFee}
                                        onChange={e => setCategoryForm({ ...categoryForm, registrationFee: e.target.value })}
                                        placeholder="1000"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Max Capacity</label>
                                    <input
                                        type="number"
                                        value={categoryForm.capacity}
                                        onChange={e => setCategoryForm({ ...categoryForm, capacity: e.target.value })}
                                        placeholder="e.g. 500"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Gender Restriction</label>
                                    <select
                                        value={categoryForm.genderRestriction}
                                        onChange={e => setCategoryForm({ ...categoryForm, genderRestriction: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="any">Open / Any</option>
                                        <option value="male">Male Only</option>
                                        <option value="female">Female Only</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Race Start Time</label>
                                <input
                                    type="text"
                                    value={categoryForm.startTime}
                                    onChange={e => setCategoryForm({ ...categoryForm, startTime: e.target.value })}
                                    placeholder="e.g. 06:00:00"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>
                            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md">{editingCategoryId ? 'Save Changes' : 'Add Category'}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Manager Modal */}
            {isAddManagerOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Add Event Manager</h3>
                            <button onClick={() => setIsAddManagerOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateManager} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={managerForm.name}
                                    onChange={e => setManagerForm({ ...managerForm, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    value={managerForm.email}
                                    onChange={e => setManagerForm({ ...managerForm, email: e.target.value })}
                                    placeholder="e.g. john.doe@institution.com"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={managerForm.phone}
                                        onChange={e => setManagerForm({ ...managerForm, phone: e.target.value })}
                                        placeholder="e.g. 0712345678"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Staff / National ID</label>
                                    <input
                                        type="text"
                                        value={managerForm.staffId}
                                        onChange={e => setManagerForm({ ...managerForm, staffId: e.target.value })}
                                        placeholder="e.g. 34567890"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Gender</label>
                                    <select
                                        value={managerForm.gender}
                                        onChange={e => setManagerForm({ ...managerForm, gender: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        value={managerForm.password}
                                        onChange={e => setManagerForm({ ...managerForm, password: e.target.value })}
                                        placeholder="Min 6 characters"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95">Save Event Manager</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
