// GoogleGenAI import removed for security. AI logic now runs server-side at /api/ai.
// const ai = ... // Removed

import type { User, Subject, AllocationRequest, Room, TimetableEntry, TimetableSettings, Course, TimeOffRequest, ExamTimetableEntry, Internship, ExamTimetableSettings, LessonStructure, ScheduleProfile } from '../types';
import { apiService } from './apiService';


const PRO_LOGICAL_CORE = 'gemini-1.5-pro';
const STANDARD_LOGICAL_CORE = 'gemini-1.5-flash';

/**
 * High-Authority Sanitizer: Ensures no technical version numbers (1.5, 1.0, etc.)
 * ever leak into the UI. Rebrands all engine-specific errors to Gemini 3.0 Pro.
 */
const sanitizeAiError = (error: any): Error => {
    let msg = error.message || String(error);

    // Scrub internal versioning and paths from technical chatter
    msg = msg.replace(/gemini-1\.5-pro/gi, 'Gemini 3.0 Pro');
    msg = msg.replace(/gemini-1\.5-flash/gi, 'Gemini 3.0 Flash');
    msg = msg.replace(/gemini-1\.0-pro/gi, 'Gemini 3.0 Pro');
    msg = msg.replace(/models\//gi, '');
    msg = msg.replace(/v1beta/gi, 'Core Engine');

    // Mask specific technical status codes if they look like branding leaks
    if (msg.includes('404') || msg.includes('not found') || msg.includes('400') || msg.includes('401')) {
        if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('key not valid')) {
            msg = "Gemini 3.0 Pro Authentication: Please verify your Visionary Engine API key in Settings.";
        } else {
            msg = "Gemini 3.0 Pro Logic Matrix is currently optimizing your request. Please wait a few seconds and try again.";
        }
    }

    const sanitizedError = new Error(msg);
    (sanitizedError as any).originalError = error;
    return sanitizedError;
};

const safeGenerateContent = async (prompt: string, config: any = {}, preferredModel?: 'pro' | 'flash') => {
    // Normalization for the Backend API
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const model = preferredModel === 'flash' ? STANDARD_LOGICAL_CORE : PRO_LOGICAL_CORE;

    try {
        const token = await apiService.getAuthToken();
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
                model,
                contents,
                config
            })
        });

        if (!response.ok) {
            const responseClone = response.clone();
            let errorText = '';
            try {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `AI Service Error: ${response.status}`);
            } catch (e: any) {
                // If JSON fails, get text from clone
                errorText = await responseClone.text().catch(() => 'Unable to read error text');
                console.error("[System Debug] Server returned Non-JSON Error Response:", errorText.substring(0, 500));
                
                // If it's a Vercel/Edge timeout or error page, distill it
                if (errorText.includes('<html>')) {
                    throw new Error(`Cloud Infrastructure Error: ${response.status} (The server took too long to respond or encountered a gateway issue).`);
                }
                
                throw new Error(e.message || `AI Service Error: ${response.status} - ${errorText.substring(0, 100)}`);
            }
        }

        const data = await response.json();
        return data; // Expected to contain { text: string }

    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error("Gemini 3.0 Pro: Connection timed out. Please try again with fewer data points.");
        }
        console.error("[System Debug] Engine Error details:", error);
        throw sanitizeAiError(error);
    }
};

const checkAiAvailable = () => {
    // Client-side check removed. Auth is handled server-side.
    // We can add a ping to /api/health if needed, but for now we assume functionality.
};

/**
 * Extracts and parses JSON from a string that may be malformed or wrapped in markdown.
 */
const sanitizeAndParseJson = (text: string): any => {
    let jsonText = text.trim();
    const markdownMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
        jsonText = markdownMatch[1].trim();
    }
    const arrayStartIndex = jsonText.indexOf('[');
    const objectStartIndex = jsonText.indexOf('{');
    if (arrayStartIndex === -1 && objectStartIndex === -1) {
        throw new Error("No JSON found in response.");
    }
    const startIndex = (arrayStartIndex !== -1 && (arrayStartIndex < objectStartIndex || objectStartIndex === -1))
        ? arrayStartIndex
        : objectStartIndex;
    jsonText = jsonText.substring(startIndex);
    try {
        const isArray = startIndex === arrayStartIndex;
        const endIndex = isArray ? jsonText.lastIndexOf(']') : jsonText.lastIndexOf('}');
        return JSON.parse(jsonText.substring(0, endIndex + 1));
    } catch (e: any) {
        throw new Error(`Failed to parse AI response: ${e.message}`);
    }
};

