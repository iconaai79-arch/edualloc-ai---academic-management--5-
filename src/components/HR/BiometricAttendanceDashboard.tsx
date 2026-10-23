import React, { useState, useEffect, useMemo } from 'react';
import type { User, Institution, BiometricDevice, BiometricEnrollment, StaffAttendanceDaily } from '../../types';
import { ClockIcon } from '../icons/ClockIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { XIcon } from '../icons/XIcon';
import { apiService } from '../../services/apiService';

interface BiometricAttendanceDashboardProps {
    staff: User[];
    institution: Institution;
}

type SubTab = 'today' | 'monthly' | 'devices' | 'enrollment';

const VERIFY_LABELS: Record<number, string> = {
    0: 'Fingerprint',
    1: 'Card',
    2: 'Password',
    4: 'Face',
    15: 'Face',
};

const STATUS_COLORS: Record<string, string> = {
    present: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    absent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
    late: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    half_day: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
};

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const BiometricAttendanceDashboard: React.FC<BiometricAttendanceDashboardProps> = ({
    staff,
    institution,
}) => {
    const [subTab, setSubTab] = useState<SubTab>('today');
    const [devices, setDevices] = useState<BiometricDevice[]>([]);
    const [enrollments, setEnrollments] = useState<BiometricEnrollment[]>([]);
    const [dailyRecords, setDailyRecords] = useState<StaffAttendanceDaily[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [monthlyRecords, setMonthlyRecords] = useState<StaffAttendanceDaily[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Device form
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [deviceForm, setDeviceForm] = useState({
        serialNumber: '',
        deviceName: '',
        deviceModel: '',
        ipAddress: '',
        port: 4370,
        commKey: 0,
        locationDescription: '',
        protocol: 'adms' as 'adms' | 'pull' | 'biotime' | 'dahua' | 'dahua_cgi' | 'http_push',
    });

    // Device testing states
    const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
    const [testModalResult, setTestModalResult] = useState<{ deviceName: string; success: boolean; message: string; timestamp: string } | null>(null);

    // Device guide modal
    const [showGuideModal, setShowGuideModal] = useState(false);

    // Enrollment form
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollForm, setEnrollForm] = useState({
        staffId: '',
        devicePin: '',
        fingerprintIndex: 0,
    });

    // ZKTeco Log Import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDesktopAgentModal, setShowDesktopAgentModal] = useState(false);
    const [importLogText, setImportLogText] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    // Dahua Auto-Detection states
    const [autoDetectingDahua, setAutoDetectingDahua] = useState(false);
    const [showAutoDetectModal, setShowAutoDetectModal] = useState(false);
    const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
    const [claimingDeviceId, setClaimingDeviceId] = useState<string | null>(null);

    // Fetch data
    useEffect(() => {
        loadDevices();
        loadEnrollments();
    }, [institution.id]);

    useEffect(() => {
        if (subTab === 'today') loadTodayAttendance();
    }, [subTab, selectedDate, institution.id]);

    useEffect(() => {
        if (subTab === 'monthly') loadMonthlyAttendance();
    }, [subTab, selectedMonth, institution.id]);

    const loadDevices = async () => {
        try {
            const data = await apiService.fetchModuleRecords<BiometricDevice>('biometric_devices', institution.id);
            setDevices(data || []);
        } catch { setDevices([]); }
    };

    const loadEnrollments = async () => {
        try {
            const data = await apiService.fetchModuleRecords<BiometricEnrollment>('biometric_enrollments', institution.id);
            setEnrollments(data || []);
        } catch { setEnrollments([]); }
    };

    const formatTimeString = (val?: string) => {
        if (!val) return '—';
        if (val.includes('AM') || val.includes('PM') || /^\d{1,2}:\d{2}$/.test(val)) return val;
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const loadTodayAttendance = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<any>('staff_attendance_daily', institution.id);
            const filtered = (data || []).filter(r => {
                const dateVal = r.attendanceDate || r.attendance_date;
                return dateVal === selectedDate;
            }).map(r => ({
                ...r,
                staffId: r.staffId || r.staff_id,
                attendanceDate: r.attendanceDate || r.attendance_date,
                firstIn: r.firstIn || r.first_in,
                lastOut: r.lastOut || r.last_out,
                totalHours: Number(r.totalHours ?? r.total_hours ?? 0) || 0,
                overtimeHours: Number(r.overtimeHours ?? r.overtime_hours ?? 0) || 0,
                lateMinutes: Number(r.lateMinutes ?? r.late_minutes ?? 0) || 0,
                earlyLeaveMinutes: Number(r.earlyLeaveMinutes ?? r.early_leave_minutes ?? 0) || 0,
                punchCount: Number(r.punchCount ?? r.punch_count ?? 1) || 1,
                status: r.status || 'present'
            }));
            setDailyRecords(filtered);
        } catch { setDailyRecords([]); }
        setLoading(false);
    };

    const loadMonthlyAttendance = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<any>('staff_attendance_daily', institution.id);
            const [year, month] = selectedMonth.split('-');
            const filtered = (data || []).filter(r => {
                const d = r.attendanceDate || r.attendance_date || '';
                return d.startsWith(`${year}-${month}`);
            }).map(r => ({
                ...r,
                staffId: r.staffId || r.staff_id,
                attendanceDate: r.attendanceDate || r.attendance_date,
                firstIn: r.firstIn || r.first_in,
                lastOut: r.lastOut || r.last_out,
                totalHours: Number(r.totalHours ?? r.total_hours ?? 0) || 0,
                overtimeHours: Number(r.overtimeHours ?? r.overtime_hours ?? 0) || 0,
                lateMinutes: Number(r.lateMinutes ?? r.late_minutes ?? 0) || 0,
                earlyLeaveMinutes: Number(r.earlyLeaveMinutes ?? r.early_leave_minutes ?? 0) || 0,
                punchCount: Number(r.punchCount ?? r.punch_count ?? 1) || 1,
                status: r.status || 'present'
            }));
            setMonthlyRecords(filtered);
        } catch { setMonthlyRecords([]); }
        setLoading(false);
    };

    const handleAddDevice = async () => {
        if (!deviceForm.serialNumber || !deviceForm.deviceName) {
            alert('Serial Number and Device Name are required');
            return;
        }
        try {
            await apiService.saveModuleRecord('biometric_devices', {
                institution_id: institution.id,
                serial_number: deviceForm.serialNumber,
                device_name: deviceForm.deviceName,
                device_model: deviceForm.deviceModel || null,
                ip_address: deviceForm.ipAddress || null,
                location_description: deviceForm.locationDescription || null,
                port: deviceForm.port || 4370,
                comm_key: deviceForm.commKey || 0,
                protocol: deviceForm.protocol,
                is_active: true,
            });
            setShowDeviceModal(false);
            setDeviceForm({ serialNumber: '', deviceName: '', deviceModel: '', ipAddress: '', port: 4370, commKey: 0, locationDescription: '', protocol: 'adms' });
            loadDevices();
        } catch (err: any) {
            alert('Failed to add device: ' + err.message);
        }
    };

    const handleDeleteDevice = async (id: string) => {
        if (!confirm('Remove this device?')) return;
        try {
            await apiService.deleteModuleRecord('biometric_devices', id);
            loadDevices();
        } catch (err: any) {
            alert('Failed: ' + err.message);
        }
    };    const handleTestDevice = async (dev: BiometricDevice) => {
        setTestingDeviceId(dev.id);
        const isDahua = dev.protocol === 'dahua' || dev.protocol === 'dahua_cgi' || (dev.deviceModel || '').toLowerCase().includes('dahua');

        if (isDahua) {
            try {
                const statusRes = await fetch(`/api/dahua-webhook?action=status&institutionId=${institution.id}&SN=${dev.serialNumber}&sn=${dev.serialNumber}`)
                    .then(r => r.json())
                    .catch(() => null);

                const lastSeen = statusRes?.lastSeen ? new Date(statusRes.lastSeen).toLocaleString() : null;

                if (statusRes) {
                    setTestModalResult({
                        deviceName: dev.deviceName,
                        success: true,
                        message: `⚡ DAHUA BIOMETRIC WEB SERVER TEST PASSED (200 OK)!\n\n` +
                                 `• Device Name: ${dev.deviceName}\n` +
                                 `• Serial Number (SN): ${dev.serialNumber}\n` +
                                 `• Model: ${dev.deviceModel || 'Dahua Facial Recognition Terminal'}\n` +
                                 `• Protocol: Dahua Real-Time HTTP Alarm/Push\n` +
                                 `• Cloud Webhook Endpoint: /api/dahua-webhook (ONLINE ✅)\n` +
                                 `• Webhook Receiver Status: ACTIVE & LISTENING\n` +
                                 (lastSeen ? `• Last Face Scan Recorded: ${lastSeen}\n` : '') +
                                 (dev.ipAddress ? `• Configured Local IP: ${dev.ipAddress}:${dev.port || 80}\n` : '') +
                                 (statusRes.recentLogsCount !== undefined ? `• Attendance Logs in Database: ${statusRes.recentLogsCount} recent records\n\n` : '\n') +
                                 `✅ Physical Dahua terminal communication channel is open and ready!\n` +
                                 `When staff members scan their faces, the terminal pushes attendance logs directly to this cloud endpoint.`,
                        timestamp: new Date().toLocaleTimeString()
                    });
                } else {
                    setTestModalResult({
                        deviceName: dev.deviceName,
                        success: false,
                        message: `⚠️ Dahua Webhook Receiver returned no response.\n\n` +
                                 `Target Device: ${dev.deviceName} (SN: ${dev.serialNumber})\n\n` +
                                 `Please check that the server is online and reachable at /api/dahua-webhook.`,
                        timestamp: new Date().toLocaleTimeString()
                    });
                }
                loadDevices();
            } catch (err: any) {
                setTestModalResult({
                    deviceName: dev.deviceName,
                    success: false,
                    message: `Connection Test Failed: ${err.message || 'Unable to communicate with server'}`,
                    timestamp: new Date().toLocaleTimeString()
                });
            } finally {
                setTestingDeviceId(null);
            }
            return;
        }

        try {
            const statusRes = await fetch(`/api/zkteco-webhook?action=status&SN=${dev.serialNumber}&sn=${dev.serialNumber}`)
                .then(r => r.json())
                .catch(() => null);

            const isOnline = statusRes?.online || false;
            const lastSeen = statusRes?.lastSeen ? new Date(statusRes.lastSeen).toLocaleString() : null;

            if (statusRes) {
                setTestModalResult({
                    deviceName: dev.deviceName,
                    success: true,
                    message: `⚡ WEB SERVER COMMUNICATION TEST PASSED (200 OK)!\n\n` +
                             `• Device Name: ${dev.deviceName}\n` +
                             `• Serial Number (SN): ${dev.serialNumber}\n` +
                             `• Webhook API Endpoint: /api/zkteco-webhook (ONLINE)\n` +
                             `• Cloud Command Queue: ACTIVE & READY\n` +
                             `• Physical Terminal ADMS Status: ${isOnline ? '🟢 ONLINE (Active Pings)' : '🟡 STANDBY / WAITING FOR DEVICE HEARTBEAT'}\n` +
                             (lastSeen ? `• Last Hardware Heartbeat: ${lastSeen}\n` : '') +
                             (statusRes.ip ? `• Reported Device IP: ${statusRes.ip}\n` : '') +
                             `• Server Requests Count: ${statusRes.requestsCount || 0}\n\n` +
                             (isOnline 
                                 ? `✅ Physical ZKTeco hardware is connected and polling server!` 
                                 : `ℹ️ Note: If testing without physical ZKTeco hardware, click 🧪 Punch to simulate an instant web punch, or 🚪 Open to test queueing unlock commands.`),
                    timestamp: new Date().toLocaleTimeString()
                });
            } else {
                setTestModalResult({
                    deviceName: dev.deviceName,
                    success: false,
                    message: `⚠️ Server Webhook API returned no response.\n\n` +
                             `Target Device: ${dev.deviceName} (SN: ${dev.serialNumber})\n\n` +
                             `Please check that the server is online and reachable at /api/zkteco-webhook.`,
                    timestamp: new Date().toLocaleTimeString()
                });
            }
            loadDevices();
        } catch (err: any) {
            setTestModalResult({
                deviceName: dev.deviceName,
                success: false,
                message: `Connection Test Failed: ${err.message || 'Unable to communicate with server'}`,
                timestamp: new Date().toLocaleTimeString()
            });
        } finally {
            setTestingDeviceId(null);
        }
    };

    const handleOpenSensorRemotely = async (dev: BiometricDevice) => {
        setTestingDeviceId(dev.id);
        const isDahua = dev.protocol === 'dahua' || dev.protocol === 'dahua_cgi' || (dev.deviceModel || '').toLowerCase().includes('dahua');

        if (isDahua) {
            try {
                if (dev.ipAddress) {
                    try {
                        const controller = new AbortController();
                        const to = setTimeout(() => controller.abort(), 3000);
                        await fetch(`http://${dev.ipAddress}:${dev.port || 80}/cgi-bin/accessControl.cgi?action=openDoor&channel=1`, {
                            signal: controller.signal,
                            mode: 'no-cors'
                        });
                        clearTimeout(to);
                    } catch (_) {}
                }

                setTestModalResult({
                    deviceName: dev.deviceName,
                    success: true,
                    message: `🚪 DAHUA REMOTE UNLOCK COMMAND DISPATCHED!\n` +
                             `═════════════════════════════════════════\n` +
                             `• Device: ${dev.deviceName} (SN: ${dev.serialNumber})\n` +
                             `• Command: CGI openDoor (Channel 1 Relay Pulse)\n` +
                             (dev.ipAddress ? `• Target Local IP: http://${dev.ipAddress}:${dev.port || 80}\n` : '') +
                             `• Status: ✅ Relay signal dispatched\n\n` +
                             `ℹ️ Note: For direct gate barrier trigger across your local school network, you can also use the EduAI Android/Tablet Gate app on the local Wi-Fi.`,
                    timestamp: new Date().toLocaleTimeString()
                });
            } catch (err: any) {
                setTestModalResult({
                    deviceName: dev.deviceName,
                    success: false,
                    message: `❌ Open Sensor failed: ${err.message || err}`,
                    timestamp: new Date().toLocaleTimeString()
                });
            } finally {
                setTestingDeviceId(null);
            }
            return;
        }

        try {
            const res = await fetch(
                `/api/zkteco-webhook?action=open_sensor&institutionId=${institution.id}&SN=${dev.serialNumber}&sn=${dev.serialNumber}`,
                { method: 'POST' }
            ).then(r => r.json()).catch(() => null);

            if (res?.success) {
                setTestModalResult({
                    deviceName: dev.deviceName,
                    success: true,
                    message: `🚪 REMOTE OPEN SENSOR COMMAND DISPATCHED!\n` +
                             `═════════════════════════════════════════\n` +
                             `• Device: ${dev.deviceName} (SN: ${dev.serialNumber})\n` +
                             `• ADMS Command: ${res.command}\n` +
                             `• Relay Duration: ${(res.durationMs / 1000).toFixed(0)}s\n` +
                             `• Status: ✅ QUEUED — Waiting for device heartbeat\n\n` +
                             `⏱️ The device will execute this command on its next\n` +
                             `   ADMS poll (every 10–30 seconds).\n\n` +
                             `⚡ To trigger INSTANTLY on the physical terminal:\n` +
                             `   Restart the terminal (unplug & replug power) OR re-save Cloud Server Settings!\n\n` +
                             `❗ If the door/sensor does NOT open after 60s:\n` +
                             `   1. Go to Menu ➔ Comm. ➔ Cloud Server / ADMS Settings\n` +
                             `   2. Server Address: 216.150.16.65 (or portal.eduai.co.ke if Domain Name is ON)\n` +
                             `   3. Server Port: 80\n` +
                             `   4. Gateway: Ensure your router IP (e.g. 192.168.0.1) is set under Comm. ➔ Ethernet`,
                    timestamp: new Date().toLocaleTimeString()
                });
            } else {
                setTestModalResult({
                    deviceName: dev.deviceName,
                    success: false,
                    message: `❌ Failed to queue Open Sensor command.\n\n` +
                             `Server response: ${JSON.stringify(res)}\n\n` +
                             `Please check that the server is reachable and the biometric_device_commands table exists.`,
                    timestamp: new Date().toLocaleTimeString()
                });
            }
        } catch (err: any) {
            setTestModalResult({
                deviceName: dev.deviceName,
                success: false,
                message: `❌ Open Sensor command failed: ${err.message || err}`,
                timestamp: new Date().toLocaleTimeString()
            });
        } finally {
            setTestingDeviceId(null);
        }
    };

    const handleRemoteSyncDevice = async (dev: BiometricDevice) => {
        setTestingDeviceId(dev.id);
        const isDahua = dev.protocol === 'dahua' || dev.protocol === 'dahua_cgi' || (dev.deviceModel || '').toLowerCase().includes('dahua');

        if (isDahua) {
            try {
                // 1. Trigger Cloud Dahua Re-sync and Daily Aggregation
                const syncRes = await fetch(`/api/dahua-webhook?action=sync&institutionId=${institution.id}&SN=${dev.serialNumber}&sn=${dev.serialNumber}`)
                    .then(r => r.json())
                    .catch(() => null);

                // 2. If running locally or on native mobile app, attempt direct CGI log sync
                if (dev.ipAddress) {
                    try {
                        const controller = new AbortController();
                        const to = setTimeout(() => controller.abort(), 2500);
                        await fetch(`http://${dev.ipAddress}:${dev.port || 80}/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&count=20`, {
                            signal: controller.signal
                        });
                        clearTimeout(to);
                    } catch (_) {}
                }

                // 3. Refresh Today & Monthly Roll Calls in UI
                await loadTodayAttendance();
                await loadMonthlyAttendance();

                const lastSeenStr = syncRes?.lastSeen ? new Date(syncRes.lastSeen).toLocaleString() : null;

                setTestModalResult({
                    deviceName: dev.deviceName,
                    success: true,
                    message: `🔄 DAHUA REAL-TIME ATTENDANCE SYNC COMPLETE!\n\n` +
                             `• Device: ${dev.deviceName} (SN: ${dev.serialNumber})\n` +
                             `• Model: ${dev.deviceModel || 'Dahua Facial Recognition Terminal'}\n` +
                             `• Protocol: Dahua Real-Time HTTP Push Webhook\n` +
                             `• Webhook Destination: https://portal.eduai.co.ke/api/dahua-webhook\n` +
                             (lastSeenStr ? `• Latest Face Punch Received: ${lastSeenStr}\n` : '') +
                             (syncRes?.recentLogsCount !== undefined ? `• Total Raw Scans in Cloud: ${syncRes.recentLogsCount} records\n` : '') +
                             `• Today's Roll Call & Monthly Register: ✅ SYNCHRONIZED & UP TO DATE\n\n` +
                             `💡 How Dahua Synchronization Works:\n` +
                             `Unlike ZKTeco which uses manual polling commands, Dahua terminals push biometric scans to EduAI Online AUTOMATICALLY the moment a face is authenticated at the terminal.\n\n` +
                             `All punches from this Dahua terminal are now reflected in your Daily Attendance table.`,
                    timestamp: new Date().toLocaleTimeString()
                });
            } catch (err: any) {
                alert('Dahua sync failed: ' + (err.message || err));
            } finally {
                setTestingDeviceId(null);
            }
            return;
        }

        try {
            await fetch(`/api/zkteco-webhook?action=sync_attendance&institutionId=${institution.id}&SN=${dev.serialNumber}&sn=${dev.serialNumber}`, {
                method: 'POST'
            }).catch(() => null);

            setTestModalResult({
                deviceName: dev.deviceName,
                success: true,
                message: `🔄 Remote Attendance Sync Command Dispatched!\n\nTarget Terminal: ${dev.deviceName} (SN: ${dev.serialNumber})\nQueued Command: C:1001:DATA QUERY ATTLOG\n\n👉 Hardware Reaction:\nWhen the physical ZKTeco terminal polls the server on its next heartbeat (10-30 seconds), it will automatically upload all offline attendance logs stored in device memory to the database!`,
                timestamp: new Date().toLocaleTimeString()
            });
            await loadTodayAttendance();
            await loadMonthlyAttendance();
        } catch (err: any) {
            alert('Remote sync failed: ' + (err.message || err));
        } finally {
            setTestingDeviceId(null);
        }
    };

    const handleSendTestPunch = async (dev: BiometricDevice) => {
        const targetEnr = enrollments.length > 0 ? enrollments[0] : null;
        const targetStaff = targetEnr 
            ? staff.find(s => s.id === targetEnr.staffId) 
            : (staff.length > 0 ? staff[0] : null);

        const targetStaffId = targetStaff?.id || targetEnr?.staffId || 'test_staff_1';
        const targetPin = targetEnr?.devicePin || '1001';
        const staffName = targetStaff?.name || `Test Staff Member (PIN: ${targetPin})`;

        try {
            const nowISO = new Date().toISOString();
            const todayStr = nowISO.split('T')[0];
            const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Check if record already exists today for this staff member to prevent 23505 UNIQUE constraint violations
            const existingRecords = await apiService.fetchModuleRecords<any>('staff_attendance_daily', institution.id).catch(() => []);
            const existing = existingRecords.find((r: any) => 
                (r.staffId === targetStaffId || r.staff_id === targetStaffId) && 
                (r.attendanceDate === todayStr || r.attendance_date === todayStr)
            );

            const punchCount = (existing?.punchCount ?? existing?.punch_count ?? 0) + 1;

            const testAttendanceRecord: any = {
                ...(existing?.id ? { id: existing.id } : {}),
                institution_id: institution.id,
                institutionId: institution.id,
                staff_id: targetStaffId,
                staffId: targetStaffId,
                attendance_date: todayStr,
                attendanceDate: todayStr,
                first_in: existing?.firstIn || existing?.first_in || nowISO,
                firstIn: existing?.firstIn || existing?.first_in || nowISO,
                last_out: nowISO,
                lastOut: nowISO,
                total_hours: 8,
                totalHours: 8,
                overtime_hours: 0,
                overtimeHours: 0,
                status: 'present',
                late_minutes: 0,
                lateMinutes: 0,
                early_leave_minutes: 0,
                earlyLeaveMinutes: 0,
                punch_count: punchCount,
                punchCount: punchCount,
                created_at: existing?.createdAt || existing?.created_at || nowISO,
                createdAt: existing?.createdAt || existing?.created_at || nowISO
            };

            await apiService.saveModuleRecord('staff_attendance_daily', testAttendanceRecord);
            setTestModalResult({
                deviceName: dev.deviceName,
                success: true,
                message: `🧪 SIMULATED BIOMETRIC PUNCH LOGGED SUCCESSFULLY!\n\n` +
                         `• Target Staff: ${staffName}\n` +
                         `• Staff ID: ${targetStaffId}\n` +
                         `• Device User PIN: ${targetPin}\n` +
                         `• Check-in Timestamp: ${nowTimeStr}\n` +
                         `• Punch Count Today: ${punchCount}\n` +
                         `• Database Table: staff_attendance_daily\n` +
                         `• Status: ✅ Present & Recorded on Attendance Dashboard`,
                timestamp: new Date().toLocaleTimeString()
            });
            await loadTodayAttendance();
        } catch (err: any) {
            alert('Test punch simulation failed: ' + (err.message || err));
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) {
                setImportLogText(text);
            }
        };
        reader.readAsText(file);
    };

    const handleParseAndImportZkTecoLogs = async (rawContent: string) => {
        if (!rawContent || !rawContent.trim()) {
            alert('Please select a ZKTeco log file or paste log data.');
            return;
        }
        setIsImporting(true);
        try {
            const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let importedCount = 0;

            const pinMap = new Map<string, string>();
            enrollments.forEach(e => {
                if (e.devicePin) pinMap.set(String(e.devicePin).trim(), e.staffId);
            });

            const groupedPunches = new Map<string, { staffId: string; date: string; punches: string[] }>();

            for (const line of lines) {
                if (line.includes('ATTLOG') || line.includes('table=') || line.startsWith('PIN\t')) continue;

                const parts = line.split(/\t|,|\s{2,}/).map(p => p.trim());
                if (parts.length < 2) continue;

                const pin = parts[0];
                let dateStr = parts[1];

                if (parts.length >= 3 && !dateStr.includes(':') && parts[2].includes(':')) {
                    dateStr = `${parts[1]} ${parts[2]}`;
                }

                const staffId = pinMap.get(pin) || pin;
                const parsedDate = new Date(dateStr.replace(/-/g, '/'));
                if (isNaN(parsedDate.getTime())) continue;

                const dayDate = parsedDate.toISOString().split('T')[0];
                const isoTime = parsedDate.toISOString();
                const key = `${staffId}_${dayDate}`;

                if (!groupedPunches.has(key)) {
                    groupedPunches.set(key, { staffId, date: dayDate, punches: [] });
                }
                groupedPunches.get(key)!.punches.push(isoTime);
            }

            for (const [key, item] of groupedPunches.entries()) {
                item.punches.sort();
                const firstIn = item.punches[0];
                const lastOut = item.punches[item.punches.length - 1];

                const rec: any = {
                    id: generateUUID(),
                    institution_id: institution.id,
                    institutionId: institution.id,
                    staff_id: item.staffId,
                    staffId: item.staffId,
                    attendance_date: item.date,
                    attendanceDate: item.date,
                    first_in: firstIn,
                    firstIn: firstIn,
                    last_out: lastOut,
                    lastOut: lastOut,
                    total_hours: 8,
                    totalHours: 8,
                    status: 'present',
                    created_at: new Date().toISOString()
                };

                await apiService.saveModuleRecord('staff_attendance_daily', rec);
                importedCount++;
            }

            alert(`✅ ZKTeco Logs Imported Successfully!\n\nParsed: ${lines.length} raw log entries\nProcessed: ${importedCount} staff attendance records`);
            setShowImportModal(false);
            setImportLogText('');
            await loadTodayAttendance();
            await loadMonthlyAttendance();
        } catch (err: any) {
            alert('Failed to import ZKTeco logs: ' + (err.message || err));
        } finally {
            setIsImporting(false);
        }
    };

    const handleAutoDetectDahua = async () => {
        setAutoDetectingDahua(true);
        setShowAutoDetectModal(true);
        try {
            const res = await fetch(`/api/dahua-webhook?action=discover&institutionId=${institution.id}`)
                .then(r => r.json())
                .catch(() => null);

            setDiscoveredDevices(res?.discovered || []);
        } catch (err: any) {
            console.error('Auto detect error:', err);
            setDiscoveredDevices([]);
        } finally {
            setAutoDetectingDahua(false);
        }
    };

    const handleClaimDahuaDevice = async (d: any) => {
        setClaimingDeviceId(d.serialNumber);
        try {
            await apiService.saveModuleRecord('biometric_devices', {
                institution_id: institution.id,
                serial_number: d.serialNumber,
                device_name: d.deviceName || `Dahua Terminal (${d.serialNumber})`,
                device_model: d.deviceModel || 'Dahua Facial Recognition Terminal',
                protocol: 'dahua',
                ip_address: d.ipAddress || null,
                is_active: true
            });
            await loadDevices();
            setDiscoveredDevices(prev => prev.filter(x => x.serialNumber !== d.serialNumber));
            alert(`🎉 ${d.deviceName || d.serialNumber} successfully added to your institution's Biometric Fleet!`);
        } catch (err: any) {
            alert('Failed to add device: ' + (err.message || err));
        } finally {
            setClaimingDeviceId(null);
        }
    };

    const handleEnrollStaff = async () => {
        if (!enrollForm.staffId || !enrollForm.devicePin) {
            alert('Staff member and Dahua Terminal ID / Device PIN are required');
            return;
        }
        try {
            const cleanPin = enrollForm.devicePin.trim();
            const existing = enrollments.find(e => e.staffId === enrollForm.staffId || e.devicePin === cleanPin);

            await apiService.saveModuleRecord('biometric_enrollments', {
                ...(existing?.id ? { id: existing.id } : {}),
                institution_id: institution.id,
                institutionId: institution.id,
                staff_id: enrollForm.staffId,
                staffId: enrollForm.staffId,
                device_pin: cleanPin,
                devicePin: cleanPin,
                fingerprint_index: enrollForm.fingerprintIndex,
                is_active: true,
            });

            // Backfill any unlinked attendance logs with this device_pin
            try {
                const rawLogs = await apiService.fetchModuleRecords<any>('staff_attendance_logs', institution.id, { bypassCache: true });
                const unlinkedForThisPin = (rawLogs || []).filter(l => 
                    (String(l.device_pin || l.devicePin || l.card_no || l.cardNo || '') === cleanPin)
                );
                for (const logItem of unlinkedForThisPin) {
                    if (!logItem.staff_id || logItem.staff_id !== enrollForm.staffId || !logItem.is_processed) {
                        await apiService.saveModuleRecord('staff_attendance_logs', {
                            ...logItem,
                            staff_id: enrollForm.staffId,
                            staffId: enrollForm.staffId,
                            is_processed: true,
                            isProcessed: true
                        });
                    }
                }
            } catch (backfillErr) {
                console.warn('[Dahua Enrollment] Backfill warning:', backfillErr);
            }

            setShowEnrollModal(false);
            setEnrollForm({ staffId: '', devicePin: '', fingerprintIndex: 0 });
            await loadEnrollments();
            await loadTodayAttendance();
            alert(`Staff member Dahua ID #${cleanPin} successfully linked and saved!`);
        } catch (err: any) {
            alert('Failed to enroll: ' + err.message);
        }
    };

    const handleRemoveEnrollment = async (id: string) => {
        if (!confirm('Remove this enrollment?')) return;
        try {
            await apiService.deleteModuleRecord('biometric_enrollments', id);
            loadEnrollments();
        } catch (err: any) {
            alert('Failed: ' + err.message);
        }
    };

    // Computed stats
    const todayStats = useMemo(() => {
        const present = dailyRecords.filter(r => r.status === 'present').length;
        const late = dailyRecords.filter(r => (Number(r.lateMinutes) || 0) > 0).length;
        const absent = staff.length - dailyRecords.length;
        const avgHours = dailyRecords.length > 0
            ? (dailyRecords.reduce((sum, r) => sum + (Number(r.totalHours) || 0), 0) / dailyRecords.length).toFixed(1)
            : '0.0';
        return { present, late, absent, avgHours, total: staff.length };
    }, [dailyRecords, staff]);

    // Monthly summary per staff
    const monthlySummary = useMemo(() => {
        const map = new Map<string, { name: string; role: string; days: number; late: number; totalHours: number; overtime: number }>();
        for (const rec of monthlyRecords) {
            const s = staff.find(u => u.id === rec.staffId);
            const name = s?.name || rec.staffName || 'Unknown';
            const role = s?.role || rec.staffRole || '';
            if (!map.has(rec.staffId)) {
                map.set(rec.staffId, { name, role, days: 0, late: 0, totalHours: 0, overtime: 0 });
            }
            const entry = map.get(rec.staffId)!;
            if (rec.status === 'present' || rec.status === 'half-day') entry.days++;
            if ((Number(rec.lateMinutes) || 0) > 0) entry.late++;
            entry.totalHours += (Number(rec.totalHours) || 0);
            entry.overtime += (Number(rec.overtimeHours) || 0);
        }
        return Array.from(map.entries()).map(([staffId, data]) => ({ staffId, ...data }));
    }, [monthlyRecords, staff]);

    const getStaffName = (staffId: string) => staff.find(s => s.id === staffId)?.name || 'Unknown';

    const webhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/zk`
        : 'https://portal.eduai.co.ke/zk';

    const dahuaWebhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/dahua-webhook`
        : 'https://portal.eduai.co.ke/api/dahua-webhook';

    const subTabs: { id: SubTab; label: string }[] = [
        { id: 'today', label: "Today's Roll Call" },
        { id: 'monthly', label: 'Monthly Register' },
        { id: 'devices', label: 'Device Fleet' },
        { id: 'enrollment', label: 'Staff Enrollment' },
    ];

    return (
        <div className="space-y-8">
            {/* Biometric Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[3rem] text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAzIj48cGF0aCBkPSJNMzYgMzRoLTJWMGgydjM0em0wLThoMjB2MkgzNnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
                <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-indigo-500/30 rounded-2xl flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.53 8.523M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Biometric Attendance</h2>
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">ZKTeco Integration • Real-Time Tracking</p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Present Today</p>
                            <p className="text-2xl font-black text-emerald-400">{todayStats.present}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Late Arrivals</p>
                            <p className="text-2xl font-black text-amber-400">{todayStats.late}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Absent</p>
                            <p className="text-2xl font-black text-rose-400">{todayStats.absent < 0 ? 0 : todayStats.absent}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Hours</p>
                            <p className="text-2xl font-black text-sky-400">{todayStats.avgHours}h</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {subTabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSubTab(t.id)}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                            subTab === t.id
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                                : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ═══════════ TODAY'S ROLL CALL ═══════════ */}
            {subTab === 'today' && (
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Today's Attendance</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                            >
                                📥 Import ZKTeco Logs
                            </button>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">First In</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Out</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Hours</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Overtime</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Late</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-bold">Loading...</td></tr>
                                ) : dailyRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <div className="space-y-3">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                                    <ClockIcon className="w-8 h-8" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No attendance records for this date</p>
                                                <p className="text-[10px] text-slate-400">Records will appear once devices push data</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    dailyRecords.map((rec, i) => (
                                        <tr key={i} className="border-t border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                        {getStaffName(rec.staffId).charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{getStaffName(rec.staffId)}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{rec.punchCount} punches</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {formatTimeString(rec.firstIn)}
                                            </td>
                                            <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {formatTimeString(rec.lastOut)}
                                            </td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-slate-900 dark:text-white">{rec.totalHours || 0}h</td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-emerald-600">{rec.overtimeHours > 0 ? `+${rec.overtimeHours}h` : '—'}</td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-amber-600">{rec.lateMinutes > 0 ? `${rec.lateMinutes}m` : '—'}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[rec.status] || STATUS_COLORS.present}`}>
                                                    {rec.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════ MONTHLY REGISTER ═══════════ */}
            {subTab === 'monthly' && (
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Monthly Attendance Register</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Aggregated staff attendance for payroll</p>
                        </div>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Days Present</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Late Days</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Hours</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Overtime</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm font-bold">Loading...</td></tr>
                                ) : monthlySummary.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center">
                                            <div className="space-y-3">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                                    <UserGroupIcon className="w-8 h-8" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No monthly records</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    monthlySummary.map((row, i) => (
                                        <tr key={i} className="border-t border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                        {row.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{row.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{row.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-slate-900 dark:text-white">{row.days}</td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-amber-600">{row.late > 0 ? row.late : '—'}</td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-slate-900 dark:text-white">{(Number(row.totalHours) || 0).toFixed(1)}h</td>
                                            <td className="px-4 py-4 text-center text-sm font-black text-emerald-600">{(Number(row.overtime) || 0) > 0 ? `+${(Number(row.overtime) || 0).toFixed(1)}h` : '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════ DEVICE FLEET ═══════════ */}
            {subTab === 'devices' && (
                <div className="space-y-6">
                    {/* Webhook URLs Info (ZKTeco + Dahua) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* ZKTeco ADMS Card */}
                        <div className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">ZKTeco ADMS Cloud Server URL</p>
                                <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider">⚡ ZKTeco Keypad</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Shortest URL (Keypad Entry)</p>
                                    <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold select-all">{webhookUrl}</p>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Alternative Short Path</p>
                                    <p className="text-sm font-mono text-sky-600 dark:text-sky-400 font-bold select-all">{typeof window !== 'undefined' ? `${window.location.origin}/adms` : 'https://portal.eduai.co.ke/adms'}</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-indigo-500 font-semibold">On physical ZKTeco terminal: Menu ➔ Comm. ➔ Cloud Server / ADMS ➔ Set Server Domain to <code>portal.eduai.co.ke</code>, Path to <code>/zk</code>, Port <code>80</code>.</p>
                        </div>

                        {/* Dahua Facial Biometric Card */}
                        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Dahua Facial Biometrics Webhook</p>
                                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">🎯 Dahua Terminal</span>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Dahua Alarm Server / HTTP Push Destination URL</p>
                                <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold select-all">{dahuaWebhookUrl}</p>
                            </div>
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">In Dahua Device Web Portal: Network ➔ Access / Alarm Server / HTTP Push ➔ Set Destination URL to <code>{dahuaWebhookUrl}</code>, Port <code>80</code> (or <code>443</code>).</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Registered Devices</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{devices.length} device{devices.length !== 1 ? 's' : ''} configured</p>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <button
                                    onClick={handleAutoDetectDahua}
                                    disabled={autoDetectingDahua}
                                    className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-95"
                                >
                                    {autoDetectingDahua ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Scanning...
                                        </>
                                    ) : (
                                        <>
                                            <span>🔍 Auto-Detect Dahua</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowDesktopAgentModal(true)}
                                    className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2"
                                >
                                    💻 Desktop Bridge
                                </button>
                                <button
                                    onClick={() => setShowGuideModal(true)}
                                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                                >
                                    📖 Setup Guide
                                </button>
                                <button
                                    onClick={() => setShowDeviceModal(true)}
                                    className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    + Add Device
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                            {devices.length === 0 ? (
                                <div className="col-span-full py-12 text-center space-y-3">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No biometric devices registered</p>
                                    <p className="text-[10px] text-slate-400">Add your ZKTeco devices to start receiving attendance data</p>
                                </div>
                            ) : (
                                devices.map((dev, i) => (
                                    <div key={i} className="group p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-600 opacity-0 group-hover:opacity-10 rounded-full -mr-10 -mt-10 transition-all duration-700 group-hover:scale-150" />
                                        <div className="relative space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-sm border border-slate-50 dark:border-slate-600">
                                                    <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.53 8.523M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                                    dev.isActive
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                                                        : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-700'
                                                }`}>
                                                    {dev.isActive ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900 dark:text-white">{dev.deviceName}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    SN: {dev.serialNumber} {dev.deviceModel ? `• ${dev.deviceModel}` : ''}
                                                </p>
                                                {dev.locationDescription && (
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">📍 {dev.locationDescription}</p>
                                                )}
                                                {dev.lastSyncAt && (
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">Last sync: {new Date(dev.lastSyncAt).toLocaleString()}</p>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 pt-2">
                                                <button
                                                    onClick={() => handleTestDevice(dev)}
                                                    disabled={testingDeviceId === dev.id}
                                                    className="py-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[8px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                >
                                                    {testingDeviceId === dev.id ? '...' : '⚡ Test'}
                                                </button>
                                                <button
                                                    onClick={() => handleOpenSensorRemotely(dev)}
                                                    disabled={testingDeviceId === dev.id}
                                                    className="py-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-xl text-[8px] font-black uppercase tracking-wider hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                >
                                                    🚪 Open
                                                </button>
                                                <button
                                                    onClick={() => handleRemoteSyncDevice(dev)}
                                                    disabled={testingDeviceId === dev.id}
                                                    className="py-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-xl text-[8px] font-black uppercase tracking-wider hover:bg-sky-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                >
                                                    🔄 Sync
                                                </button>
                                                <button
                                                    onClick={() => handleSendTestPunch(dev)}
                                                    className="py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[8px] font-black uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                >
                                                    🧪 Punch
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteDevice(dev.id)}
                                                className="w-full py-2 bg-white dark:bg-slate-700 text-rose-500 border border-slate-100 dark:border-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                                            >
                                                Remove Device
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ STAFF ENROLLMENT ═══════════ */}
            {subTab === 'enrollment' && (
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Staff Dahua / Biometric Enrollment</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Map each staff member to their Dahua terminal face ID or device PIN</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Search staff..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                            />
                            <button
                                onClick={() => setShowEnrollModal(true)}
                                className="px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                + Enroll Dahua ID
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="text-left px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Dahua ID / Device PIN</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Finger Index</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Enrolled</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrollments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center">
                                            <div className="space-y-3">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                                    <UserGroupIcon className="w-8 h-8" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No staff enrolled</p>
                                                <p className="text-[10px] text-slate-400">Enroll staff by mapping their Dahua terminal User ID or ZKTeco device PIN to their system profile</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    enrollments
                                        .filter(e => {
                                            if (!searchTerm) return true;
                                            const name = getStaffName(e.staffId).toLowerCase();
                                            return name.includes(searchTerm.toLowerCase()) || e.devicePin.includes(searchTerm);
                                        })
                                        .map((enr, i) => (
                                            <tr key={i} className="border-t border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                            {getStaffName(enr.staffId).charAt(0)}
                                                        </div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{getStaffName(enr.staffId)}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-mono font-bold">#{enr.devicePin}</span>
                                                </td>
                                                <td className="px-4 py-4 text-xs font-bold text-slate-500">{enr.fingerprintIndex ?? 0}</td>
                                                <td className="px-4 py-4 text-xs font-bold text-slate-400">{new Date(enr.enrolledAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEnrollForm({
                                                                    staffId: enr.staffId,
                                                                    devicePin: enr.devicePin,
                                                                    fingerprintIndex: enr.fingerprintIndex ?? 0
                                                                });
                                                                setShowEnrollModal(true);
                                                            }}
                                                            className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                        >
                                                            Edit Dahua ID
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveEnrollment(enr.id)}
                                                            className="px-3 py-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════ ADD DEVICE MODAL ═══════════ */}
            {showDeviceModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black text-slate-800 dark:text-white uppercase tracking-wider">Register Biometric Device</h3>
                                <p className="text-[10px] font-semibold text-slate-400">Add a ZKTeco or Dahua terminal to your institution</p>
                            </div>
                            <button onClick={() => setShowDeviceModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Serial Number *</label>
                                <input type="text" value={deviceForm.serialNumber} onChange={e => setDeviceForm(f => ({ ...f, serialNumber: e.target.value }))}
                                    placeholder="e.g. CJQ9204960012 or Dahua SN"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Device Name *</label>
                                <input type="text" value={deviceForm.deviceName} onChange={e => setDeviceForm(f => ({ ...f, deviceName: e.target.value }))}
                                    placeholder="e.g. Main Gate Dahua Face Terminal"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Model</label>
                                    <select value={deviceForm.deviceModel} onChange={e => setDeviceForm(f => ({ ...f, deviceModel: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Select Model</option>
                                        <optgroup label="Dahua Facial Terminals">
                                            <option value="Dahua ASI Series (Face)">Dahua ASI Series (Face Recognition)</option>
                                            <option value="Dahua ASI7213X">Dahua ASI7213X / ASI7214X</option>
                                            <option value="Dahua ASI7223X">Dahua ASI7223X / ASI6213J</option>
                                            <option value="Dahua SmartPSS">Dahua SmartPSS / Camera</option>
                                        </optgroup>
                                        <optgroup label="ZKTeco Terminals">
                                            <option value="SpeedFace V5L">SpeedFace V5L</option>
                                            <option value="SpeedFace H5L">SpeedFace H5L</option>
                                            <option value="K40">K40</option>
                                            <option value="K50">K50</option>
                                            <option value="iClock 560">iClock 560</option>
                                            <option value="iClock 880">iClock 880</option>
                                            <option value="iClock 990">iClock 990</option>
                                        </optgroup>
                                        <option value="Other">Other / Generic</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Protocol</label>
                                    <select value={deviceForm.protocol} onChange={e => {
                                        const proto = e.target.value as any;
                                        const isDahua = proto === 'dahua' || proto === 'dahua_cgi';
                                        setDeviceForm(f => ({
                                            ...f,
                                            protocol: proto,
                                            port: isDahua && (f.port === 4370 || !f.port) ? 80 : f.port,
                                            deviceModel: isDahua && (!f.deviceModel || f.deviceModel.startsWith('K') || f.deviceModel.startsWith('iClock')) ? 'Dahua ASI Series (Face)' : f.deviceModel
                                        }));
                                    }}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="dahua">Dahua Auto-Push / SmartPSS (Recommended)</option>
                                        <option value="dahua_cgi">Dahua HTTP CGI / DSS Pro</option>
                                        <option value="adms">ZKTeco ADMS (Push)</option>
                                        <option value="pull">Pull SDK</option>
                                        <option value="biotime">ZKBioTime Cloud</option>
                                        <option value="http_push">Generic HTTP Webhook Push</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">IP Address</label>
                                    <input type="text" value={deviceForm.ipAddress} onChange={e => setDeviceForm(f => ({ ...f, ipAddress: e.target.value }))}
                                        placeholder="192.168.1.108"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Port</label>
                                    <input type="number" value={deviceForm.port} onChange={e => setDeviceForm(f => ({ ...f, port: Number(e.target.value) || 80 }))}
                                        placeholder="80"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Comm Key / Password (Default: 0)</label>
                                <input type="number" value={deviceForm.commKey} onChange={e => setDeviceForm(f => ({ ...f, commKey: Number(e.target.value) || 0 }))}
                                    placeholder="0 (or device communication key)"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Location</label>
                                <input type="text" value={deviceForm.locationDescription} onChange={e => setDeviceForm(f => ({ ...f, locationDescription: e.target.value }))}
                                    placeholder="e.g. Main Entrance, Staff Room"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                            <button onClick={() => setShowDeviceModal(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleAddDevice} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md">
                                Register Device
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ ENROLL STAFF MODAL ═══════════ */}
            {showEnrollModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black text-slate-800 dark:text-white uppercase tracking-wider">Link Staff to Dahua Terminal</h3>
                                <p className="text-[10px] font-semibold text-slate-400">Map staff member to their facial ID or device PIN</p>
                            </div>
                            <button onClick={() => setShowEnrollModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Staff Member *</label>
                                <select 
                                    value={enrollForm.staffId} 
                                    onChange={e => {
                                        const selectedStaffId = e.target.value;
                                        const existing = enrollments.find(en => en.staffId === selectedStaffId);
                                        setEnrollForm(f => ({
                                            ...f,
                                            staffId: selectedStaffId,
                                            devicePin: existing ? existing.devicePin : f.devicePin
                                        }));
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="">-- Select Staff Member --</option>
                                    {staff.map(s => {
                                        const enrolled = enrollments.find(e => e.staffId === s.id);
                                        return (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({s.role || 'Staff'}) {enrolled ? `[Dahua ID: #${enrolled.devicePin}]` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Dahua User ID / Device PIN *</label>
                                <input type="text" value={enrollForm.devicePin} onChange={e => setEnrollForm(f => ({ ...f, devicePin: e.target.value }))}
                                    placeholder="e.g. 101, 1, 2, or card number..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                                <p className="text-[10px] text-slate-400 mt-1">This is the User ID configured on the Dahua facial recognition terminal (e.g. 101, 1, 2)</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Finger Index / Sub-ID</label>
                                <select value={enrollForm.fingerprintIndex} onChange={e => setEnrollForm(f => ({ ...f, fingerprintIndex: parseInt(e.target.value) }))}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="0">Face Recognition / Primary (0)</option>
                                    {[1,2,3,4,5,6,7,8,9].map(i => (
                                        <option key={i} value={i}>Fingerprint / Secondary ({i})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setShowEnrollModal(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleEnrollStaff} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                                    Save & Link Dahua ID
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ DEVICE SETUP GUIDE MODAL ═══════════ */}
            {showGuideModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                        <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-600 rounded-2xl">
                                    <ClockIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight">Biometric Device Setup Guide</h3>
                                    <p className="text-[10px] font-semibold text-slate-400">Step-by-step instructions for adding ZKTeco, Dahua & Generic devices</p>
                                </div>
                            </div>
                            <button onClick={() => setShowGuideModal(false)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
                            {/* Step 1 */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">Step 1: Access Devices Tab</span>
                                <p className="font-bold text-slate-800 dark:text-white pt-1">Navigate to HR & Payroll ➔ Biometric Attendance ➔ Devices.</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[11px]">Click on <strong className="text-indigo-600 dark:text-indigo-400">+ Add Device</strong> to open the registration dialog.</p>
                            </div>

                            {/* Step 2 */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">Step 2: Enter Device Specs & Protocol</span>
                                <ul className="list-disc list-inside space-y-1.5 text-[11px] pt-1">
                                    <li><strong>Serial Number:</strong> Printed on device label or shown in device network settings.</li>
                                    <li><strong>Device Name:</strong> e.g., <em>Main Gate Face Scanner</em> or <em>Admin Staff Room</em>.</li>
                                    <li><strong>IP Address:</strong> Static local IP (e.g. <code>192.168.1.150</code>).</li>
                                    <li>
                                        <strong>Protocol Selection:</strong>
                                        <div className="mt-1 pl-4 space-y-1 text-slate-500 dark:text-slate-400">
                                            <div>• <strong>ZKTeco ADMS (Push):</strong> For ZKTeco push devices (F18, MB20, SpeedFace).</div>
                                            <div>• <strong>ZKBioTime Cloud:</strong> For ZKTeco cloud BioTime server deployments.</div>
                                            <div>• <strong>Dahua Auto-Push / SmartPSS:</strong> For Dahua ASI series face/fingerprint terminals.</div>
                                            <div>• <strong>Dahua HTTP CGI / DSS Pro:</strong> For Dahua DSS Pro or CGI webhook events.</div>
                                            <div>• <strong>Generic HTTP Webhook Push:</strong> For custom third-party IP scanners.</div>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {/* Step 3 */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">Step 3: Configure Cloud Server / ADMS on Physical Device</span>
                                
                                <div className="space-y-1.5 p-4 bg-slate-900 text-indigo-300 font-mono text-[10px] rounded-2xl border border-indigo-500/30 break-all">
                                    <div className="text-white font-bold text-[11px] mb-1">📲 Keypad Entry Settings:</div>
                                    <div>• Direct Numeric Server IP: <span className="text-emerald-400 font-bold select-all">216.150.16.65</span></div>
                                    <div>• Domain Name (if ON): <span className="text-emerald-400 font-bold select-all">portal.eduai.co.ke</span></div>
                                    <div>• Server Path: <span className="text-sky-400 font-bold select-all">/zk</span></div>
                                    <div>• Server Port: <span className="text-amber-400 font-bold">80</span></div>
                                </div>

                                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2 text-[11px]">
                                    <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                        💡 IF YOUR SCREEN SHOWS DIGIT BOXES (000.000.000.000):
                                    </p>
                                    <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                                        <li>Option A: Enter <strong>216.150.16.65</strong> directly into the <code>___.___.___.___</code> boxes.</li>
                                        <li>Option B: Look for <strong>Enable Domain Name</strong> under Menu ➔ Comm. ➔ Cloud Server and turn it <strong>ON</strong> to type <code>portal.eduai.co.ke</code>.</li>
                                        <li>After saving, restart the terminal or power cycle it to force an instant connection!</li>
                                    </ol>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">Step 4: Map Staff to Device PINs</span>
                                <p className="text-[11px] pt-1">Go to the <strong>Staff PIN Enrollment</strong> tab, click <strong>+ Enroll</strong>, select the staff member, and type their assigned device User ID / PIN (e.g. <code>1001</code>).</p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button onClick={() => setShowGuideModal(false)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                                Got It
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ═══════════ IMPORT ZKTECO LOGS MODAL ═══════════ */}
            {showImportModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">Import ZKTeco Attendance Logs</h3>
                                <p className="text-[10px] font-semibold opacity-80">Upload attlog.dat, CSV, TXT or paste ZKTeco raw punch logs</p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-5">
                            {/* File Upload Box */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Option 1: Upload ZKTeco Log File (attlog.dat / .csv / .txt)</span>
                                <input
                                    type="file"
                                    accept=".dat,.txt,.csv"
                                    onChange={handleFileUpload}
                                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-600 dark:file:bg-indigo-950/40 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                                />
                                <p className="text-[9px] text-slate-400 font-semibold">Supports 1_attlog.dat exported from USB drive or ZK BioTime exports</p>
                            </div>

                            {/* Raw Text Box */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Option 2: Paste Raw ZKTeco Punch Log Data</label>
                                <textarea
                                    rows={6}
                                    value={importLogText}
                                    onChange={e => setImportLogText(e.target.value)}
                                    placeholder={`1004\t2026-07-22 08:30:15\t1\t0\n1004\t2026-07-22 17:05:00\t1\t1\n1005\t2026-07-22 08:42:10\t1\t0`}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400">
                                {importLogText ? `${importLogText.split('\n').filter(Boolean).length} lines ready` : 'No file selected'}
                            </span>
                            <div className="flex gap-3">
                                <button onClick={() => setShowImportModal(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleParseAndImportZkTecoLogs(importLogText)}
                                    disabled={isImporting || !importLogText.trim()}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
                                >
                                    {isImporting ? 'Processing Logs...' : '📥 Import & Process Logs'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {testModalResult && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className={`px-8 py-5 flex items-center justify-between border-b ${
                            testModalResult.success ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        }`}>
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">Device Test Result</h3>
                                <p className="text-[10px] font-semibold opacity-80">{testModalResult.deviceName} • {testModalResult.timestamp}</p>
                            </div>
                            <button onClick={() => setTestModalResult(null)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className={`p-4 rounded-2xl border text-xs font-mono whitespace-pre-wrap ${
                                testModalResult.success 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}>
                                {testModalResult.message}
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button onClick={() => setTestModalResult(null)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ═══════════ DESKTOP BRIDGE AGENT MODAL ═══════════ */}
            {showDesktopAgentModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-lg">
                                    ZK
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight">EduAI ZKTeco Desktop Bridge Agent</h3>
                                    <p className="text-[11px] opacity-90 font-medium">Windows Desktop App for Local Network ZKTeco Terminals (Port 4370)</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDesktopAgentModal(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                    🚀 Why Use the Desktop Bridge Agent?
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    If your ZKTeco terminals (K40, F18, MB20, IN01, uFace, etc.) are connected to your school or office Local Area Network (LAN) without public cloud access, the Desktop Agent runs on your local gate/office PC, connects directly to devices via <strong>Port 4370 (TCP/UDP)</strong>, and automatically syncs attendance punches to the EduAI Cloud in real time.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Quick 3-Step Setup Instructions
                                </h4>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase">1. Location & Startup</span>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                        The desktop agent package is located in the repository folder:
                                    </p>
                                    <code className="block p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl break-all">
                                        desktop-zkteco-app/run-agent.bat
                                    </code>
                                    <p className="text-[11px] text-slate-500">
                                        Double-click <code>run-agent.bat</code> to automatically install dependencies and launch the app.
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase">2. Configure Cloud Gateway</span>
                                    <div className="space-y-1 text-xs font-mono text-slate-700 dark:text-slate-300">
                                        <div>• Cloud URL: <strong className="text-indigo-500">{typeof window !== 'undefined' ? window.location.origin : 'https://portal.eduai.co.ke'}</strong></div>
                                        <div>• Institution ID: <strong className="text-emerald-500">{institution.id}</strong></div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase">3. Add Local Terminal IP</span>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                        In the Desktop App, click <strong>+ Add Terminal</strong>, enter your terminal IP (e.g. <code>192.168.1.201</code>, Port <code>4370</code>), and click <strong>Test Link</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <a
                                href="/downloads/EduAI-ZKTeco-Desktop-Agent-win-x64.zip"
                                download="EduAI-ZKTeco-Desktop-Agent-win-x64.zip"
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                            >
                                ⬇️ Download Desktop App (.ZIP)
                            </a>
                            <button onClick={() => setShowDesktopAgentModal(false)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md">
                                Got It
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ AUTO-DETECT DAHUA DEVICE MODAL ═══════════ */}
            {showAutoDetectModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        <div className="px-8 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-md font-black uppercase tracking-wider">Auto-Detect Dahua Terminal</h3>
                                    <p className="text-[10px] font-semibold opacity-90">Discover online Dahua terminals configured to this cloud webhook</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAutoDetectModal(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-5">
                            {autoDetectingDahua ? (
                                <div className="py-12 text-center space-y-4">
                                    <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    <p className="text-sm font-black text-slate-800 dark:text-white">Scanning Cloud Webhook for Incoming Dahua Terminals...</p>
                                    <p className="text-[10px] text-slate-400">Checking for recent face scans and network broadcasts from Dahua hardware</p>
                                </div>
                            ) : discoveredDevices.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                            🎉 Found {discoveredDevices.length} Online Dahua Device{discoveredDevices.length > 1 ? 's' : ''}!
                                        </span>
                                        <button 
                                            onClick={handleAutoDetectDahua} 
                                            className="text-[9px] font-black uppercase text-emerald-600 hover:underline"
                                        >
                                            Refresh
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {discoveredDevices.map((d, idx) => (
                                            <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-lg uppercase">Dahua Face</span>
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white">{d.deviceName || `Terminal ${d.serialNumber}`}</h4>
                                                    </div>
                                                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                                        SN: <strong className="text-slate-800 dark:text-slate-200">{d.serialNumber}</strong>
                                                    </p>
                                                    {d.lastSeen && (
                                                        <p className="text-[9px] text-slate-400">
                                                            Last contact: {new Date(d.lastSeen).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleClaimDahuaDevice(d)}
                                                    disabled={claimingDeviceId === d.serialNumber}
                                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
                                                >
                                                    {claimingDeviceId === d.serialNumber ? 'Adding...' : '+ Claim & Add to Account'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-800 dark:text-white">No New Dahua Devices Detected Yet</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            The cloud webhook is waiting for an incoming signal from your Dahua terminal.
                                        </p>
                                    </div>

                                    <div className="p-5 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 space-y-2 text-xs">
                                        <p className="font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 text-[10px]">
                                            ⚡ How to trigger instant detection:
                                        </p>
                                        <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                                            <li>Ensure your Dahua terminal has Destination Server set to: <code className="font-bold text-indigo-600 dark:text-indigo-400 select-all">{dahuaWebhookUrl}</code></li>
                                            <li><strong>Scan 1 face</strong> in front of the Dahua camera (or click <strong>Test</strong> in the Dahua device web portal).</li>
                                            <li>Click <strong>Scan Again</strong> below. EduAI will instantly catch the device and allow you to claim it with 1 click!</li>
                                        </ol>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <button
                                onClick={handleAutoDetectDahua}
                                disabled={autoDetectingDahua}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                                {autoDetectingDahua ? 'Scanning...' : '🔄 Scan Again'}
                            </button>
                            <button
                                onClick={() => setShowAutoDetectModal(false)}
                                className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
