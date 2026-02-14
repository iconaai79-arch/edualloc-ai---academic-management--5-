
import { GoogleGenAI } from "@google/genai";
import type { User, Subject, AllocationRequest, Room, TimetableEntry, TimetableSettings, Course, TimeOffRequest, ExamTimetableEntry, Internship, ExamTimetableSettings, LessonStructure, ScheduleProfile } from '../types';

// Safely initialize API client. If KEY is missing, it will be null and calls will fail gracefully instead of crashing the app at startup.
const getSafeKey = () => {
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_API_KEY || process.env.VITE_GEMINI_API_KEY;
        }
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            return (import.meta as any).env.VITE_API_KEY || (import.meta as any).env.API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY;
        }
    } catch (e) { }
    return null;
};
const apiKey = getSafeKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const checkAiAvailable = () => {
    if (!ai) throw new Error("AI Service Unavailable: API_KEY not configured.");
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
        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a concise, professional justification (2 sentences) for ${lecturer.name} to teach ${subject.name} based on expertise: ${lecturer.expertise.join(', ')}.`,
        });
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
        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a concise justification for ${lecturer.name} to teach:\n${subjectList}\nExpertise: ${lecturer.expertise.join(', ')}.`,
        });
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

        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI Pathway Sync Error:", error);
        return {};
    }
};

export const generateInternshipReport = async (student: User, internship: Internship, courseName: string, keywords: string): Promise<string> => {
    try {
        checkAiAvailable();
        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a professional internship report for ${student.name} at ${internship.industryName}. Course: ${courseName}. Keywords: ${keywords}`,
        });
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
        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
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
            
            NON-NEGOTIABLE HEURISTICS:
            1. INSTITUTIONAL PROFILES: Every course follows a specific schedule profile. You MUST use the exact start times, end times, and break windows defined in the profile associated with the course.
            2. FACULTY GOVERNANCE (CRITICAL): You MUST strictly enforce the "Faculty Governance Rules":
               - max_consecutive_lessons: Stop all allocations for a teacher once they hit the limit (e.g. if limit is 2, they cannot teach 3 in a row).
               - max_lessons_per_day: Absolute cap on total lessons per day per faculty.
               - preferred_start/end_time: Treat these as strict windows for that specific teacher.
               - no_lessons_after: Absolute cut-off time for that teacher.
            3. TIME-OFF REQUESTS: If a teacher has a "Time-Off Request" for a specific day/time, you CANNOT schedule them then.
            4. SUBJECT CONSTRAINTS: Respect all association rules (consecutive, same-day, etc.).
            5. DOUBLE-BOOKING: Zero tolerance for lecturer, room, or student group overlap.
            
            PLANNING STRATEGY:
            - Use a "First-Pass" to place high-priority/constrained subjects first.
            - Use a "Verification-Pass" to check every single entry against the Faculty Governance Rules.
            
            Output: JSON array { day, startTime, endTime, subjectId, lecturerId, roomId }.
        `;

        const modelName = aiModelTier === 'premium' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

        const response = await ai!.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                thinkingConfig: aiModelTier === 'premium' ? { thinkingBudget: 32768 } : undefined
            }
        });
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

        const modelName = aiModelTier === 'premium' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

        const response = await ai!.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                thinkingConfig: aiModelTier === 'premium' ? { thinkingBudget: 32768 } : undefined
            }
        });
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
        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
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
        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
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
        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI subject map error:", error);
        return {};
    }
};

export const findLocationCoordinates = async (query: string, aiModelTier?: string): Promise<{ latitude: number, longitude: number, address: string, googleMapsUri?: string } | null> => {
    try {
        checkAiAvailable();
        const response = await ai!.models.generateContent({
            model: aiModelTier === 'premium' ? 'gemini-2.0-pro-exp-02-05' : 'gemini-3-flash-preview',
            contents: `Find GPS coordinates for "${query}". Return JSON: {latitude, longitude, address, googleMapsUri}. Use null if not found.`,
            config: { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
        });
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
        checkAiAvailable();
        const chat = ai!.chats.create({
            model: 'gemini-3-flash-preview',
            history: history as any
        });
        const result = await chat.sendMessage({ message });
        return result.text || "I'm sorry, I couldn't process that.";
    } catch (error) {
        console.error("AI chat error:", error);
        return "I encountered an error. Please try again.";
    }
};

export const analyzeCountyInventorySpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map these spreadsheet headers to county inventory fields: name, category, quantity, unit, supplierName, targetInstitutionId, deliveryMethod. Headers: ${JSON.stringify(headers)}. Return ONLY a JSON object mapping fields to the corresponding spreadsheet headers. Use null for missing fields.`;
        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
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
        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
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
        const response = await ai!.models.generateContent({
            model: aiModelTier === 'premium' ? 'gemini-2.0-pro-exp-02-05' : 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
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
        const response = await ai!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI institution map error:", error);
        return {};
    }
};
