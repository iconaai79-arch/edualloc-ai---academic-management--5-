
/**
 * Utility to handle Google Drive image URLs and convert them to direct display links.
 */
export const getGoogleDriveDirectUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    
    // If it's already a direct link, return it
    if (url.includes('lh3.googleusercontent.com/d/')) return url;
    
    if (url.includes('drive.google.com')) {
        // Extract ID from various URL patterns:
        // 1. https://drive.google.com/file/d/ID/view
        // 2. https://drive.google.com/open?id=ID
        // 3. https://drive.google.com/uc?id=ID
        // 4. https://drive.google.com/file/d/ID
        const idMatch = 
            url.match(/\/d\/([^\/\?#]+)/) || 
            url.match(/id=([^\/&?#]+)/) || 
            url.match(/file\/d\/([^\/&?#]+)/);
            
        if (idMatch && idMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
        }
    }
    
    // Return original if no pattern matched
    return url;
};

/**
 * Validates if a URL is a Google Drive link.
 */
export const isGoogleDriveUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    return url.includes('drive.google.com');
};
