import * as XLSX from 'xlsx';

/**
 * Shared Excel/CSV parsing helpers for Driving School importers.
 * - Locates the real header row (skips title / blank rows at the top)
 * - Produces row objects keyed by the trimmed header text
 * - Fuzzy auto-maps spreadsheet headers to system fields
 */

export interface ParsedSheet {
    headers: string[];
    rows: Record<string, any>[];
}

const normalizeHeader = (h: any) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const readSpreadsheet = (file: File): Promise<ParsedSheet> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                // Use the first sheet that actually has data
                const sheetName = workbook.SheetNames.find(n => {
                    const ws = workbook.Sheets[n];
                    return ws && ws['!ref'];
                }) || workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: false });

                if (!matrix.length) {
                    resolve({ headers: [], rows: [] });
                    return;
                }

                // Header row = the row (within the first 15) with the most non-empty text cells
                let headerIdx = 0;
                let bestScore = -1;
                for (let i = 0; i < Math.min(15, matrix.length); i++) {
                    const score = (matrix[i] || []).filter(c => typeof c === 'string' && c.trim() !== '' && isNaN(Number(c))).length;
                    if (score > bestScore) {
                        bestScore = score;
                        headerIdx = i;
                    }
                }

                const rawHeaders = matrix[headerIdx] || [];
                const used = new Set<string>();
                const colHeaders: (string | null)[] = rawHeaders.map((h: any) => {
                    let name = String(h ?? '').replace(/\s+/g, ' ').trim();
                    if (!name) return null;
                    let unique = name;
                    let n = 2;
                    while (used.has(unique)) unique = `${name} (${n++})`;
                    used.add(unique);
                    return unique;
                });

                const headers = colHeaders.filter((h): h is string => !!h);
                const rows: Record<string, any>[] = [];
                for (let r = headerIdx + 1; r < matrix.length; r++) {
                    const line = matrix[r] || [];
                    const obj: Record<string, any> = {};
                    let hasValue = false;
                    colHeaders.forEach((h, c) => {
                        if (!h) return;
                        const v = line[c];
                        obj[h] = v;
                        if (v !== '' && v !== null && v !== undefined) hasValue = true;
                    });
                    if (hasValue) rows.push(obj);
                }

                resolve({ headers, rows });
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
};

/** Field definitions: include patterns (normalized header contains) + exclude patterns. Order = priority. */
export const DS_FIELD_PATTERNS: Record<string, { include: string[]; exclude?: string[] }> = {
    admissionNumber: { include: ['admno', 'admissionno', 'admissionnumber', 'admnumber', 'regno', 'regnumber', 'registrationno', 'registrationnumber', 'studentno', 'studentnumber', 'studentid', 'adm', 'reg'], exclude: ['date', 'fee', 'bal', 'phone'] },
    openingBalance: { include: ['openingbalance', 'openingbal', 'openbal', 'balancebf', 'balbf', 'bf', 'arrears', 'outstanding', 'balance', 'bal', 'amountdue', 'owed', 'debt'] },
    phone: { include: ['phone', 'mobile', 'tel', 'contact', 'cell', 'msisdn'], exclude: ['name', 'email'] },
    email: { include: ['email', 'mail'] },
    idNumber: { include: ['nationalid', 'idnumber', 'idno', 'passport', 'nid', 'identity'], exclude: ['student', 'adm', 'reg'] },
    enrollmentDate: { include: ['enrollmentdate', 'enrolmentdate', 'admissiondate', 'dateenrolled', 'dateofadmission', 'datejoined', 'joindate', 'startdate', 'regdate', 'registrationdate', 'date'] },
    licenseTypeInterested: { include: ['licenseclass', 'licenceclass', 'license', 'licence', 'category', 'class', 'course', 'program'] },
    fullName: { include: ['fullname', 'studentname', 'candidatename', 'name', 'student', 'candidate', 'client'], exclude: ['school', 'instructor', 'parent', 'guardian', 'kin', 'user'] },
};

/**
 * Auto-map headers to fields. Each header is used at most once; fields are resolved in the
 * order given by `fields`, and for each field patterns are tried in priority order.
 */