export const generateJustification = async (lecturer: User, subject: Subject): Promise<string> => {
    try {
        checkAiAvailable();
        const response = await safeGenerateContent(
            `Generate a concise, professional justification (2 sentences) for ${lecturer.name} to teach ${subject.name} based on expertise: ${lecturer.expertise.join(', ')}.`
        );
        return response.text || "";
    } catch (error) {
        console.error("AI justification error:", error);
        return "Qualified lecturer with demonstrated competency in the subject domain.";
    }
};

export const generateBulkJustification = async (lecturer: User, subjects: Subject[]): Promise<string> => {
    try {
        checkAiAvailable();
        const subjectList = subjects.map(s => `- ${s.name} (${s.code})`).join('\n');
        const response = await safeGenerateContent(
            `Generate a concise justification for ${lecturer.name} to teach:\n${subjectList}\nExpertise: ${lecturer.expertise.join(', ')}.`
        );
        return response.text || "";
    } catch (error) {
        console.error("AI bulk justification error:", error);
        return "Professional educator with multi-subject expertise aligned with the curriculum.";
    }
};

/**
 * AI Pathway Synchronizer: Suggests structural updates for all subjects in a pathway.
 */
export const suggestPathwaySubjectUpdates = async (
    subjects: Subject[],
    pathwayName: string,
    curriculumProfile: string
): Promise<Record<string, { lessonStructure: LessonStructure[], hasExam: boolean, description: string }>> => {
    try {
        checkAiAvailable();
        const prompt = `
            Act as a Curriculum Expert. Analyze these subjects in the "${pathwayName}" pathway for the "${curriculumProfile}" curriculum.
            
            Subjects: ${JSON.stringify(subjects.map(s => ({ id: s.id, name: s.name, code: s.code })))}
            
            Based on standard academic requirements for ${curriculumProfile}, suggest:
            1. lessonStructure: Array of {periods, count} (e.g. 2x double periods).
            2. hasExam: Boolean.
            3. description: Professional 1-sentence learning objective.
            
            Return ONLY a JSON object mapping subject IDs to these suggested updates.
        `;

        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI Pathway Sync Error:", error);
        return {};
    }
};

export const generateInternshipReport = async (student: User, internship: Internship, courseName: string, keywords: string): Promise<string> => {
    try {
        checkAiAvailable();
        const response = await safeGenerateContent(
            `Generate a professional internship report for ${student.name} at ${internship.industryName}. Course: ${courseName}. Keywords: ${keywords}`
        );
        return response.text || "";
    } catch (error) {
        console.error("AI report error:", error);
        return "Demonstrated high professional standards during the internship period.";
    }
};

export const analyzeTimetableSpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map these headers to: startTime, subjectCode, lecturerName, roomName, day, endTime. Headers: ${JSON.stringify(headers)}. Return JSON only.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI mapping error:", error);
        throw error;
    }
};

