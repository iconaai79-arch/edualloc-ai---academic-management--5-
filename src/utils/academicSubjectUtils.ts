import type { Subject, Course } from '../types';
import { extractClassAndStream } from './academicUtils';

/**
 * Checks if a subject is applicable to a particular class/grade according to Kenyan CBC & 8-4-4 curriculum rules
 */
export const isSubjectApplicableToClass = (
    subject: { code?: string; name?: string; description?: string; targetClasses?: string[]; assignedClasses?: string[] },
    className: string
): boolean => {
    if (!className || !className.trim()) return true;

    const cLower = className.toLowerCase().trim();
    const targetCls = subject.targetClasses || subject.assignedClasses || (subject as any).classes;

    // 0. If explicit targetClasses array is defined and non-empty, check for exact/partial class match or level match
    if (Array.isArray(targetCls) && targetCls.length > 0) {
        const hasExplicitMatch = targetCls.some(c => {
            const cleanC = (c || '').toLowerCase().trim();
            return cleanC === cLower ||
                   cLower.startsWith(cleanC) ||
                   cleanC.startsWith(cLower) ||
                   (cleanC.includes('lower primary') && /\b(grade|std|class)\s*[1-3]\b/i.test(className)) ||
                   (cleanC.includes('upper primary') && /\b(grade|std|class)\s*[4-6]\b/i.test(className)) ||
                   (cleanC.includes('junior secondary') && /\b(grade|std|class)\s*[7-9]\b/i.test(className));
        });
        if (hasExplicitMatch) return true;
    }

    const code = (subject.code || '').toUpperCase().trim();
    const name = (subject.name || '').toLowerCase().trim();
    const desc = (subject.description || '').toLowerCase().trim();

    const isPPClass = cLower.includes('pp1') || cLower.includes('pp2') || cLower.includes('pp 1') || cLower.includes('pp 2') || cLower.includes('playgroup') || cLower.includes('nursery') || cLower.includes('kindergarten') || cLower.includes('kg') || cLower === 'pp';
    const isLPClass = /\b(grade|std|standard|class)\s*[1-3]\b/i.test(className) || cLower.includes('lower primary') || cLower === 'g1' || cLower === 'g2' || cLower === 'g3';
    const isUPClass = /\b(grade|std|standard|class)\s*[4-6]\b/i.test(className) || cLower.includes('upper primary') || cLower === 'g4' || cLower === 'g5' || cLower === 'g6';
    const isJSSClass = /\b(grade|std|standard|class)\s*[7-9]\b/i.test(className) || cLower.includes('jss') || cLower.includes('junior') || cLower === 'g7' || cLower === 'g8' || cLower === 'g9';
    const isSecondaryClass = /\b(form|f)\s*[1-4]\b/i.test(className) || /\b(grade|std|standard|class)\s*(10|11|12)\b/i.test(className) || cLower.includes('secondary') || cLower.includes('high school') || cLower.includes('senior');

    // 1. High School / Secondary pure sciences, technical electives & KCSE papers are NEVER applicable to Primary or JSS (Grade 7-9)
    const isSecondaryOnlySubject =
        code.endsWith('-SEC') || code.endsWith('-HS') || code.endsWith('-KCSE') ||
        name.includes('chemistry') || name.includes('physics') || name.includes('biology') ||
        name.includes('history & government') || name.includes('history and government') || (name === 'history' || name.startsWith('history ')) ||
        name.includes('geography') || name.includes('business studies') ||
        name.includes('home science') || name.includes('aviation') || name.includes('woodwork') ||
        name.includes('metalwork') || name.includes('building construction') || name.includes('power mechanics') ||
        name.includes('electricity') || name.includes('drawing & design') || name.includes('drawing and design') ||
        name.includes('general science') ||
        name.includes('paper 1') || name.includes('paper 2') || name.includes('paper 3') ||
        desc.includes('secondary') || desc.includes('kcse') || desc.includes('form 1') || desc.includes('form 2') || desc.includes('form 3') || desc.includes('form 4');

    if ((isPPClass || isLPClass || isUPClass || isJSSClass) && isSecondaryOnlySubject) {
        return false;
    }

    // 2. Pre-Primary Activities (PP1, PP2, Playgroup, Nursery, KG)
    const isPPSubject =
        code.endsWith('-PP') || code.includes('PP') ||
        name.includes('pre-primary') || name.includes('pre primary') ||
        desc.includes('pre-primary') || desc.includes('pre primary') ||
        desc.includes('pp1') || desc.includes('pp2') || desc.includes('playgroup') ||
        name.includes('psychomotor') ||
        (name.includes('language activities') && !name.includes('english language') && !name.includes('kiswahili language')) ||
        (name.includes('mathematical activities') && !name.includes('mathematics activities')) ||
        name.includes('environmental activities');

    if (isPPSubject) {
        return isPPClass;
    }
    if (isPPClass) {
        return !isSecondaryOnlySubject && !code.endsWith('-SEC') && !code.endsWith('-JSS') && !code.endsWith('-UP');
    }

    // 3. Lower Primary Activities (Grade 1 - 3)
    const isLPSubject =
        code.endsWith('-LP') || desc.includes('lower primary') || desc.includes('grade 1-3') || desc.includes('grade 1 - 3') ||
        name.includes('hygiene & nutrition') || name.includes('movement & creative') ||
        name.includes('mathematics activities') || name.includes('english language activities') || name.includes('kiswahili language activities');

    if (isLPSubject) {
        return isLPClass;
    }
    if (isLPClass) {
        if (code.endsWith('-UP') || code.endsWith('-JSS') || code.endsWith('-SEC') || desc.includes('upper primary') || desc.includes('junior secondary') || desc.includes('jss') || desc.includes('secondary')) return false;
        if (isSecondaryOnlySubject) return false;
    }

    // 4. Upper Primary (Grade 4 - 6)
    const isUPSubject = code.endsWith('-UP') || desc.includes('upper primary') || desc.includes('grade 4-6') || desc.includes('grade 4 - 6') || name.includes('science & technology');

    if (isUPSubject) {
        return isUPClass;
    }
    if (isUPClass) {
        if (code.endsWith('-PP') || code.endsWith('-LP') || code.endsWith('-JSS') || desc.includes('pre-primary') || desc.includes('lower primary') || desc.includes('junior secondary') || desc.includes('jss')) return false;
        if (isSecondaryOnlySubject) return false;
    }

    // 5. Junior Secondary / JSS (Grade 7 - 9)
    const isJSSSubject = code.endsWith('-JSS') || code === 'INT-SCI' || code === 'PRE-TECH' || code === 'HEALTH-ED' || code === 'LIFE-SKILLS' || code === 'ARTS-SPORTS' ||
        desc.includes('junior') || desc.includes('jss') || desc.includes('grade 7-9') || desc.includes('grade 7 - 9') ||
        name.includes('integrated science') || name.includes('pre-technical') || name.includes('pre technical') || name.includes('creative arts & sports') || name.includes('creative arts and sports');

    if (isJSSSubject) {
        return isJSSClass;
    }
    if (isJSSClass) {
        if (code.endsWith('-PP') || code.endsWith('-LP') || code.endsWith('-UP') || code.endsWith('-SEC') || code.endsWith('-HS') || code.endsWith('-KCSE') ||
            desc.includes('pre-primary') || desc.includes('lower primary') || desc.includes('upper primary') || desc.includes('secondary') || desc.includes('kcse') ||
            name.includes('science & technology') || name.includes('hygiene & nutrition') || name.includes('movement & creative') || name.includes('activities')) {
            return false;
        }
        if (isSecondaryOnlySubject) return false;
    }

    // 6. Secondary / High School (Form 1 - 4 / Grade 10 - 12)
    if (isSecondaryClass) {
        if (code.endsWith('-PP') || code.endsWith('-LP') || code.endsWith('-UP') || code.endsWith('-JSS') ||
            name.includes('activities') || name.includes('science & technology') || name.includes('integrated science') ||
            name.includes('pre-technical') || name.includes('creative arts & sports') || name.includes('hygiene & nutrition')) {
            return false;
        }
    }

    // If explicit targetClasses was set by user and doesn't contain this class, return false
    if (Array.isArray(targetCls) && targetCls.length > 0) {
        return false;
    }

    // Default: General core subjects (Math, English, Kiswahili, etc.) apply
    return true;
};

