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
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    // Normalize model selection: use flash for most tasks as it is 10x faster and reduces Vercel timeouts
    const model = preferredModel === 'pro' ? PRO_LOGICAL_CORE : STANDARD_LOGICAL_CORE;

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

        const contentType = response.headers.get('content-type') || '';
        
        if (!response.ok) {
            if (contentType.includes('application/json')) {
                const errorData = await response.json();
                const detailMsg = errorData.details || errorData.message || errorData.error || `AI Service Error: ${response.status}`;
                throw new Error(detailMsg);
            } else {
                const errorText = await response.text();
                console.error("[System Debug] Server returned Non-JSON Error Response:", errorText.substring(0, 500));
                
                if (errorText.includes('<html>')) {
                    throw new Error(`Cloud Infrastructure Error: ${response.status} (The server took too long to respond or encountered a gateway issue).`);
                }
                throw new Error(`AI Service Error: ${response.status} - ${errorText.substring(0, 100)}`);
            }
        }

        if (!contentType.includes('application/json')) {
            const rawText = await response.text();
            console.error("[System Debug] Expected JSON but got:", rawText.substring(0, 200));
            throw new Error("Gemini 3.0 Pro: The response returned an invalid format. This usually occurs during server-side timeouts.");
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
            `Generate a concise, professional justification (2 sentences) for ${lecturer.name} to teach ${subject.name} based on expertise: ${(lecturer.expertise || []).join(', ')}.`
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
            `Generate a concise justification for ${lecturer.name} to teach:\n${subjectList}\nExpertise: ${(lecturer.expertise || []).join(', ')}.`
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
    aiModelTier?: string,
    institution?: any
): Promise<{ entries: TimetableEntry[], notifications: string[] }> => {
    try {
        checkAiAvailable();
        
        // Flatten all levels for batching
        const allLevels = courses.flatMap(c => (c.levels || []).map(l => ({ 
            ...l, 
            courseId: c.id, 
            courseProfileId: c.scheduleProfileId 
        })));
        
        // BATCHING STRATEGY: 1 level per pass ensures each request fits within strict cloud execution time limits (10-30s)
        const BATCH_SIZE = 1;
        const cohorts: any[][] = [];
        for (let i = 0; i < allLevels.length; i += BATCH_SIZE) {
            cohorts.push(allLevels.slice(i, i + BATCH_SIZE));
        }

        let allGeneratedEntries: any[] = [];
        const allNotifications: string[] = [];
        // Force 'flash' for timetable generation regardless of tier to avoid Vercel 10s/60s timeouts
        const modelTier = 'flash'; 

        // Optimized Global Context (Pre-calculated to reduce repetitive JSON overhead)
        const compactRooms = rooms.map(r => ({ i: r.id.substring(0,6), n: r.name, b: r.buildingId?.substring(0,4) }));
        const compactProfiles = profiles.map(p => ({ i: p.id.substring(0,4), n: p.name, p: (p.periods || []).length }));

        console.log(`[Batch Engine] Sequence Initialized: ${allLevels.length} levels, ${cohorts.length} passes expected.`);

        for (let i = 0; i < cohorts.length; i++) {
            // Anti-Concurrency Surge: Small delay to prevent backend bottleneck
            if (i > 0) await new Promise(resolve => setTimeout(resolve, 1500));
            const currentCohort = cohorts[i];
            const cohortLevelIds = currentCohort.map(l => l.id);
            
            // Comprehensive Allocation Extraction for THIS COHORT
            const cohortAllocations = allocations.filter(a => {
                const levelIds = a.courseLevelIds || [];
                const targetId = (a as any).targetCourseLevelId;
                return levelIds.some(lid => cohortLevelIds.includes(lid)) || cohortLevelIds.includes(targetId);
            }).map(a => ({
                subjectId: a.subjectId,
                lecturerId: a.lecturerId,
                levelIds: (a.courseLevelIds || []).filter(lid => cohortLevelIds.includes(lid)).length > 0 
                           ? (a.courseLevelIds || []).filter(lid => cohortLevelIds.includes(lid))
                           : [(a as any).targetCourseLevelId].filter(id => cohortLevelIds.includes(id))
            }));

            // Pre-calculate exact fulfillment targets for this cohort to assure the user
            const fulfillmentTargets = currentCohort.map(l => {
                const profile = profiles.find(p => p.id === l.courseProfileId);
                const days = profile?.operatingDays?.length || settings.operatingDays?.length || 0;
                const periodCount = profile?.periods?.length || settings.periods?.length || 0;
                const levelAllocations = cohortAllocations.filter(a => a.levelIds.includes(l.id));
                
                // DRIVING SCHOOL OPTIMIZATION: Accounting for parallel resources (vehicles and instructors)
                const instType = institution?.institutionType || (institution as any)?.type;
                const isDrivingSchool = instType === 'Driving School';
                
                // Parallel Capacity: In driving schools, multiple vehicles (rooms) allow parallel sessions for the same cohort.
                const parallelCapacity = isDrivingSchool ? Math.max(1, rooms.length) : 1;
                const capacityMultiplier = isDrivingSchool ? 5.0 : 1.5; // High buffer for driving schools
                const totalSlots = (days * periodCount) * parallelCapacity * capacityMultiplier;

                let runningTotal = 0;
                const targets = levelAllocations.map(a => {
                    const sub = subjects.find(s => s.id === a.subjectId);
                    
                    // Check for stream-level override in metadata
                    const meta = (l.subjectMetadata || []).find((m: any) => m.subjectId === a.subjectId);
                    const structure = meta?.lessonStructure || sub?.lessonStructure || [];
                    const totalRequired = structure.reduce((acc: number, s: any) => acc + ((s.periods || 0) * (s.count || 0)), 0);
                    
                    if (runningTotal + totalRequired > totalSlots && totalSlots > 0) {
                        const allowedForThisSub = Math.max(0, totalSlots - runningTotal);
                        if (allowedForThisSub < totalRequired) {
                            allNotifications.push(`Capacity exceeded for ${l.name}: Subject ${sub?.name} (${totalRequired} sessions) was trimmed to ${allowedForThisSub} sessions to fit into ${totalSlots} available slots.`);
                        }
                        runningTotal += allowedForThisSub;
                        return { subject: sub?.name, id: a.subjectId, count: allowedForThisSub };
                    }

                    runningTotal += totalRequired;
                    return { subject: sub?.name, id: a.subjectId, count: totalRequired };
                }).filter(t => t.count > 0);

                if (runningTotal > totalSlots && totalSlots > 0) {
                    console.warn(`[Batch Engine] Level ${l.name} workload (${runningTotal}) exceeds total slots (${totalSlots}). Pruning applied.`);
                }

                return { level: l.name, id: l.id, courseId: l.courseId, homeRoomId: l.roomId, targets, availableSlots: totalSlots };
            });

            if (fulfillmentTargets.every(f => f.targets.length === 0)) {
                console.log(`[Batch Engine] Pass ${i+1}: No workload targets for ${currentCohort.map(l => l.name).join(', ')}. Skipping.`);
                continue;
            }

            // SUB-BATCHING STRATEGY: If a single cohort has too many sessions, split into multiple AI calls
            // This prevents the 4096 token limit from truncating the response.
            const COHORT_TARGET_LIMIT = 150; 
            const cohortEntries: any[] = [];
            
            for (const ft of fulfillmentTargets) {
                const targetChunks: any[][] = [];
                for (let j = 0; j < ft.targets.length; j += COHORT_TARGET_LIMIT) {
                    targetChunks.push(ft.targets.slice(j, j + COHORT_TARGET_LIMIT));
                }

                for (let k = 0; k < targetChunks.length; k++) {
                    const currentTargets = targetChunks[k];
                    console.log(`[Batch Engine] Pass ${i+1}.${k+1}: Generating ${currentTargets.reduce((acc, t) => acc + t.count, 0)} sessions for ${ft.level}`);

                    const instType = institution?.institutionType || (institution as any)?.type;
                    const isDrivingSchool = instType === 'Driving School';
                    const prompt = `
                        ACT AS: Master Academic Scheduling Logic Engine (Pass ${i + 1}.${k + 1} of ${cohorts.length})
                        
                        OPERATING BOUNDS:
                        - General Days: ${JSON.stringify(settings.operatingDays)}
                        - General Range: ${settings.startTime} to ${settings.endTime}
                        - Profiles: ${JSON.stringify(compactProfiles)}
                        - Rooms: ${JSON.stringify(compactRooms)}
                        
                        MANDATORY TARGETS FOR ${ft.level}:
                        ${JSON.stringify({ l: ft.level, i: ft.id, r: ft.homeRoomId, t: currentTargets.map((t: any) => ({ i: t.id, c: t.count })) })}
                        
                        ${isDrivingSchool ? `DRIVING SCHOOL PARALLELISM:
                        - Level "${ft.level}" can have MULTIPLE lessons at the same time.
                        - You MUST schedule lessons in parallel across different Rooms (Vehicles) and Lecturers (Instructors).
                        - Do NOT restrict one lesson per time slot for this level.` : ''}

                        CONTEXT: 
                        Avoid conflicts with these already scheduled sessions: ${allGeneratedEntries.slice(-50).map(e => `${e.day}|${e.startTime}|L:${e.lecturerId}|R:${e.roomId}`).join(';')}
                        
                        OUTPUT:
                        - JSON Array: [ { day, startTime, endTime, subjectId, lecturerId, roomId, courseId, courseLevelId }, ... ]
                    `;

                    const response = await safeGenerateContent(prompt, { 
                        responseMimeType: 'application/json',
                        temperature: 0.1,
                        maxOutputTokens: 4096 
                    }, modelTier);

                    const shardResult = sanitizeAndParseJson(response.text || "[]");
                    const finalShard = (Array.isArray(shardResult) ? shardResult : []).map((entry: any) => ({
                        ...entry,
                        courseId: entry.courseId || ft.courseId,
                        courseLevelId: entry.courseLevelId || ft.id,
                        id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
                    }));

                    cohortEntries.push(...finalShard);
                    // Minimal delay between sub-batches
                    if (k < targetChunks.length - 1) await new Promise(resolve => setTimeout(resolve, 800));
                }
            }

            allGeneratedEntries = [...allGeneratedEntries, ...cohortEntries];
            console.log(`[Batch Engine] Level Pass ${i+1}/${cohorts.length} finished. Added ${cohortEntries.length} sessions.`);
        }

        return { entries: allGeneratedEntries, notifications: Array.from(new Set(allNotifications)) };
    } catch (error) {
        console.error("Critical Failure in Batch Timetable Engine:", error);
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

/**
 * Helper to ensure chat history alternates strictly between 'user' and 'model' roles,
 * starting with a 'user' message and ending with a 'model' message.
 * This is a strict requirement for Gemini API multi-turn conversations.
 */
const sanitizeChatHistory = (
    history: { role: string, parts: { text: string }[] }[]
): { role: string, parts: { text: string }[] }[] => {
    // 1. Filter out initial messages that are not from 'user' (e.g. welcome greetings)
    const cleanHistory = [...history];
    while (cleanHistory.length > 0 && cleanHistory[0].role !== 'user') {
        cleanHistory.shift();
    }

    // 2. Build alternating history
    const alternatingHistory: { role: string, parts: { text: string }[] }[] = [];
    let expectedRole = 'user';
    for (const msg of cleanHistory) {
        const role = msg.role === 'model' ? 'model' : 'user';
        if (role === expectedRole) {
            alternatingHistory.push({
                role,
                parts: [{ text: msg.parts?.[0]?.text || '' }]
            });
            expectedRole = expectedRole === 'user' ? 'model' : 'user';
        } else {
            // Consecutive messages of same role: merge content to avoid API schema violations
            if (alternatingHistory.length > 0) {
                const lastMsg = alternatingHistory[alternatingHistory.length - 1];
                const newText = msg.parts?.[0]?.text || '';
                if (newText) {
                    lastMsg.parts[0].text = lastMsg.parts[0].text
                        ? `${lastMsg.parts[0].text}\n${newText}`
                        : newText;
                }
            }
        }
    }

    // 3. Ensure history ends with 'model' so that the upcoming sendMessage('user') alternates correctly
    while (alternatingHistory.length > 0 && alternatingHistory[alternatingHistory.length - 1].role !== 'model') {
        alternatingHistory.pop();
    }

    return alternatingHistory;
};

export const getChatResponse = async (history: { role: string, parts: { text: string }[] }[], message: string, aiModelTier?: string): Promise<string> => {
    try {
        const token = await apiService.getAuthToken();
        const cleanHistory = sanitizeChatHistory(history);

        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
                model: PRO_LOGICAL_CORE, // Default to Pro for chat
                history: cleanHistory,
                message
            })
        });

        const contentType = response.headers.get('content-type') || '';
        
        if (!response.ok) {
            if (contentType.includes('application/json')) {
                const errorData = await response.json();
                const detailMsg = errorData.details || errorData.message || errorData.error || `AI Service Error: ${response.status}`;
                throw new Error(detailMsg);
            } else {
                const errorText = await response.text();
                console.error("[geminiService] Non-JSON response from Chat Service:", errorText.substring(0, 200));
                throw new Error("I encountered a communication error with the AI matrix. Please try again.");
            }
        }

        if (!contentType.includes('application/json')) {
            const text = await response.text();
            console.error("[geminiService] Expected JSON but got:", text.substring(0, 200));
            throw new Error("I encountered a communication error with the AI matrix. Please try again.");
        }

        const data = await response.json();
        return data.text || "I'm sorry, I couldn't process that.";

    } catch (error: any) {
        console.error("AI chat error:", error);
        const sanitized = sanitizeAiError(error);
        return sanitized.message;
    }
};

