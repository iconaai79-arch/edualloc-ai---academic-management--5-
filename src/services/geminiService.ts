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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || `AI Service Error: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return data; // Expected to contain { text: string }
        } else {
            const text = await response.text();
            console.error("[geminiService] Non-JSON response from AI Service:", text.substring(0, 200));
            throw new Error(`AI Service Error (${response.status}): Invalid response format`);
        }

    } catch (error: any) {
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
            levels: c.levels.map(l => ({
                id: l.id,
                name: l.name,
                subjectIds: l.subjectIds,
                homeRoomId: l.roomId,
                overrides: (l.subjectMetadata || []).map(m => ({ subjectId: m.subjectId, structure: m.lessonStructure, dedicatedRoomId: m.dedicatedRoomId }))
            }))
        })))}
            - Operating Parameters: ${JSON.stringify({ start: settings.startTime, end: settings.endTime, days: settings.operatingDays })}
            - Curriculum Schedule Profiles: ${JSON.stringify(profiles)}
            - Global Institutional Breaks: ${JSON.stringify(settings.breaks)}
            - Subject Association Constraints: ${JSON.stringify(settings.constraints)}
            - Faculty Governance Rules (Teacher Logic): ${JSON.stringify(settings.teacherRules)}
            - Faculty Time-Off Redlines: ${JSON.stringify(timeOffRequests)}
            
            NON-NEGOTIABLE HEURISTICS - YOU MUST STRICTLY ENFORCE THESE RULES:

            1. INSTITUTIONAL PROFILES: 
               - Every course follows a specific schedule profile. 
               - You MUST use the exact start times, end times, and break windows defined in the profile associated with the course.

            2. FACULTY GOVERNANCE RULES (TEACHER LOGIC):
               - max_consecutive_lessons: strict limit on back-to-back lessons. If limit is 2, a teacher CANNOT teach 3 consecutive slots.
               - max_lessons_per_day: absolute daily cap.
               - min_lessons_per_day: if a teacher is scheduled on a day, they must have at least this many lessons.
               - preferred_start_time: do not schedule lessons for this teacher before this time.
               - preferred_end_time: do not schedule lessons for this teacher after this time.
               - no_lessons_after: absolute hard stop time for the teacher.

            3. SUBJECT CONSTRAINTS:
               - consecutive_subjects: these subjects MUST be scheduled in immediate succession (back-to-back) for the same group.
               - same_day_subjects: these subjects MUST appear on the same day.
               - same_day_must_subjects: STRICTer version of same_day.
               - no_break_between_subjects: no break periods allowed between these specific subjects.
               - subject_time_off: specific subject cannot be taught during restricted window.
               - non_consecutive_subjects: these subjects MUST NOT be back-to-back.
               - different_day_subjects: these subjects MUST be on different days.
               - same_time_subjects: Option Block / Pathways / Electives. These subjects MUST be scheduled at the EXACT SAME TIME for their associated streams. The AI must create separate TimetableEntry objects for each subject in the block, ensuring they share the same day and time slot.

            4. TIME-OFF REQUESTS: 
               - If a teacher has a "Time-Off Request" for a specific day/time, you CANNOT schedule them then.

            5. DOUBLE-BOOKING: 
               - Zero tolerance for lecturer or room overlap. 
               - STUDENT GROUP OVERLAP: Generally forbidden, EXCEPT for subjects in a 'same_time_subjects' block. For these blocks, it is expected that the student group (stream) is partitioned/split among the subjects, so they MUST occur concurrently.

            6. UNIT DISTRIBUTION (CRITICAL & NON-NEGOTIABLE):
               - STRUCTURE OVERRIDES: If a subject has a 'structure' override defined within a specific course/level, you MUST ignore the default structure in the Subject Registry and use the override instead for that specific group.
               - EVEN DISTRIBUTION MANDATE: You MUST spread all subjects evenly throughout the week. If a subject has 3 lessons, they should be split across the week (e.g., Mon, Wed, Fri for a 5-day week). Do NOT cluster lessons on adjacent days if better spread is possible.
               - DEFAULT NON-CONSECUTIVE RULE: Separate lessons of the same subject MUST NOT be scheduled back-to-back (consecutively) unless they are part of a single defined 'double' or 'triple' block (e.g., 'periods: 2'). If a subject has count: 3 and periods: 1, those 3 lessons MUST be on different days or separated by other subjects.
               - SINGLE PERIOD BAN: A subject with 'periods: 1' structure MUST NEVER appear more than once on the same day for a specific group.
               - BLOCK INTEGRITY: Double or triple blocks (e.g., 'periods: 2' or 'periods: 3') MUST occupy consecutive time slots.
               - SPREAD RULE: Minimize 'clustering'. Mon/Wed/Fri is a VALID spread. Mon/Tue/Wed is a POOR spread. Mon/Mon/Tue is ILLEGAL. 
               - FATAL ERROR: Scheduling separate single-period lessons of the same subject on the same day or back-to-back (without a block structure) is a CRITICAL FAILURE.

            7. STREAM HOME ROOMS & DEDICATED ROOMS:
               - If a stream (group) has a 'homeRoomId' defined, the AI MUST prioritize scheduling all lessons for that group in that specific room, UNLESS another room is explicitly required by subject-level overrides ('dedicatedRoomId').
               - If a subject has a 'dedicatedRoomId' defined for a specific group/level, that room MUST be used for all lessons of that subject for that group.
               - ROOM PRIORITY: Subject 'dedicatedRoomId' > Stream 'homeRoomId' > Global Room Allocation.
               - CONFLICTS: If a 'homeRoomId' is occupied by another group, fall back to any other available room with sufficient capacity, but flag this as a soft-preference violation.

            8. LECTURER WORKLOAD FAIRNESS (CRITICAL & NON-NEGOTIABLE):
               - SPREAD THE LOAD: You MUST NOT schedule all of a lecturer's lessons on a single day. This is a FATAL COMPLIANCE ERROR.
               - MAX 3 PER DAY: Unless a lecturer has > 15 lessons/week, NEVER schedule more than 3 lessons for them on a single day.
               - DISTRIBUTE EVENLY: If a teacher has 5 lessons, scheduling 5 on Monday is FORBIDDEN. You MUST schedule 1 per day (Mon-Fri).
               - TEACHER FATIGUE (NO BACK-TO-BACK): Avoid scheduling more than 2 consecutive lessons for the same teacher. Insert a gap (free period) after every 2 consecutive lessons to allow for rest, unless it is a single 3-period block of the SAME subject.
               - DAILY PRESENCE: If total lessons >= operating days, the teacher MUST have at least one slot every day.

            PLANNING STRATEGY:
            - Use a "First-Pass" to place high-priority/constrained subjects first.
            - RANDOMIZED VARIETY: Introduce stochastic variety in slot selection. Do not always pick the earliest possible slot; distribute lessons across all available valid windows to create a balanced, non-linear feel.
            - Use a "Verification-Pass" to check every single entry against the Faculty Governance Rules and Unit Distribution Rules.

            Output: JSON array of objects with these exact keys: { day, startTime, endTime, subjectId, lecturerId, roomId, courseId, courseLevelId }.
        `;

        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        const result = sanitizeAndParseJson(response.text || "[]");
        return (Array.isArray(result) ? result : []).map((entry: any) => ({
            ...entry,
            id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            start_time: entry.startTime,
            end_time: entry.endTime,
            subject_id: entry.subjectId,
            lecturer_id: entry.lecturerId,
            room_id: entry.roomId,
            course_id: entry.courseId,
            course_level_id: entry.courseLevelId
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

        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
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
    try {
        checkAiAvailable();
        const prompt = `Map these spreadsheet headers to political registry fields: countyCode, countyName, constituencyCode, constituencyName, wardCode, wardName. Headers: ${JSON.stringify(headers)}. Return ONLY a JSON object mapping fields to the corresponding spreadsheet headers. Use null for missing fields.`;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI political registry map error:", error);
        return {};
    }
};
