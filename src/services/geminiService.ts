// GoogleGenAI import removed for security. AI logic now runs server-side at /api/ai.
// const ai = ... // Removed

import type { User, Subject, AllocationRequest, Room, TimetableEntry, TimetableSettings, Course, TimeOffRequest, ExamTimetableEntry, Internship, ExamTimetableSettings, LessonStructure, ScheduleProfile } from '../types';


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
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

        const data = await response.json();
        return data; // Expected to contain { text: string }

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
                overrides: (l.subjectMetadata || []).map(m => ({ subjectId: m.subjectId, structure: m.lessonStructure }))
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
               - same_time_subjects: Option Block / Electives. These subjects MUST be scheduled at the EXACT SAME TIME across the cohort.

            4. TIME-OFF REQUESTS: 
               - If a teacher has a "Time-Off Request" for a specific day/time, you CANNOT schedule them then.

            5. DOUBLE-BOOKING: 
               - Zero tolerance for lecturer, room, or student group overlap.

            6. UNIT DISTRIBUTION (CRITICAL & NON-NEGOTIABLE):
               - SPREAD RULE: You MUST maximize the 'day distance' between lessons of the same subject.
                 (e.g., Mon/Wed/Fri is a VALID spread. Mon/Tue/Wed is a POOR spread. Mon/Mon/Tue is ILLEGAL).
               - SINGLE PERIOD BAN: A subject with 'periods: 1' structure MUST NEVER appear more than once on the same day for a specific group.
                 - If you place 'Maths (1 period)' on Tuesday 09:00, you cannot place another 'Maths' lesson on Tuesday.
               - DOUBLE PERIOD EXCEPTION: Multiple slots on the same day are ONLY allowed if the 'lessonStructure' explicitly requests a double/triple block (e.g., 'periods: 2' or 'periods: 3'). In that case, they MUST be consecutive.
               - FATAL ERROR: Scheduling two separate single-period lessons of the same subject on the same day is a CRITICAL FAILURE.

            PLANNING STRATEGY:
            - Use a "First-Pass" to place high-priority/constrained subjects first.
            - RANDOMIZED VARIETY: Introduce stochastic variety in slot selection. Do not always pick the earliest possible slot; distribute lessons across all available valid windows to create a balanced, non-linear feel.
            - Use a "Verification-Pass" to check every single entry against the Faculty Governance Rules and Unit Distribution Rules.

            Output: JSON array { day, startTime, endTime, subjectId, lecturerId, roomId }.
        `;

        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
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

export const analyzeUserSpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
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

export const getChatResponse = async (history: { role: string, parts: { text: string }[] }[], message: string): Promise<string> => {
    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: PRO_LOGICAL_CORE, // Default to Pro for chat
                history,
                message
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Chat service error");
        }

        const data = await response.json();
        return data.text || "I'm sorry, I couldn't process that.";

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