/**
 * Institution-aware chat: prepends a live data context snapshot as the first message
 * so the AI can answer grounded questions about students, fees, DS, BC, HIS etc.
 */
export const getInstitutionAwareChatResponse = async (
    contextSnapshot: string,
    history: { role: string, parts: { text: string }[] }[],
    message: string
): Promise<string> => {
    try {
        const token = await apiService.getAuthToken();
        const cleanHistory = sanitizeChatHistory(history);

        // Inject context as the first model turn so it acts as a system prompt
        const enrichedHistory = [
            { role: 'user', parts: [{ text: 'Please acknowledge your role and the institution data you have access to.' }] },
            { role: 'model', parts: [{ text: contextSnapshot + '\n\nUnderstood. I am EduAI with live access to this institution\'s data. I\'m ready to help.' }] },
            ...cleanHistory
        ];

        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
                model: PRO_LOGICAL_CORE,
                history: enrichedHistory,
                message
            })
        });

        const contentType = response.headers.get('content-type') || '';
        
        if (!response.ok) {
            if (contentType.includes('application/json')) {
                const errorData = await response.json();
                const detailMsg = errorData.details || errorData.message || errorData.error || `AI Service Error: ${response.status}`;
                throw new Error(detailMsg);
            } else {
                const errorText = await response.text();
                console.error("[geminiService] Non-JSON from Institution Chat:", errorText.substring(0, 200));
                throw new Error("I encountered a communication error with the AI matrix. Please try again.");
            }
        }

        if (!contentType.includes('application/json')) {
            const text = await response.text();
            console.error("[geminiService] Expected JSON but got:", text.substring(0, 200));
            throw new Error("I encountered a communication error with the AI matrix. Please try again.");
        }

        const data = await response.json();
        return data.text || "I'm sorry, I couldn't process that.";
    } catch (error: any) {
        console.error("Institution AI chat error:", error);
        const sanitized = sanitizeAiError(error);
        return sanitized.message;
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
        console.warn("AI book map unavailable, using local heuristic header matcher.");
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
        // Use 'flash' for contents like manifesto to prevent Vercel 10s timeout on Hobby plans
        const response = await safeGenerateContent(prompt, {}, 'flash');
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
        console.error("AI Voter map error:", error);
        return defaultMapping;
    }
};