/**
 * Checks if a subject is assigned to a class/stream
 */
export const isSubjectAssignedToClassStream = (
    subject: Subject,
    className: string,
    courses: Course[] = []
): boolean => {
    if (!className || !className.trim()) return false;
    const cLower = className.toLowerCase().trim();

    // 1. Explicit targetClasses / assignedClasses array on subject
    const targetCls = (subject as any).targetClasses || (subject as any).assignedClasses || (subject as any).classes;
    if (Array.isArray(targetCls)) {
        if (targetCls.length === 0) return false;
        const hasExplicitMatch = targetCls.some(c => {
            const cleanC = (c || '').toLowerCase().trim();
            return cleanC === cLower ||
                   cLower.startsWith(cleanC) ||
                   cleanC.startsWith(cLower) ||
                   (cleanC.includes('lower primary') && /\b(grade|std|class)\s*[1-3]\b/i.test(className)) ||
                   (cleanC.includes('upper primary') && /\b(grade|std|class)\s*[4-6]\b/i.test(className)) ||
                   (cleanC.includes('junior secondary') && /\b(grade|std|class)\s*[7-9]\b/i.test(className));
        });
        return hasExplicitMatch;
    }

    // 2. Course level assignments (e.g. course levels matching className)
    if (courses && courses.length > 0) {
        for (const c of courses) {
            if (c.levels) {
                for (const l of c.levels) {
                    const levelName = (l.name || c.name || '').toLowerCase().trim();
                    const ids = l.subjectIds || (l as any).subject_ids || [];
                    if (ids.includes(subject.id)) {
                        if (levelName === cLower || cLower.startsWith(levelName) || levelName.startsWith(cLower) ||
                            (levelName.includes('lower primary') && /\b(grade|std|class)\s*[1-3]\b/i.test(className)) ||
                            (levelName.includes('upper primary') && /\b(grade|std|class)\s*[4-6]\b/i.test(className)) ||
                            (levelName.includes('junior secondary') && /\b(grade|std|class)\s*[7-9]\b/i.test(className))) {
                            return true;
                        }
                    }
                }
            }
        }
    }

    // 3. Fallback to standard CBC grade level applicability
    return isSubjectApplicableToClass(subject, className);
};

