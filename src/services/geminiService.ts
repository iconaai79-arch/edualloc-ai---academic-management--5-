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
                throw new Error(errorData.message || errorData.error || `AI Service Error: ${response.status}`);
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
        const modelTier = aiModelTier === 'premium' ? 'pro' : 'flash';

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
                const totalSlots = (days * periodCount) * 1.5; // Added 50% buffer to support high-density/parallel schedules
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

                return { level: l.name, id: l.id, homeRoomId: l.roomId, targets, availableSlots: totalSlots };
            });

            if (fulfillmentTargets.every(f => f.targets.length === 0)) {
                console.log(`[Batch Engine] Pass ${i+1}: No workload targets for ${currentCohort.map(l => l.name).join(', ')}. Skipping.`);
                continue;
            }

            // Ultra-Lean Context: Only send last 100 entries and use minimal ID matching to stay under timeout limits
            const recentContext = allGeneratedEntries.slice(-100); 
            const committedContext = recentContext.map(e => 
                `${e.day.substring(0,2)}|${e.startTime}|L:${e.lecturerId.substring(0,3)}|R:${e.roomId.substring(0,3)}`
            ).join(';');

            const prompt = `
                ACT AS: Master Academic Scheduling Logic Engine (Pass ${i + 1} of ${cohorts.length})
                
                OPERATING BOUNDS:
                - General Days: ${JSON.stringify(settings.operatingDays)}
                - General Range: ${settings.startTime} to ${settings.endTime}
                - Profiles: ${JSON.stringify(compactProfiles)}
                - Rooms: ${JSON.stringify(compactRooms)}
                
                MANDATORY TARGETS:
                ${JSON.stringify(fulfillmentTargets.map(f => ({ l: f.level, i: f.id, r: f.homeRoomId, t: f.targets.map((t: any) => ({ i: t.id, c: t.count })) })))}
                
                OUTPUT:
                - JSON Array: [ { day, startTime, endTime, subjectId, lecturerId, roomId, courseId, courseLevelId }, ... ]
            `;

            const response = await safeGenerateContent(prompt, { 
                responseMimeType: 'application/json',
                temperature: 0.1,
                maxOutputTokens: 16384 // Increased from 8192 to prevent truncation in large cohorts
            }, modelTier);

            const shardResult = sanitizeAndParseJson(response.text || "[]");
            const finalShard = (Array.isArray(shardResult) ? shardResult : []).map((entry: any) => {
                const levelData = currentCohort.find(l => String(l.id) === String(entry.courseLevelId));
                return {
                    ...entry,
                    courseId: entry.courseId || levelData?.courseId,
                    id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
                };
            });

            allGeneratedEntries = [...allGeneratedEntries, ...finalShard];
            console.log(`[Batch Engine] Sequence ${i+1}/${cohorts.length} finished. Added ${finalShard.length} sessions.`);
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
