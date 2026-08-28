import { Book } from '../types';

export const normAcc = (val?: string | null): string => {
    return String(val || '').trim().toUpperCase();
};

/**
 * Checks if an accession number is unique among books, ignoring the specified currentBookId (if editing).
 */
export const isAccessionNumberUnique = (
    accessionNumber: string,
    currentBookId: string | null,
    books: Book[]
): boolean => {
    const target = normAcc(accessionNumber);
    if (!target) return false;
    return !books.some(b => b.id !== currentBookId && normAcc(b.accessionNumber) === target);
};

/**
 * Finds all groups of duplicate accession numbers in the library.
 * Returns a Map of normalized accession number -> Array of Books.
 */
export const getDuplicateAccessionGroups = (books: Book[]): Map<string, Book[]> => {
    const accMap = new Map<string, Book[]>();

    books.forEach(book => {
        const acc = normAcc(book.accessionNumber);
        if (!acc) return;
        const list = accMap.get(acc) || [];
        list.push(book);
        accMap.set(acc, list);
    });

    // Filter to only those with duplicates (more than 1 book)
    const duplicates = new Map<string, Book[]>();
    accMap.forEach((bookList, acc) => {
        if (bookList.length > 1) {
            duplicates.set(acc, bookList);
        }
    });

    return duplicates;
};

/**
 * Intelligently generates the next available unique accession number
 * based on existing accession number patterns in the library.
 */
export const getNextAccessionNumber = (books: Book[], baseSeed?: string): string => {
    const usedAccs = new Set<string>();
    books.forEach(b => {
        const acc = normAcc(b.accessionNumber);
        if (acc) usedAccs.add(acc);
    });

    // Check if a baseSeed was provided (e.g. from a duplicate "04428")
    if (baseSeed) {
        const trimmedSeed = baseSeed.trim().toUpperCase();
        // Check if seed has a trailing number: e.g. "04428" or "LIB-001"
        const numMatch = trimmedSeed.match(/^(.*?)(\d+)$/);
        if (numMatch) {
            const prefix = numMatch[1];
            const numStr = numMatch[2];
            const padLen = numStr.length;
            let currentNum = parseInt(numStr, 10);

            for (let i = 1; i <= 99999; i++) {
                currentNum++;
                const candidate = `${prefix}${String(currentNum).padStart(padLen, '0')}`;
                if (!usedAccs.has(candidate)) {
                    return candidate;
                }
            }
        }

        // Try suffix pattern like "-1", "-2"
        for (let i = 1; i <= 9999; i++) {
            const candidate = `${trimmedSeed}-${i}`;
            if (!usedAccs.has(candidate)) {
                return candidate;
            }
        }
    }

    // Heuristic scan across all existing books for the highest pure numeric or prefixed numeric value
    let maxPureNum = 0;
    let maxPurePadLen = 5;

    let maxPrefixedNum = 0;
    let mostCommonPrefix = 'ACC-';
    let maxPrefixedPadLen = 5;

    const prefixCounts = new Map<string, number>();

    books.forEach(b => {
        const acc = normAcc(b.accessionNumber);
        if (!acc) return;

        // Pure numeric: e.g. "04428", "00123", "4500"
        if (/^\d+$/.test(acc)) {
            const val = parseInt(acc, 10);
            if (!isNaN(val) && val > maxPureNum) {
                maxPureNum = val;
                maxPurePadLen = Math.max(maxPurePadLen, acc.length);
            }
            return;
        }

        // Prefixed numeric: e.g. "ACC-00428", "LIB-0123"
        const match = acc.match(/^([A-Z0-9_\-]+[_\-\/\s])(\d+)$/);
        if (match) {
            const pref = match[1];
            const numPart = match[2];
            const val = parseInt(numPart, 10);
            prefixCounts.set(pref, (prefixCounts.get(pref) || 0) + 1);

            if (!isNaN(val) && val > maxPrefixedNum) {
                maxPrefixedNum = val;
                maxPrefixedPadLen = Math.max(maxPrefixedPadLen, numPart.length);
            }
        }
    });

    // Find the most popular prefix if any
    let bestPrefixCount = 0;
    prefixCounts.forEach((count, pref) => {
        if (count > bestPrefixCount) {
            bestPrefixCount = count;
            mostCommonPrefix = pref;
        }
    });

    // If pure numeric numbers predominate or maxPureNum is substantial
    if (maxPureNum > 0 && maxPureNum >= maxPrefixedNum) {
        let candidateNum = maxPureNum + 1;
        while (candidateNum < maxPureNum + 100000) {
            const candidate = String(candidateNum).padStart(maxPurePadLen, '0');
            if (!usedAccs.has(candidate)) {
                return candidate;
            }
            candidateNum++;
        }
    }

    if (maxPrefixedNum > 0) {
        let candidateNum = maxPrefixedNum + 1;
        while (candidateNum < maxPrefixedNum + 100000) {
            const candidate = `${mostCommonPrefix}${String(candidateNum).padStart(maxPrefixedPadLen, '0')}`;
            if (!usedAccs.has(candidate)) {
                return candidate;
            }
            candidateNum++;
        }
    }

    // Default fallback: ACC-00001 or timestamp-based fallback
    let candidateSeq = books.length + 1;
    while (candidateSeq < books.length + 100000) {
        const candidate = `ACC-${String(candidateSeq).padStart(5, '0')}`;
        if (!usedAccs.has(candidate)) {
            return candidate;
        }
        candidateSeq++;
    }

    return `ACC-${Date.now().toString().slice(-6)}`;
};