export const analyzeIcdSpreadsheet = async (headers: string[]): Promise<Record<string, string | null>> => {
    const defaultMapping = {
        code: null,
        description: null,
        category: null,
        version: null
    };

    try {
        checkAiAvailable();
        const prompt = `
            Act as a Medical Data Integrator. Map these headers to ICD (International Classification of Diseases) fields:
            - code: The alphanumeric diagnosis code (e.g., A00.0, Z01.1)
            - description: The full clinical description of the diagnosis
            - category: The broad chapter or category group (e.g., Infectious diseases)
            - version: The version system (e.g., ICD-10, ICD-11)
            
            Spreadsheet Headers: ${JSON.stringify(headers)}
            
            Return ONLY a JSON object mapping these 4 fields to the original headers. Use null if not found.
        `;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        const aiMapping = sanitizeAndParseJson(response.text || "{}");
        return { ...defaultMapping, ...aiMapping };
    } catch (error) {
        console.error("AI ICD map error:", error);
        return defaultMapping;
    }
};

export async function suggestDiagnosis(patientData: {
    fullName: string,
    age: number,
    gender: string,
    vitals: any[],
    notes: string,
    history?: { allergies?: string, chronic?: string }
}): Promise<{
    suggestions: Array<{ code: string, diagnosis: string, confidence: number, reasoning: string }>,
    warning?: string
}> {
    try {
        checkAiAvailable();
        const prompt = `
            Act as a Senior Clinical Diagnostic Assistant. Analyze this patient data:
            - Patient: ${patientData.fullName} (${patientData.age}y, ${patientData.gender})
            - Vitals: ${JSON.stringify(patientData.vitals)}
            - Clinical Notes: ${patientData.notes}
            - History: ${patientData.history?.chronic || 'None'} ${patientData.history?.allergies ? `(Allergies: ${patientData.history.allergies})` : ''}
            
            Provide a list of 3 potential ICD-10 diagnoses (Differential Diagnoses).
            For each, provide:
            1. code: The ICD-10 alphanumeric code
            2. diagnosis: The standard medical name
            3. confidence: A percentage (0-100) based on signals
            4. reasoning: A short sentence explaining why.
            
            Also, if you detect any life-threatening signals or potential drug-allergy interactions, include a 'warning' field.
            
            Return ONLY a valid JSON object in this format:
            { "suggestions": [...], "warning": "string | undefined" }
        `;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
        return sanitizeAndParseJson(response.text || '{"suggestions":[]}');
    } catch (error) {
        console.error("AI Diagnosis Error:", error);
        return { suggestions: [] };
    }
}