export const autoMapHeaders = (headers: string[], fields: string[]): Record<string, string> => {
    const result: Record<string, string> = {};
    fields.forEach(f => (result[f] = ''));
    const taken = new Set<string>();
    const normalized = headers.map(h => ({ raw: h, norm: normalizeHeader(h) }));

    // Pass 1: exact matches across all fields; Pass 2: "contains" matches
    for (const mode of ['exact', 'contains'] as const) {
        for (const field of fields) {
            if (result[field]) continue;
            const def = DS_FIELD_PATTERNS[field];
            if (!def) continue;
            for (const pat of def.include) {
                const hit = normalized.find(h =>
                    !taken.has(h.raw) &&
                    (mode === 'exact' ? h.norm === pat : h.norm.includes(pat)) &&
                    !(def.exclude || []).some(ex => h.norm.includes(ex))
                );
                if (hit) {
                    result[field] = hit.raw;
                    taken.add(hit.raw);
                    break;
                }
            }
        }
    }
    return result;
};

/** Parses "KES 12,500.00", "(1,000)", "12500/=" etc. Returns 0 if not numeric. */
export const parseAmount = (val: any): number => {
    if (typeof val === 'number') return isFinite(val) ? val : 0;
    if (val === null || val === undefined) return 0;
    let s = String(val).trim();
    if (!s) return 0;
    const negative = /^\(.*\)$/.test(s) || s.startsWith('-');
    s = s.replace(/[^0-9.]/g, '');
    const n = parseFloat(s);
    if (isNaN(n)) return 0;
    return negative ? -n : n;
};

/** Normalizes phone numbers; restores leading 0 that Excel strips from Kenyan numbers. */
export const cleanPhone = (val: any): string => {
    if (val === null || val === undefined) return '';
    let s = String(val).trim();
    if (!s) return '';
    if (/e\+/i.test(s) && !isNaN(Number(s))) s = Number(s).toFixed(0);
    const digits = s.replace(/\D/g, '');
    if (digits.length === 9 && /^[71]/.test(digits)) return `0${digits}`;
    return s.replace(/\s+/g, '');
};

/** Last 9 digits, for comparing phone numbers across formats (07.., 2547.., +2547..). */
export const phoneKey = (val: any): string => {
    const digits = String(val ?? '').replace(/\D/g, '');
    return digits.length >= 9 ? digits.slice(-9) : digits;
};

/** Converts Excel dates / common date strings to YYYY-MM-DD (local, no TZ shift). */
export const toIsoDate = (val: any): string => {
    if (val === null || val === undefined || val === '') return '';
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (val instanceof Date && !isNaN(val.getTime())) {
        // SheetJS dates can drift to just before midnight (historic TZ offsets); round to the nearest day
        const rounded = new Date(val.getTime());
        if (rounded.getHours() >= 12) rounded.setDate(rounded.getDate() + 1);
        return fmt(rounded);
    }
    if (typeof val === 'number' && val > 20000 && val < 80000) {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
    const s = String(val).trim();
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/); // DD/MM/YYYY (Kenyan format)
    if (m) {
        const year = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? '' : fmt(d);
};

/** Builds a generator of sequential admission numbers that respects the configured prefix. */
export const createAdmissionNumberGenerator = (prefixRaw: string | undefined, existing: string[]) => {
    const prefixStr = (prefixRaw || 'ADM-').trim();
    const asNum = Number(prefixStr);
    const isNumericPrefix = !isNaN(asNum) && prefixStr !== '';
    const taken = new Set(existing.filter(Boolean).map(a => a.toLowerCase().trim()));
    let next: number;
    if (isNumericPrefix) {
        let maxVal = asNum;
        existing.forEach(a => {
            const n = Number(String(a || '').trim());
            if (!isNaN(n) && n > maxVal) maxVal = n;
        });
        next = maxVal + 1;
    } else {
        let maxNum = 0;
        existing.forEach(a => {
            if (a && a.toUpperCase().startsWith(prefixStr.toUpperCase())) {
                const match = a.slice(prefixStr.length).match(/\d+/);
                if (match) maxNum = Math.max(maxNum, parseInt(match[0], 10));
            }
        });
        next = maxNum + 1;
    }
    return {
        reserve: (adm: string) => taken.add(adm.toLowerCase().trim()),
        isTaken: (adm: string) => taken.has(adm.toLowerCase().trim()),
        next: () => {
            let candidate = '';
            do {
                candidate = isNumericPrefix ? String(next) : `${prefixStr}${String(next).padStart(3, '0')}`;
                next++;
            } while (taken.has(candidate.toLowerCase()));
            taken.add(candidate.toLowerCase());
            return candidate;
        }
    };
};
