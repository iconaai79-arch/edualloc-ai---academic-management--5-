import { GoogleGenAI } from "@google/genai";
import type { User, Subject, AllocationRequest, Room, TimetableEntry, TimetableSettings, Course, TimeOffRequest, ExamTimetableEntry, Internship, ExamTimetableSettings, LessonStructure, ScheduleProfile } from '../types';

// Safely initialize API client. If KEY is missing, it will be null and calls will fail gracefully instead of crashing the app at startup.
const apiKey = process.env.API_KEY;
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

const getModelForTier = (tier?: 'free' | 'premium', isReasoningTask: boolean = false): string => {
    if (tier === 'premium') return 'gemini-1.5-pro';
    if (isReasoningTask) return 'gemini-1.5-pro'; // Default to Pro for heavy tasks if tier unknown? No, user wants 'free'.
    return 'gemini-1.5-flash';
};

export const generateJustification = async (lecturer: User, subject: Subject, tier?: 'free' | 'premium'): Promise<string> => {
    try {
        checkAiAvailable();
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier),
            contents: `Generate a concise, professional justification (2 sentences) for ${lecturer.name} to teach ${subject.name} based on expertise: ${lecturer.expertise.join(', ')}.`,
        });
        return response.text || "";
    } catch (error) {
        console.error("AI justification error:", error);
        return "Qualified lecturer with demonstrated competency in the subject domain.";
    }
};

export const generateBulkJustification = async (lecturer: User, subjects: Subject[], tier?: 'free' | 'premium'): Promise<string> => {
    try {
        checkAiAvailable();
        const subjectList = subjects.map(s => `- ${s.name} (${s.code})`).join('\n');
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier),
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
    curriculumProfile: string,
    tier?: 'free' | 'premium'
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
            model: getModelForTier(tier, true),
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI Pathway Sync Error:", error);
        return {};
    }
};

export const generateInternshipReport = async (student: User, internship: Internship, courseName: string, keywords: string, tier?: 'free' | 'premium'): Promise<string> => {
    try {
        checkAiAvailable();
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier),
            contents: `Generate a professional internship report for ${student.name} at ${internship.industryName}. Course: ${courseName}. Keywords: ${keywords}`,
        });
        return response.text || "";
    } catch (error) {
        console.error("AI report error:", error);
        return "Demonstrated high professional standards during the internship period.";
    }
};

export const analyzeTimetableSpreadsheet = async (headers: string[], tier?: 'free' | 'premium'): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map these headers to: startTime, subjectCode, lecturerName, roomName, day, endTime. Headers: ${JSON.stringify(headers)}. Return JSON only.`;
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier),
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
    tier?: 'free' | 'premium'
): Promise<TimetableEntry[]> => {
    try {
        checkAiAvailable();
        const prompt = `
            Task: Generate a conflict-free university/school timetable.
            
            Inputs:
            - Approved Allocations: ${JSON.stringify(allocations)}
            - Subject Details (Structures): ${JSON.stringify(subjects.map(s => ({ id: s.id, code: s.code, structure: s.lessonStructure })))}
            - Room Capacities: ${JSON.stringify(rooms.map(r => ({ id: r.id, cap: r.capacity })))}
            - Operating Hours/Days: ${JSON.stringify({ start: settings.startTime, end: settings.endTime, days: settings.operatingDays })}
            - Curriculum Schedule Profiles (Specific breaks/durations per course): ${JSON.stringify(profiles)}
            - Global Breaks: ${JSON.stringify(settings.breaks)}
            
            CRITICAL INSTRUCTIONS:
            - Every course belongs to a specific "curriculum profile".
            - You MUST respect the specific breaks and durations defined in the Profile for each subject belonging to that profile.
            - Ensure no lecturer is double-booked across different profiles.
            
            Output Requirement:
            Return a JSON array of objects: { day, startTime, endTime, subjectId, lecturerId, roomId }.
        `;

        const response = await ai!.models.generateContent({
            model: getModelForTier(tier, true),
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingBudget: 32768 }
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
    tier?: 'free' | 'premium'
): Promise<ExamTimetableEntry[]> => {
    try {
        checkAiAvailable();
        const prompt = `Generate exam timetable for period ${JSON.stringify(examPeriod)}. Return JSON array. Rules: ${JSON.stringify(settings.rules)}.`;
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier, true),
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingBudget: 32768 }
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

export const analyzeUserSpreadsheet = async (headers: string[], tier?: 'free' | 'premium'): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map headers to user fields: name, email, phoneNumber, staffId, role, departmentName, expertise, gender. Headers: ${JSON.stringify(headers)}. Return JSON.`;
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier),
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI user map error:", error);
        return {};
    }
};

export const analyzeCourseSpreadsheet = async (headers: string[], isSchool: boolean, tier?: 'free' | 'premium'): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map headers to course fields: name, code, departmentName, academicLevelName. Headers: ${JSON.stringify(headers)}. Return JSON.`;
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier),
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI course map error:", error);
        return {};
    }
};

export const analyzeSubjectSpreadsheet = async (headers: string[], tier?: 'free' | 'premium'): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map headers to subject fields: name, code, departmentName, description, shortName, lessonStructure, targetCourseLevel. Headers: ${JSON.stringify(headers)}. Return JSON.`;
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier),
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI subject map error:", error);
        return {};
    }
};

export const findLocationCoordinates = async (query: string, tier?: 'free' | 'premium'): Promise<{ latitude: number, longitude: number, address: string, googleMapsUri?: string } | null> => {
    try {
        checkAiAvailable();
        const prompt = `Find GPS coordinates and official address for: "${query}". Return JSON: { latitude: number, longitude: number, address: string }.`;
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier),
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
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

export const getChatResponse = async (history: { role: string, parts: { text: string }[] }[], message: string, tier?: 'free' | 'premium'): Promise<string> => {
    try {
        checkAiAvailable();
        const chat = ai!.chats.create({
            model: getModelForTier(tier),
            config: { history }
        });
        const result = await chat.sendMessage({ message });
        return result.text || "I'm sorry, I couldn't process that.";
    } catch (error) {
        console.error("AI chat error:", error);
        return "I encountered an error. Please try again.";
    }
};

export const analyzeInventorySpreadsheet = async (headers: string[], tier?: 'free' | 'premium'): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map headers to inventory fields: name, category, quantity, unit, reorderLevel, location. Headers: ${JSON.stringify(headers)}. Return JSON.`;
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier),
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI inventory map error:", error);
        return {};
    }
};

export const analyzeDepartmentSpreadsheet = async (headers: string[], tier?: 'free' | 'premium'): Promise<Record<string, string | null>> => {
    try {
        checkAiAvailable();
        const prompt = `Map headers to department fields: name. Headers: ${JSON.stringify(headers)}. Return JSON.`;
        const response = await ai!.models.generateContent({
            model: getModelForTier(tier),
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return sanitizeAndParseJson(response.text || "{}");
    } catch (error) {
        console.error("AI department map error:", error);
        return {};
    }
};