/**
 * Political AI Agent: Redrafts high-impact agendas for a political manifesto.
 */
export const generateManifestoAgendas = async (profile: any): Promise<string[]> => {
    try {
        checkAiAvailable();
        const prompt = `
            Act as a Senior Political Strategist. Draft 3 high-impact, actionable, and persuasive political agendas for a candidate in Kenya.
            
            Candidate Context:
            - Name: ${profile.candidateName}
            - Position: ${profile.position}
            - Party: ${profile.partyName}
            - Location: ${profile.county || ''} ${profile.constituency || ''} ${profile.ward || ''}
            
            Requirements:
            - Each agenda must be concise (max 10 words).
            - Focus on tangible community benefits (e.g., water, youth employment, healthcare, transparency).
            - Use powerful, active language.
            
            Return ONLY a JSON array of 3 strings.
        `;
        const response = await safeGenerateContent(prompt, { 
            responseMimeType: 'application/json',
            temperature: 0.7 
        }, 'flash');
        
        const result = sanitizeAndParseJson(response.text || "[]");
        if (Array.isArray(result) && result.length > 0) {
            return result.slice(0, 3);
        }
        return ["Revitalizing Local Economy", "Sustainable Healthcare Access", "Youth & Women Empowerment"];
    } catch (error) {
        console.error("AI Manifesto error:", error);
        return ["Revitalizing Local Economy", "Sustainable Healthcare Access", "Youth & Women Empowerment"];
    }
};

