
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Building, Room, Institution, Subject, Course } from '../types.ts';
import { 
    PlusIcon, 
    XIcon, 
    PrinterIcon, 
    ChevronDownIcon, 
    ChevronRightIcon, 
    MagnifyingGlassIcon, 
    BuildingOfficeIcon, 
    CheckIcon, 
    CheckCircleIcon, 
    ArrowPathIcon, 
    PencilIcon, 
    ArchiveBoxIcon, 
    MapPinIcon,
    RectangleStackIcon
} from './icons/index.ts';
import { findLocationCoordinates } from '../services/geminiService.ts';

declare var XLSX: any;

interface BuildingManagerProps {
    buildings: Building[];
    rooms: Room[];
    subjects: Subject[];
    courses: Course[];
    onAddBuilding?: (name: string) => Promise<boolean>;
    onAddBuildings?: (buildings: Omit<Building, 'id' | 'institutionId'>[]) => Promise<void>;
    onUpdateBuilding: (buildingId: string, data: Partial<Omit<Building, 'id' | 'institutionId'>>) => void;
    onDeleteBuilding?: (buildingId: string) => void;
    onAddRoom?: (roomData: Omit<Room, 'id' | 'institutionId'>) => void;
    onUpdateRoom: (roomId: string, data: Partial<Omit<Room, 'id' | 'institutionId'>>) => void;
    onDeleteRoom?: (roomId: string) => void;
    onImportRooms?: (rooms: Omit<Room, 'id' | 'institutionId'>[]) => void;
    currentInstitution?: Institution | null;
    activeView?: 'buildings' | 'rooms'; 
}

// Helper component for reliable QR Code rendering using qrcodejs
const QRCodeCanvas: React.FC<{ text: string; size?: number }> = ({ text, size = 128 }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && (window as any).QRCode) {
            containerRef.current.innerHTML = '';
            try {
                new (window as any).QRCode(containerRef.current, {
                    text: text,
                    width: size,
                    height: size,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : (window as any).QRCode.CorrectLevel.H
                });
            } catch (e) {
                console.error("QR Generation failed", e);
                containerRef.current.innerHTML = "QR Error";
            }
        }
    }, [text, size]);

    if (!(window as any).QRCode) {
        return <div className="text-xs text-red-500">Library Missing</div>;
    }

    return <div ref={containerRef} className="inline-block" />;
};

const RoomQrCodeModal: React.FC<{
    room: Room;
    buildingName: string;
    institutionName: string;
    onClose: () => void;
}> = ({ room, buildingName, institutionName, onClose }) => {
    const qrData = JSON.stringify({ roomId: room.id, roomName: room.name, building: buildingName, institution: institutionName });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div id="printable-qr-code" className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center no-print bg-slate-50 dark:bg-slate-900">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Room QR Identity</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-5 h-5"/></button>
                </div>
                
                <div className="p-8 flex flex-col items-center gap-6 text-center">
                    <div className="hidden print:block mb-4">
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">{institutionName}</h3>
                    </div>
                    
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                        <QRCodeCanvas text={qrData} size={200} />
                    </div>
                    
                    <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight print:text-black">{room.name}</h4>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 print:text-slate-600 uppercase tracking-widest mt-1">{buildingName}</p>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-700/30 px-4 py-2 rounded-lg print:hidden">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Scan to view room details, check-in, or report issues.</p>
                    </div>
                </div>
                
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 no-print flex justify-end">
                    <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
                        <PrinterIcon className="w-5 h-5" /> Print Label
                    </button>
                </div>
            </div>
        </div>
    );
};