/**
 * Single Authoritative Subject Resolver per Class / Stream
 * Used synchronously across ClassSubjectAllocationModal, LessonsAllocationManager, ExamUnitsManager, and GradingSystemManager.
 * Guarantees that the exact same subjects and exact same count are resolved everywhere.
 */
export const resolveApplicableSubjectsForClass = (
    className: string,
    subjects: Subject[] = [],
    courses: Course[] = [],
    classAllocationsStore: Record<string, string[]> = {}
): Subject[] => {
    if (!className || !className.trim()) return [];

    const clsClean = className.trim();
    const clsLower = clsClean.toLowerCase();
    const clsNorm = clsLower.replace(/[^a-z0-9]/g, '');
    const parsed = extractClassAndStream(clsClean);
    const baseClass = (parsed.className || clsClean).trim();
    const baseLower = baseClass.toLowerCase();
    const baseNorm = baseLower.replace(/[^a-z0-9]/g, '');

    // Deduplicate the base subject pool strictly by ID and (code + name)
    const deduplicatedPool: Subject[] = [];
    const seenSubjectPool = new Set<string>();
    (subjects || []).forEach(s => {
        if (!s || !s.name) return;
        const sName = (s.name || '').toLowerCase().trim();
        const sCode = (s.code || '').toLowerCase().trim();
        const key = s.id ? `id_${s.id}` : `${sCode}__${sName}`;
        const nameCodeKey = `${sCode}__${sName}`;
        if (!seenSubjectPool.has(key) && !seenSubjectPool.has(nameCodeKey)) {
            seenSubjectPool.add(key);
            if (sName) seenSubjectPool.add(nameCodeKey);
            deduplicatedPool.push(s);
        }
    });

    // Priority 1: Ground Truth Persistent Per-Class / Per-Stream Allocation Store
    // Match exact class name, lower, normalized, or base class name
    const storeKeys = Object.keys(classAllocationsStore || {});
    const matchedKey = storeKeys.find(k => {
        const kClean = (k || '').trim();
        const kLower = kClean.toLowerCase();
        const kNorm = kLower.replace(/[^a-z0-9]/g, '');
        return kClean === clsClean || kLower === clsLower || (clsNorm && kNorm === clsNorm);
    }) || (baseClass && baseLower !== clsLower ? storeKeys.find(k => {
        const kClean = (k || '').trim();
        const kLower = kClean.toLowerCase();
        const kNorm = kLower.replace(/[^a-z0-9]/g, '');
        return kClean === baseClass || kLower === baseLower || (baseNorm && kNorm === baseNorm);
    }) : undefined);

    const storedAssignedIds = matchedKey ? classAllocationsStore[matchedKey] : undefined;

    if (Array.isArray(storedAssignedIds)) {
        const storedSet = new Set(storedAssignedIds.map(id => String(id).toLowerCase().trim()));
        const matched: Subject[] = [];
        const seenNames = new Set<string>();

        // Match from deduplicated pool by ID, normalized name, or code
        deduplicatedPool.forEach(s => {
            const sId = (s.id || '').toLowerCase().trim();
            const sName = (s.name || '').toLowerCase().trim();
            const sCode = (s.code || '').toLowerCase().trim();
            if (storedSet.has(sId) || storedSet.has(sName) || (sCode && storedSet.has(sCode))) {
                if (!seenNames.has(sName)) {
                    seenNames.add(sName);
                    matched.push(s);
                }
            }
        });

        // Ensure custom subjects configured in storedAssignedIds are preserved
        storedAssignedIds.forEach(idOrName => {
            const clean = String(idOrName).trim();
            const cleanLow = clean.toLowerCase();
            if (!seenNames.has(cleanLow)) {
                const found = deduplicatedPool.find(s =>
                    (s.id || '').toLowerCase().trim() === cleanLow ||
                    (s.name || '').toLowerCase().trim() === cleanLow ||
                    (s.code && (s.code || '').toLowerCase().trim() === cleanLow)
                );
                if (found) {
                    const fName = (found.name || '').toLowerCase().trim();
                    if (!seenNames.has(fName)) {
                        seenNames.add(fName);
                        matched.push(found);
                    }
                } else if (clean && !clean.startsWith('sub_') && clean.length > 1) {
                    seenNames.add(cleanLow);
                    matched.push({
                        id: `sub_${clean.replace(/\s+/g, '_')}`,
                        name: clean,
                        code: `${clean.substring(0, 4).toUpperCase()} 101`,
                        periodsPerWeek: 5
                    } as unknown as Subject);
                }
            }
        });

        return matched;
    }

    // Priority 2: Fallback if not explicitly configured in classAllocationsStore
    // Evaluate EVERY subject independently matching ClassSubjectAllocationModal logic
    const matched: Subject[] = [];
    const seenNames = new Set<string>();

    deduplicatedPool.forEach(s => {
        const sNameLower = (s.name || '').toLowerCase().trim();
        const targetCls = (s as any).targetClasses || (s as any).assignedClasses || (s as any).classes;

        let isAssigned = false;

        // Case A: Explicit targetClasses defined on subject
        if (Array.isArray(targetCls) && targetCls.length > 0) {
            isAssigned = targetCls.some(tc => {
                const cleanTC = (tc || '').toLowerCase().trim();
                const parsedTC = extractClassAndStream(cleanTC).className.toLowerCase().trim();
                return cleanTC === clsLower || clsLower.startsWith(cleanTC) || cleanTC.startsWith(clsLower) ||
                       (parsedTC && (parsedTC === clsLower || parsedTC === baseLower));
            });
        } else {
            // Case B: Fallback to standard curriculum & course level applicability
            isAssigned = isSubjectAssignedToClassStream(s, clsClean, courses);
        }

        if (isAssigned && !seenNames.has(sNameLower)) {
            seenNames.add(sNameLower);
            matched.push(s);
        }
    });

    return matched;
};