/**
 * Generates professional AI remarks for a student report card based on their performance data.
 */
export const generateReportCardRemarks = async (
    studentName: string,
    subjects: any[],
    overallPerformance: any,
    institutionName: string
): Promise<string> => {
    const prompt = `
        Act as a Professional Class Teacher at ${institutionName}.
        Generate professional academic remarks for a student named ${studentName}.
        
        PERFORMANCE DATA:
        - Overall Mean: ${overallPerformance.meanPercentage.toFixed(1)}%
        - Mean Grade: ${overallPerformance.meanGrade?.grade || 'N/A'}
        - Class Rank: ${overallPerformance.rank} of ${overallPerformance.totalStudents}
        - Subject Results: ${subjects.map(s => `${s.subject.name}: ${s.percentage.toFixed(0)}% (${s.grade?.grade})`).join(', ')}
        
        GUIDELINES:
        1. Be professional, encouraging, and constructive.
        2. Mention specific subject strengths or areas for improvement.
        3. For top performers, mention their benchmark setting.
        4. For struggling students, suggest a focus on core areas.
        5. Keep it to 3-4 impactful sentences.
        6. Do not use placeholders; generate the final text.
        7. Use a tone suitable for a formal progress report.
    `;

    try {
        const response = await safeGenerateContent(prompt, { temperature: 0.7, maxOutputTokens: 500 }, 'flash');
        return response.text || "Consistently demonstrates commitment to academic excellence. Encouraged to maintain this momentum.";
    } catch (e) {
        console.error("AI Remarks Error:", e);
        return `${studentName} has demonstrated consistent academic progression. Significant aptitude is noted across core subjects. Encouraging results that suggest strong potential for further growth.`;
    }
};

