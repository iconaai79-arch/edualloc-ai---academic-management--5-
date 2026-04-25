
/**
 * Utility to handle Google Drive image URLs and convert them to direct display links.
 */
export const getGoogleDriveDirectUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    
    // If it's already a direct link, return it
    if (url.includes('lh3.googleusercontent.com/d/')) return url;
    
    // Extract ID from various patterns
    let id = '';
    
    if (url.includes('drive.google.com')) {
        // Extract ID from various URL patterns:
        // 1. https://drive.google.com/file/d/ID/view
        // 2. https://drive.google.com/open?id=ID
        // 3. https://drive.google.com/uc?id=ID
        // 4. https://drive.google.com/file/d/ID
        // 5. https://drive.google.com/thumbnail?id=ID
        const idMatch = 
            url.match(/\/d\/([^\/\?#]+)/) || 
            url.match(/[?&]id=([^\/&?#]+)/) || 
            url.match(/file\/d\/([^\/&?#]+)/);
            
        if (idMatch && idMatch[1]) {
            id = idMatch[1];
        }
    } else if (url.includes('lh3.googleusercontent.com')) {
        // Handle cases where we have a different googleusercontent format
        // e.g., https://lh3.googleusercontent.com/u/0/d/ID
        const idMatch = url.match(/\/d\/([^\/\?#]+)/);
        if (idMatch && idMatch[1]) {
            id = idMatch[1];
        }
    } else if (url.length > 20 && !url.includes('/') && !url.includes('.') && !url.includes(':')) {
        // Likely a raw Google Drive ID (usually ~33 chars, alphanumeric)
        id = url;
    }
    
    if (id) {
        // Use the /d/ format which is more reliable for public embedding
        return `https://lh3.googleusercontent.com/d/${id}`;
    }
    
    // Return original if no pattern matched
    return url;
};

/**
 * Validates if a URL is a Google Drive link.
 */
export const isGoogleDriveUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('googleusercontent.com');
};
/**
 * Safely extracts the first image URL from a collection.
 * Handles:
 * - Arrays of strings: ["url1", "url2"]
 * - JSON stringified arrays: '["url1", "url2"]'
 * - Single strings: "url1"
 * - Objects with image properties (recursive)
 */
export const getFirstImage = (images: any): string => {
    if (!images) return '';
    try {
        // 1. Handle JSON stringified arrays
        let parsed = images;
        if (typeof images === 'string' && (images.startsWith('[') || images.startsWith('{'))) {
            try {
                parsed = JSON.parse(images);
            } catch (e) {
                // If parsing fails, treat as a plain string
                return images;
            }
        }

        // 2. Handle Arrays
        if (Array.isArray(parsed) && parsed.length > 0) {
            return getFirstImage(parsed[0]); // Recursive to handle nested arrays/objects
        }

        // 3. Handle Objects (common in some API responses)
        if (typeof parsed === 'object' && parsed !== null) {
            const url = parsed.url || parsed.imageUrl || parsed.src || parsed.link;
            if (url) return url;
            
            // Fallback: search for any string that looks like a URL in the object values
            const values = Object.values(parsed);
            const firstUrl = values.find(v => typeof v === 'string' && (v.startsWith('http') || v.includes('google')));
            if (firstUrl) return firstUrl as string;
        }

        // 4. Handle plain strings
        if (typeof parsed === 'string') return parsed;

    } catch (e) {
        console.warn("[getFirstImage] Resolution failure:", e);
    }
    return typeof images === 'string' ? images : '';
};