const BulkRoomQrModal: React.FC<{
    rooms: Room[];
    buildings: Building[];
    institutionName: string;
    onClose: () => void;
}> = ({ rooms, buildings, institutionName, onClose }) => {
    const buildingMap = useMemo(() => new Map(buildings.map(b => [b.id, b.name])), [buildings]);

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 no-print">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Bulk QR Generator</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Generating {rooms.length} Room Labels</p>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
                            <PrinterIcon className="w-5 h-5" /> Print All
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-8 bg-slate-100 dark:bg-slate-950 printable-area">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-3 print:gap-4">
                        {rooms.map(room => {
                            const bName = buildingMap.get(room.buildingId) || 'Unknown Building';
                            const qrData = JSON.stringify({ roomId: room.id, roomName: room.name, building: bName, institution: institutionName });
                            return (
                                <div key={room.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center break-inside-avoid page-break-inside-avoid print:border-2 print:shadow-none">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{institutionName}</p>
                                    <QRCodeCanvas text={qrData} size={150} />
                                    <div className="mt-4">
                                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{room.name}</h4>
                                        <p className="text-xs font-bold text-slate-500 uppercase mt-1">{bName}</p>
                                        <p className="text-[10px] text-slate-400 mt-2 font-mono">CAP: {room.capacity}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
             <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .printable-area { background: white !important; padding: 0 !important; overflow: visible !important; }
                    body { background: white; }
                    @page { margin: 1cm; size: auto; }
                }
            `}</style>
        </div>
    );
};

const AddRoomForm: React.FC<{ 
    buildings: Building[]; 
    courses: Course[];
    onAddRoom: (roomData: Omit<Room, 'id' | 'institutionId'>) => void; 
    onCancel: () => void;
    currentInstitution?: Institution | null;
}> = ({ buildings, courses, onAddRoom, onCancel, currentInstitution }) => {
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [capacity, setCapacity] = useState('');
    const [equipment, setEquipment] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [buildingId, setBuildingId] = useState('');
    const [isShared, setIsShared] = useState(false);
    const [concurrentSessions, setConcurrentSessions] = useState('1');
    const [searchQuery, setSearchQuery] = useState('');
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [locationError, setLocationError] = useState<string | null>(null);

    const safeBuildings = useMemo(() => (Array.isArray(buildings) ? buildings : []).filter(Boolean), [buildings]);
    const safeCourses = useMemo(() => (Array.isArray(courses) ? courses : []).filter(Boolean), [courses]);

    useEffect(() => {
        if (safeBuildings.length > 0 && !buildingId) {
            setBuildingId(safeBuildings[0].id);
        }
    }, [safeBuildings, buildingId]);

    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';
    const buildingLabel = isSchool ? 'Block' : 'Building';

    useEffect(() => {
        if (currentInstitution?.location) {
            setLatitude(currentInstitution.location.latitude.toString());
            setLongitude(currentInstitution.location.longitude.toString());
        }
    }, [currentInstitution]);

    const handleSearchLocation = async () => {
        if (!searchQuery.trim()) return;
        setLocationStatus('loading');
        setLocationError(null);
        try {
            const result = await findLocationCoordinates(searchQuery);
            if (result) {
                setLatitude(result.latitude.toString());
                setLongitude(result.longitude.toString());
                setLocationStatus('idle');
            } else {
                setLocationError("Could not find location.");
                setLocationStatus('error');
            }
        } catch (err) {
            setLocationError("Failed to search location.");
            setLocationStatus('error');
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation not supported.");
            setLocationStatus('error');
            return;
        }
        setLocationStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLatitude(pos.coords.latitude.toFixed(6));
                setLongitude(pos.coords.longitude.toFixed(6));
                setLocationStatus('idle');
            },
            () => {
                setLocationError("Location access denied.");
                setLocationStatus('error');
            }
        );
    };

    const handleGradeSelect = (courseId: string) => {
        const course = safeCourses.find(c => c.id === courseId);
        if (course) {
            setName(course.name);
            setShortName(course.code);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const capacityNum = parseInt(capacity, 10);
        if (name.trim() && !isNaN(capacityNum) && capacityNum > 0 && buildingId) {
            onAddRoom({
                name,
                shortName,
                buildingId,
                capacity: capacityNum,
                location: latitude && longitude ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : undefined,
                status: 'active',
                equipment: equipment.split(',').map(e => e.trim()).filter(Boolean),
                isShared,
                concurrentSessions: isShared ? (parseInt(concurrentSessions, 10) || 1) : undefined,
            });
            onCancel();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 space-y-8 animate-fade-in-up shadow-sm">
            <div>
                <h5 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Initialize New Facility Room</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">{buildingLabel}</label>
                            <select value={buildingId} onChange={e => setBuildingId(e.target.value)} required className="form-select w-full text-sm">
                                <option value="" disabled>-- Select {buildingLabel} --</option>
                                {safeBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        
                        {isSchool && (
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Grade Templates</label>
                                <select onChange={e => handleGradeSelect(e.target.value)} className="form-select w-full text-sm" value="">
                                    <option value="">-- Choose Pre-fill --</option>
                                    {safeCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Room Title</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="form-input w-full" placeholder="e.g., Room 101" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Capacity</label>
                                <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} required min="1" className="form-input w-full" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Short Code</label>
                                <input type="text" value={shortName} onChange={e => setShortName(e.target.value)} className="form-input w-full font-mono font-bold" placeholder="R101" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-black uppercase text-indigo-600 tracking-widest ml-1">GPS Coordinates</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={handleGetLocation} className="p-1.5 bg-white dark:bg-slate-700 text-indigo-600 rounded-lg shadow-sm border border-indigo-50"><MapPinIcon className="w-4 h-4"/></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 ml-1">Latitude</label>
                                <input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} className="form-input text-sm" placeholder="-1.286..." />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 ml-1">Longitude</label>
                                <input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} className="form-input text-sm" placeholder="36.817..." />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 ml-1">Find on Map</label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search location..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())}
                                    className="form-input pl-9 text-xs" 
                                />
                            </div>
                            {locationError && <p className="text-[9px] text-red-500 font-bold mt-1 ml-1 uppercase">{locationError}</p>}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-between items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} className="h-5 w-5 rounded-lg border-slate-200 text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-600">Shared Session Space</span>
                    </label>
                    {isShared && (
                        <div className="flex items-center gap-2 animate-scale-in">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Limit:</span>
                            <input type="number" value={concurrentSessions} onChange={e => setConcurrentSessions(e.target.value)} min="1" className="form-input w-20 py-1 text-center font-bold" />
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onCancel} className="btn-secondary h-12 px-8 uppercase text-xs tracking-widest font-black">Discard</button>
                    <button type="submit" className="btn-primary h-12 px-12 shadow-xl shadow-indigo-100 uppercase text-xs tracking-widest font-black">Commit Records</button>
                </div>
            </div>
        </form>
    );
};

export const BuildingManager: React.FC<BuildingManagerProps> = ({ buildings = [], rooms = [], subjects, courses, onAddBuilding, onAddBuildings, onUpdateBuilding, onDeleteBuilding, onAddRoom, onUpdateRoom, onDeleteRoom, onImportRooms, currentInstitution, activeView }) => {
    const [internalTab, setInternalTab] = useState<'buildings' | 'rooms'>('buildings');
    const [newBuildingName, setNewBuildingName] = useState('');
    const [isAddingBuilding, setIsAddingBuilding] = useState(false);
    const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
    const [editBuildingName, setEditBuildingName] = useState('');
    const [isAddingRoom, setIsAddingRoom] = useState(false);
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
    const [editRoomData, setEditRoomData] = useState<Partial<Room>>({});
    const [expandedBuildingIds, setExpandedBuildingIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [qrRoom, setQrRoom] = useState<Room | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isBulkQrOpen, setIsBulkQrOpen] = useState(false);

    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';
    const buildingLabel = isSchool ? 'Block' : 'Building';
    const buildingLabelPlural = isSchool ? 'Blocks' : 'Buildings';

    const currentTab = activeView || internalTab;

    const safeBuildings = useMemo(() => (Array.isArray(buildings) ? buildings : []).filter(b => b), [buildings]);
    const safeRooms = useMemo(() => (Array.isArray(rooms) ? rooms : []).filter(r => r), [rooms]);
    const safeCourses = useMemo(() => (Array.isArray(courses) ? courses : []).filter(c => c), [courses]);

    const groupedRooms = useMemo(() => {
        const groups = new Map<string, Room[]>();
        safeBuildings.forEach(b => { if(b) groups.set(b.id, []); });
        const filtered = searchQuery.trim() ? safeRooms.filter(r => r && r.name.toLowerCase().includes(searchQuery.toLowerCase())) : safeRooms;
        filtered.forEach(r => {
            if (r && groups.has(r.buildingId)) {
                groups.get(r.buildingId)!.push(r);
            }
        });
        return groups;
    }, [safeRooms, safeBuildings, searchQuery]);

    const handleAddBuildingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof onAddBuilding !== 'function') return;
        if (newBuildingName.trim() && saveStatus === 'idle') {
            setSaveStatus('saving');
            try {
                const success = await onAddBuilding(newBuildingName.trim());
                if (success) {
                    setSaveStatus('saved');
                    setTimeout(() => {
                        setNewBuildingName('');
                        setIsAddingBuilding(false);
                        setSaveStatus('idle');
                    }, 1500);
                } else {
                    setSaveStatus('idle');
                    alert(`Failed to add ${buildingLabel.toLowerCase()}.`);
                }
            } catch (err) {
                setSaveStatus('idle');
                alert("Connection error.");
            }
        }
    };

    const handleSaveRoomEdit = () => {
        if (editingRoomId && editRoomData) {
            onUpdateRoom(editingRoomId, editRoomData);
            setEditingRoomId(null);
            setEditRoomData({});
        }
    };

    const handleEditBuilding = (b: Building) => {
        setEditingBuildingId(b.id);
        setEditBuildingName(b.name);
    };

    const handleSaveBuildingEdit = () => {
        if (editingBuildingId && editBuildingName.trim()) {
            onUpdateBuilding(editingBuildingId, { name: editBuildingName.trim() });
            setEditingBuildingId(null);
        }
    };

    const handleDeleteBuildingWithConfirm = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}? This will also delete all rooms in this ${buildingLabel.toLowerCase()}.`)) {
            onDeleteBuilding?.(id);
        }
    };

    const handleDeleteRoomWithConfirm = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete room "${name}"?`)) {
            onDeleteRoom?.(id);
        }
    };

    return (
        <div className="space-y-6">
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
                .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
                .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.5rem 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); transform: translateY(-1px); }
                .btn-primary:disabled { opacity: 0.8; cursor: not-allowed; }
                .btn-secondary { background-color: #f1f5f9; color: #475569; font-weight: 600; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; cursor: pointer; }
                .dark .btn-secondary { background-color: #1e293b; color: #f1f5f9; border-color: #334155; }
            `}</style>
            
            {!activeView && (
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6">
                        <button onClick={() => setInternalTab('buildings')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all ${currentTab === 'buildings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{buildingLabelPlural}</button>
                        <button onClick={() => setInternalTab('rooms')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all ${currentTab === 'rooms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Rooms</button>
                    </nav>
                </div>
            )}

            {currentTab === 'buildings' && (
                <section className="space-y-6 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Infrastructure Registry</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Campus Management</p>
                        </div>
                        {onAddBuilding && (
                            <button onClick={() => setIsAddingBuilding(!isAddingBuilding)} className="btn-primary h-11 px-8 shadow-lg shadow-indigo-100">
                                {isAddingBuilding ? <XIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                                {isAddingBuilding ? 'Cancel' : `New ${buildingLabel}`}
                            </button>
                        )}
                    </div>

                    {isAddingBuilding && onAddBuilding && (
                        <form onSubmit={handleAddBuildingSubmit} className="flex flex-col sm:flex-row gap-4 items-end bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 animate-scale-in">
                            <div className="flex-grow w-full">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Official Name</label>
                                <input type="text" value={newBuildingName} onChange={e => setNewBuildingName(e.target.value)} className="form-input" placeholder={`e.g. Science ${buildingLabel}`} required disabled={saveStatus !== 'idle'} />
                            </div>
                            <button 
                                type="submit" 
                                disabled={saveStatus !== 'idle'}
                                className={`btn-primary h-12 px-10 shadow-lg shadow-indigo-100 min-w-[180px] ${saveStatus === 'saved' ? 'bg-green-600' : ''}`}
                            >
                                {saveStatus === 'idle' && <>Initialize {buildingLabel}</>}
                                {saveStatus === 'saving' && <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Saving...</>}
                                {saveStatus === 'saved' && <><CheckCircleIcon className="w-6 h-6" /> Success!</>}
                            </button>
                        </form>
                    )}

                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="relative">
                            <input type="text" placeholder={`Filter ${buildingLabelPlural.toLowerCase()} by name...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input pl-10" />
                            <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {safeBuildings.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())).map(b => (
                            <div key={b.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center group transition-all hover:border-indigo-200">
                                {editingBuildingId === b.id ? (
                                    <div className="flex gap-2 w-full">
                                        <input 
                                            type="text" 
                                            value={editBuildingName} 
                                            onChange={e => setEditBuildingName(e.target.value)} 
                                            className="form-input flex-grow py-1 text-sm font-bold" 
                                            autoFocus 
                                            onKeyDown={e => e.key === 'Enter' && handleSaveBuildingEdit()} 
                                        />
                                        <button onClick={handleSaveBuildingEdit} className="btn-primary h-9 w-9 flex items-center justify-center p-0"><CheckIcon className="w-5 h-5" /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                                <BuildingOfficeIcon className="w-6 h-6 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-lg tracking-tight uppercase">{b.name}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{groupedRooms.get(b.id)?.length || 0} Registered Rooms</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleEditBuilding(b)} className="text-indigo-600 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"><PencilIcon className="w-4 h-4"/></button>
                                            {onDeleteBuilding && (
                                                <button onClick={() => handleDeleteBuildingWithConfirm(b.id, b.name)} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"><ArchiveBoxIcon className="w-4 h-4"/></button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {currentTab === 'rooms' && (
                <section className="space-y-6 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Facility Matrix</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Classroom & Lab Registry</p>
                        </div>
                         <div className="flex items-center gap-2">
                             <button onClick={() => setIsBulkQrOpen(true)} className="btn-secondary h-11 flex items-center gap-2 px-6 shadow-sm">
                                <PrinterIcon className="w-5 h-5" /> Bulk QR Labels
                            </button>
                            {onAddRoom && (
                                <button onClick={() => setIsAddingRoom(!isAddingRoom)} className="btn-primary h-11 flex items-center gap-2 px-8 shadow-lg shadow-indigo-100">
                                    {isAddingRoom ? <XIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                                    {isAddingRoom ? 'Cancel' : 'New Room'}
                                </button>
                            )}
                        </div>
                    </div>

                    {isAddingRoom && onAddRoom && (
                        <AddRoomForm buildings={safeBuildings} courses={safeCourses} onAddRoom={onAddRoom} onCancel={() => setIsAddingRoom(false)} currentInstitution={currentInstitution} />
                    )}

                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="relative">
                            <input type="text" placeholder="Search rooms by name or number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input pl-10" />
                            <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {Array.from(groupedRooms.entries()).map(([bId, bRooms]) => {
                            const building = safeBuildings.find(b => b.id === bId);
                            const isExpanded = expandedBuildingIds.has(bId);
                            if (bRooms.length === 0 && !searchQuery) return null;
                            return (
                                <div key={bId} className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <button onClick={() => setExpandedBuildingIds(prev => {
                                        const next = new Set(prev);
                                        if (next.has(bId)) next.delete(bId); else next.add(bId);
                                        return next;
                                    })} className="w-full flex justify-between items-center p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-2xl">
                                                <BuildingOfficeIcon className="w-6 h-6 text-slate-500" />
                                            </div>
                                            <div className="text-left text-slate-900 dark:text-white">
                                                <h4 className="font-black uppercase tracking-tight text-lg">{building?.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bRooms.length} Registered Rooms</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {isExpanded ? <ChevronDownIcon className="w-6 h-6 text-slate-400" /> : <ChevronRightIcon className="w-6 h-6 text-slate-400" />}
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="p-6 pt-0 border-t border-slate-50 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                                            {bRooms.map(room => (
                                                <div key={room.id} className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 relative group transition-all hover:border-indigo-200">
                                                    {editingRoomId === room.id ? (
                                                        <div className="space-y-3">
                                                            <input type="text" value={editRoomData.name || ''} onChange={e => setEditRoomData({...editRoomData, name: e.target.value})} className="form-input py-1 text-sm font-bold" placeholder="Name" />
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input type="text" value={editRoomData.shortName || ''} onChange={e => setEditRoomData({...editRoomData, shortName: e.target.value})} className="form-input py-1 text-sm" placeholder="Short Code" />
                                                                <input type="number" value={editRoomData.capacity || ''} onChange={e => setEditRoomData({...editRoomData, capacity: parseInt(e.target.value) || 0})} className="form-input py-1 text-sm" placeholder="Capacity" />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input type="number" step="any" value={editRoomData.location?.latitude || ''} onChange={e => setEditRoomData({...editRoomData, location: { latitude: parseFloat(e.target.value) || 0, longitude: editRoomData.location?.longitude || 0 }})} className="form-input py-1 text-xs" placeholder="Lat" />
                                                                <input type="number" step="any" value={editRoomData.location?.longitude || ''} onChange={e => setEditRoomData({...editRoomData, location: { latitude: editRoomData.location?.latitude || 0, longitude: parseFloat(e.target.value) || 0 }})} className="form-input py-1 text-xs" placeholder="Lon" />
                                                            </div>
                                                            <div className="flex gap-2 pt-2">
                                                                <button onClick={handleSaveRoomEdit} className="btn-primary flex-1 py-1 px-4 text-xs font-black">Save</button>
                                                                <button onClick={() => setEditingRoomId(null)} className="btn-secondary flex-1 py-1 px-4 text-xs font-black">Cancel</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{room.name}</h5>
                                                                <span className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border text-indigo-500 uppercase">{room.shortName}</span>
                                                            </div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacity: <span className="text-slate-900 dark:text-white">{room.capacity} Units</span></p>
                                                            {room.location && (
                                                                <p className="text-[9px] font-mono text-slate-400 truncate mb-6">Loc: {room.location.latitude.toFixed(4)}, {room.location.longitude.toFixed(4)}</p>
                                                            )}
                                                            {!room.location && <div className="h-6 mb-6"></div>}
                                                            <div className="flex items-center gap-3">
                                                                <button onClick={() => { setEditingRoomId(room.id); setEditRoomData(room); }} className="text-[10px] font-black uppercase text-indigo-600 tracking-widest hover:underline flex items-center gap-1 transition-all"><PencilIcon className="w-3 h-3"/> Edit</button>
                                                                <button onClick={() => setQrRoom(room)} className="text-[10px] font-black uppercase text-slate-500 tracking-widest hover:underline transition-all">QR Card</button>
                                                                {onDeleteRoom && (
                                                                    <button onClick={() => { if(window.confirm('Purge room?')) onDeleteRoom(room.id); }} className="text-[10px] font-black uppercase text-red-500 tracking-widest hover:underline flex items-center gap-1 transition-all"><ArchiveBoxIcon className="w-3 h-3"/> Purge</button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {qrRoom && (
                <RoomQrCodeModal
                    room={qrRoom}
                    buildingName={safeBuildings.find(b => b.id === qrRoom.buildingId)?.name || 'Unknown Building'}
                    institutionName={currentInstitution?.name || 'EduAi Institution'}
                    onClose={() => setQrRoom(null)}
                />
            )}

            {isBulkQrOpen && (
                <BulkRoomQrModal
                    rooms={safeRooms}
                    buildings={safeBuildings}
                    institutionName={currentInstitution?.name || 'EduAi Institution'}
                    onClose={() => setIsBulkQrOpen(false)}
                />
            )}
        </div>
    );
};