/**
 * AI Academic Insight Translator: Simplifies academic insights for parents in their native language
 */
export const translateAcademicInsight = async (text: string, targetLanguage: string): Promise<string> => {
    try {
        checkAiAvailable();
        const prompt = `
            Act as an Academic Translation Assistant.
            Translate and simplify the following student academic comment or report into clear, encouraging, parent-friendly terms.
            
            Academic Text: "${text}"
            Target Language/Dialect: "${targetLanguage}" (e.g. Swahili, French, Simplified English, Sheng)
            
            Guidelines:
            1. Simplify any academic jargon or technical terms.
            2. Maintain a positive, constructive, and supportive tone.
            3. Translate accurately to the target language/dialect.
            4. Return ONLY the translated/simplified text. No extra text or intro/outro.
        `;
        const response = await safeGenerateContent(prompt, { temperature: 0.3 }, 'flash');
        return response.text?.trim() || text;
    } catch (error) {
        console.error("AI translation error:", error);
        return text;
    }
};

/**
 * AI Empathetic Tone Assistant: Refines messages from teachers to parents
 */
export const refineTeacherTone = async (text: string): Promise<string> => {
    try {
        checkAiAvailable();
        const prompt = `
            Act as an Empathetic Teacher Tone Assistant.
            Refine the following drafted message from a teacher to a student's parent.
            Make it highly empathetic, constructive, and encouraging, focusing on a partnership for the child's academic development.
            
            Original Text: "${text}"
            
            Guidelines:
            1. Ensure the tone is positive, constructive, and supportive.
            2. Avoid negative blame and phrase weaknesses as opportunities for growth.
            3. End with a constructive suggestion or collaborative note.
            4. Keep it concise.
            5. Return ONLY the refined text. No introductory remarks.
        `;
        const response = await safeGenerateContent(prompt, { temperature: 0.5 }, 'flash');
        return response.text?.trim() || text;
    } catch (error) {
        console.error("AI tone refinement error:", error);
        return text;
    }
};