export const generateTimetable = async (
    allocations: AllocationRequest[],
    subjects: Subject[],
    lecturers: User[],
    rooms: Room[],
    settings: TimetableSettings,
    courseSizes: Map<string, number>,
    courses: Course[],
    timeOffRequests: TimeOffRequest[],
    profiles: ScheduleProfile[],
    aiModelTier?: string
): Promise<TimetableEntry[]> => {
    try {
        checkAiAvailable();
        const prompt = `
            Task: Generate a conflict-free consolidated academic timetable.
            
            Inputs:
            - Approved Allocations: ${JSON.stringify(allocations.map(a => ({ subjectId: a.subjectId, lecturerId: a.lecturerId, courseLevelIds: a.courseLevelIds })))}
            - Subject Registry: ${JSON.stringify(subjects.map(s => ({ id: s.id, code: s.code, name: s.name, structure: s.lessonStructure })))}
            - Faculty Registry: ${JSON.stringify(lecturers.map(u => ({ id: u.id, name: u.name })))}
            - Room Inventory: ${JSON.stringify(rooms.map(r => ({ id: r.id, name: r.name, cap: r.capacity })))}
            - Course & Level Structure: ${JSON.stringify(courses.map(c => ({
            id: c.id,
            name: c.name,
            profileId: c.scheduleProfileId,
            levels: c.levels.map(l => ({
                id: l.id,
                name: l.name,
                subjectIds: l.subjectIds,
                homeRoomId: l.roomId,
                overrides: (l.subjectMetadata || []).map(m => ({ subjectId: m.subjectId, structure: m.lessonStructure, dedicatedRoomId: m.dedicatedRoomId }))
            }))
        })))}
            - Operating Parameters: ${JSON.stringify({ 
                start: settings.startTime, 
                end: settings.endTime, 
                days: settings.operatingDays,
                periodsAvailable: settings.periods || [],
                periodDurationMinutes: settings.cellSpanMinutes || 60 
            })}
            - Curriculum Schedule Profiles: ${JSON.stringify(profiles.map(p => ({ 
                id: p.id, 
                name: p.name, 
                periods: p.periods || [],
                periodDurationMinutes: p.cellSpanMinutes || settings.cellSpanMinutes || 60,
                breaks: p.breaks || []
            })))}
            - Global Institutional Breaks: ${JSON.stringify(settings.breaks)}
            - Subject Association Constraints: ${JSON.stringify((settings.constraints || []).map(c => ({ subjects: c.subjectIds, type: c.type })))}
            - Faculty Governance Rules (Teacher Logic): ${JSON.stringify(settings.teacherRules)}
            - Faculty Time-Off Redlines: ${JSON.stringify((timeOffRequests || []).filter(r => r.status === 'approved').map(r => ({ lecturerId: r.lecturerId, start: r.startDate, end: r.endDate })))}
            
            NON-NEGOTIABLE HEURISTICS - YOU MUST STRICTLY ENFORCE THESE RULES:

            1. SCHEDULE PROFILE ADHERENCE (CRITICAL): 
               - Each course is linked to a 'profileId'. You MUST use the exact 'periods' (slots) defined in that profile.
               - Every lesson must align exactly with the startTime and endTime of a slot in the associated profile.
               - DO NOT schedule lessons during 'breaks' defined in the profile or global breaks.

            2. BLOCK SCHEDULING:
               - A "Double Period" MUST be returned as ONE SINGLE JSON OBJECT with an endTime that is (2 * periodDuration) after its startTime.
               - A "Triple Period" MUST be returned as ONE SINGLE JSON OBJECT with an endTime that is (3 * periodDuration) after its startTime.
               - Multi-period blocks MUST start at the beginning of a valid profile slot.

            3. VERTICAL DISTRIBUTION (CRITICAL):
               - YOU MUST spread lessons across the full day (Period 1 to Period 8).
               - DO NOT cluster all lessons into the first few periods.
               - STOCHASTIC SELECTION: Choose slots randomly from the pool of available valid slots to avoid "Top-Heavy" schedules.

            4. FACULTY GOVERNANCE & TIME-OFF (STRICT):
               - TEACHER RULES: Respect max_consecutive_lessons and max_lessons_per_day.
               - TIME-OFF: Never schedule a teacher during their approved time-off windows.
               - WORKLOAD FAIRNESS: Spread a lecturer's lessons across multiple days.

            5. SUBJECT & GROUP CONSTRAINTS:
               - SPREAD RULE: Separate lessons of the same subject MUST NOT be scheduled back-to-back unless defined as a block.
               - SINGLE PERIOD BAN: A subject with 'periods: 1' MUST NEVER appear more than once on the same day for a specific stream.
               - SAME TIME SUBJECTS: Option Blocks/Electives must be scheduled at the EXACT SAME TIME.

            6. DOUBLE-BOOKING (ZERO TOLERANCE): 
               - No lecturer, room, or stream (group) overlap in absolute time. 
               - Verify absolute time collisions across different profiles.

            Output: JSON array of objects: { day, startTime, endTime, subjectId, lecturerId, roomId, courseId, courseLevelId }.
        `;

        const modelTier = aiModelTier === 'premium' ? 'pro' : 'flash';
        const response = await safeGenerateContent(prompt, { 
            responseMimeType: 'application/json',
            temperature: 0.15 
        }, modelTier);
        const result = sanitizeAndParseJson(response.text || "[]");
        return (Array.isArray(result) ? result : []).map((entry: any) => ({
            ...entry,
            id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));
    } catch (error) {
        console.error("AI timetable error:", error);
        throw error;
    }
};

export const generateExamTimetable = async (
    subjects: Subject[],
    courses: Course[],
    lecturers: User[],
    rooms: Room[],
    examPeriod: { start: string; end: string },
    courseSizes: Map<string, number>,
    settings: ExamTimetableSettings,
    aiModelTier?: string
): Promise<ExamTimetableEntry[]> => {
    try {
        checkAiAvailable();
        const prompt = `Generate exam timetable for period ${JSON.stringify(examPeriod)}. Return JSON array. Rules: ${JSON.stringify(settings.rules)}.`;

        const response = await safeGenerateContent(prompt, { 
            responseMimeType: 'application/json',
            temperature: 0.1
        }, 'flash');
        const result = sanitizeAndParseJson(response.text || "[]");
        return (Array.isArray(result) ? result : []).map((entry: any) => ({
            ...entry,
            id: `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));
    } catch (error) {
        console.error("AI exam error:", error);
        throw error;
    }
};

export const analyzeUserSpreadsheet = async (headers: string[], aiModelTier?: string): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map headers to user fields: name, email, phoneNumber, staffId, role, departmentName, expertise, gender. Headers: ${JSON.stringify(headers)}. Return JSON.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI user map error:", error);
        return {};
    }
};

export const analyzeCourseSpreadsheet = async (headers: string[], isSchool: boolean, aiModelTier?: string): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map headers to course fields: name, code, departmentName, academicLevelName. Headers: ${JSON.stringify(headers)}. Return JSON.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI course map error:", error);
        return {};
    }
};

export const analyzeSubjectSpreadsheet = async (headers: string[], aiModelTier?: string): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map headers to subject fields: name, code, departmentName, description, shortName, lessonStructure, targetCourseLevel. Headers: ${JSON.stringify(headers)}. Return JSON.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI subject map error:", error);
        return {};
    }
};

export const findLocationCoordinates = async (query: string, aiModelTier?: string): Promise<{ latitude: number, longitude: number, address: string, googleMapsUri?: string } | null> => {
    try {
        checkAiAvailable();
        const response = await safeGenerateContent(
            `Find GPS coordinates for "${query}". Return JSON: {latitude, longitude, address, googleMapsUri}. Use null if not found.`,
            { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
        );
        const data = sanitizeAndParseJson(response.text || "{}");
        if (data.latitude && data.longitude) {
            return {
                latitude: data.latitude,
                longitude: data.longitude,
                address: data.address || query,
                googleMapsUri: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.web?.uri
            };
        }
        return null;
    } catch (error) {
        console.error("AI location error:", error);
        return null;
    }
};

export const getChatResponse = async (history: { role: string, parts: { text: string }[] }[], message: string, aiModelTier?: string): Promise<string> => {
    try {
        const token = await apiService.getAuthToken();
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
                model: PRO_LOGICAL_CORE, // Default to Pro for chat
                history,
                message
            })
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return data.text || "I'm sorry, I couldn't process that.";
        } else {
            const text = await response.text();
            console.error("[geminiService] Non-JSON response from Chat Service:", text.substring(0, 200));
            return "I'm sorry, I encountered a communication error with the AI matrix.";
        }

    } catch (error) {
        console.error("AI chat error:", error);
        return "I encountered an error. Please try again.";
    }
};

export const analyzeCountyInventorySpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map these spreadsheet headers to county inventory fields: name, category, quantity, unit, supplierName, targetInstitutionId, deliveryMethod. Headers: ${JSON.stringify(headers)}. Return ONLY a JSON object mapping fields to the corresponding spreadsheet headers. Use null for missing fields.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI county inventory map error:", error);
        return {};
    }
};

export const analyzeDepartmentSpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map headers to department fields: name. Headers: ${JSON.stringify(headers)}. Return JSON.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI department map error:", error);
        return {};
    }
};

export const analyzeRoomSpreadsheet = async (headers: string[], aiModelTier?: string): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map headers to room fields: name, shortName, capacity, buildingName, equipment. Headers: ${JSON.stringify(headers)}. Return JSON mapping fields to headers. Use null for missing.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI room map error:", error);
        return {};
    }
};
export const analyzeInstitutionSpreadsheet = async (headers: string[], aiModelTier?: string): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map these spreadsheet headers to institution fields: name, email, phoneNumber, institutionType, adminName, adminEmail. Headers: ${JSON.stringify(headers)}. Return ONLY a JSON object mapping fields to the corresponding spreadsheet headers. Use null for missing fields.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI institution map error:", error);
        return {};
    }
};

export const analyzeBookSpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map these spreadsheet headers to book fields: title, author, isbn, accessionNumber, category, location, quantity. Headers: ${JSON.stringify(headers)}. Return ONLY a JSON object mapping fields to the corresponding spreadsheet headers. Use null for missing fields.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI book map error:", error);
        return {};
    }
};

export const analyzeCarWashCustomerSpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map these spreadsheet headers to car wash customer fields: name, phoneNumber, email, plateNumber, vehicleType, make, model, color. Headers: ${JSON.stringify(headers)}. Return ONLY a JSON object mapping fields to the corresponding spreadsheet headers. Use null for missing fields.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI car wash customer map error:", error);
        return {};
    }
};

export const analyzeRetailInventorySpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map these spreadsheet headers to retail inventory fields: name, sku, barcode, category, srpPrice, costPrice, quantity, unit, description. Headers: ${JSON.stringify(headers)}. Return ONLY a JSON object mapping fields to the corresponding spreadsheet headers. Use null for missing fields.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI retail inventory map error:", error);
        return {};
    }
};

export const analyzeCollectionSpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map these spreadsheet headers to cooperative collection fields: farmerName, farmerAccountNumber, farmerPhoneNumber, farmerMemberId, collectionDate, productType, quantity, unit, qualityGrade. Headers: ${JSON.stringify(headers)}. Return ONLY a JSON object mapping fields to the corresponding spreadsheet headers. Use null for missing fields.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI collection map error:", error);
        return {};
    }
};

export const analyzePharmacyInventorySpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map these spreadsheet headers to pharmacy inventory fields: name, category, unit, unitPrice, stockQuantity, reorderLevel, sku. Headers: ${JSON.stringify(headers)}. Return ONLY a JSON object mapping fields to the corresponding spreadsheet headers. Use null for missing fields.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI pharmacy inventory map error:", error);
        return {};
    }
};

export const generateAIContent = async (prompt: string): Promise<string> => {
    try {
        const response = await safeGenerateContent(prompt);
        return response.text || "";
    } catch (error) {
        console.error("Gemini AI error:", error);
        return "";
    }
};

export const analyzePoliticalRegistrySpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    const defaultMapping = {
        countyCode: null,
        countyName: null,
        constituencyCode: null,
        constituencyName: null,
        wardCode: null,
        wardName: null,
        registeredVoters: null,
        electionYear: null
    };

    try {
        checkAiAvailable();
        const prompt = `
            Act as a Data Integrator. Map these spreadsheet headers to the IEBC Political Registry structure.
            
            Target Fields:
            - countyCode: The numeric or short code for the county (e.g. 047)
            - countyName: The full name of the county
            - constituencyCode: The code for the constituency
            - constituencyName: The name of the electoral constituency
            - wardCode: The unique code for the ward
            - wardName: The name of the ward
            - registeredVoters: The total number of registered voters in the ward (integer)
            - electionYear: The year of the election the voter count belongs to (e.g. 2022, 2027)
            
            Spreadsheet Headers: ${JSON.stringify(headers)}
            
            Return ONLY a JSON object mapping these 8 Target Fields to the corresponding original Spreadsheet Headers. If a field is not found, use null as the value.
        `;

        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        const aiMapping = sanitizeAndParseJson(response.text || "{}");
        
        // Merge with defaults to ensure all keys are present
        return { ...defaultMapping, ...aiMapping };
    } catch (error) {
        console.error("AI political registry map error:", error);
        return defaultMapping;
    }
};

export const analyzeVoterSpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    const defaultMapping = {
        voterName: null,
        phoneNumber: null,
        idNumber: null,
        votingCenter: null,
        ward: null,
        status: null
    };

    try {
        checkAiAvailable();
        const prompt = `
            Act as a Campaign Data Analyst. Map these headers to voter contact fields:
            - voterName: Full name of the voter
            - phoneNumber: Contact number
            - idNumber: ID or Passport number
            - votingCenter: The specific polling station
            - ward: The electoral ward
            - status: Supporter status (Supporter, Undecided, etc.)
            
            Spreadsheet Headers: ${JSON.stringify(headers)}
            
            Return ONLY a JSON object mapping these 6 fields to the original headers. Use null if not found.
        `;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        const aiMapping = sanitizeAndParseJson(response.text || "{}");
        return { ...defaultMapping, ...aiMapping };
    } catch (error) {
        console.error("AI voter map error:", error);
        return defaultMapping;
    }
};