/**
 * AI Conference Agenda Generator: Creates customizable parent-teacher agendas
 */
export const generateConferenceAgenda = async (studentName: string, performanceData: {
    subjects: any[];
    attendanceRate: number;
    disciplineIncidents: any[];
}): Promise<string[]> => {
    try {
        checkAiAvailable();
        const prompt = `
            Act as an Educational Conference Facilitator.
            Generate a personalized parent-teacher meeting agenda for the student named ${studentName}.
            
            ACADEMIC & CONTEXT DATA:
            - Attendance Rate: ${performanceData.attendanceRate.toFixed(0)}%
            - Academic Standing: ${JSON.stringify(performanceData.subjects)}
            - Discipline Logs: ${JSON.stringify(performanceData.disciplineIncidents)}
            
            Guidelines:
            1. Create a structured agenda consisting of 4 distinct, constructive discussion topics.
            2. Focus on acknowledging accomplishments, addressing areas requiring growth, outlining collaborative home study strategies, and setting targets.
            3. Keep each point brief, action-oriented, and professional.
            4. Return the list as a JSON array of strings: ["topic 1", "topic 2", "topic 3", "topic 4"].
            
            Return ONLY the valid JSON array of strings.
        `;
        const response = await safeGenerateContent(prompt, { responseMimeType: 'application/json', temperature: 0.4 }, 'flash');
        const result = sanitizeAndParseJson(response.text || "[]");
        if (Array.isArray(result) && result.length > 0) return result;
        return [
            "1. Celebrate student milestones and strengths in core subjects",
            "2. Target specific learning gaps and areas needing structured attention",
            "3. Support student success through home study routines and time-management guidelines",
            "4. Establish a collaborative channel and clear targets for the upcoming assessment"
        ];
    } catch (error) {
        console.error("AI agenda generation error:", error);
        return [
            "1. Celebrate student milestones and strengths in core subjects",
            "2. Target specific learning gaps and areas needing structured attention",
            "3. Support student success through home study routines and time-management guidelines",
            "4. Establish a collaborative channel and clear targets for the upcoming assessment"
        ];
    }
};

/**
 * Parent's Home-Coach Advice: Customized instructions to help children study at home
 */
export const generateHomeCoachingAdvice = async (childName: string, subjectName: string, performanceSummary: string): Promise<string> => {
    try {
        checkAiAvailable();
        const prompt = `
            Act as a supportive, expert Home Study Coach for parents.
            Generate practical, encouraging home coaching guidelines and exercises for a parent to help their child, ${childName}, with the subject: ${subjectName}.
            
            CONTEXT/PERFORMANCE SUMMARY:
            "${performanceSummary}"
            
            Guidelines:
            1. Suggest 2-3 specific, active coaching strategies the parent can do at home (e.g. practical exercises, questioning methods).
            2. Provide 2 simple review questions aligned with standard syllabus requirements.
            3. Keep the tone friendly, accessible, and simple. Avoid teacher jargon.
            4. Present details cleanly with bullet points.
            5. Keep the response to 3 short paragraphs max.
        `;
        const response = await safeGenerateContent(prompt, { temperature: 0.6 }, 'flash');
        return response.text || "Consistently encourage daily revision, practice active recall, and set aside quiet time for study.";
    } catch (error) {
        console.error("AI home coaching error:", error);
        return "Encourage daily review of notes, practice active recall by asking the child to explain concepts in their own words, and provide structured time for problem-solving tasks.";
    }
};

