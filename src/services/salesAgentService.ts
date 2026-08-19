import { apiService } from './apiService';
import type { Institution } from '../types';

export interface SalesAgentContext {
    institution: Institution;
    catalogItems?: Array<{
        id: string;
        name: string;
        price: number;
        category?: string;
        inStock?: boolean | number;
        description?: string;
    }>;
    services?: Array<{
        id: string;
        name: string;
        price: number;
        duration?: string;
        description?: string;
    }>;
    operatingHours?: string;
    contactPhone?: string;
    contactEmail?: string;
    whatsappNumber?: string;
}

export interface AgentMessage {
    role: 'user' | 'model';
    text: string;
    actionType?: 'show_products' | 'book_service' | 'create_lead' | 'contact_rep';
    actionData?: any;
}

/**
 * Builds dynamic system prompt giving the AI agent comprehensive domain knowledge
 * about the current institution, its products, prices, and capabilities.
 */
function buildSystemPrompt(ctx: SalesAgentContext): string {
    const inst = ctx.institution;
    const instType = inst.institutionType || 'Business';
    const currency = inst.currency || 'KES';
    const businessName = inst.name || 'our company';

    let catalogText = '';
    if (ctx.catalogItems && ctx.catalogItems.length > 0) {
        catalogText = `\nAVAILABLE PRODUCTS / ITEMS IN CATALOG:\n` +
            ctx.catalogItems.map(item => {
                const stockStatus = typeof item.inStock === 'number' 
                    ? `${item.inStock} units in stock` 
                    : (item.inStock !== false ? 'In stock' : 'Out of stock');
                return `- ${item.name} | Category: ${item.category || 'General'} | Price: ${currency} ${item.price.toLocaleString()} | Status: ${stockStatus}${item.description ? ` | ${item.description}` : ''}`;
            }).join('\n');
    }

    let servicesText = '';
    if (ctx.services && ctx.services.length > 0) {
        servicesText = `\nAVAILABLE SERVICES / PACKAGES:\n` +
            ctx.services.map(s => {
                return `- ${s.name} | Price: ${currency} ${s.price.toLocaleString()}${s.duration ? ` | Duration: ${s.duration}` : ''}${s.description ? ` | ${s.description}` : ''}`;
            }).join('\n');
    }

    return `You are "${inst.name} Sales & Customer Support AI Assistant", a friendly, professional, and knowledgeable sales representative and customer support agent.

BUSINESS PROFILE:
- Business Name: ${businessName}
- Industry / Type: ${instType} ${inst.businessSubType ? `(${inst.businessSubType})` : ''}
- Location / Address: ${inst.address || inst.countyId || 'Kenya'}
- Contact Phone: ${ctx.contactPhone || inst.phone || 'Available on request'}
- Contact Email: ${ctx.contactEmail || inst.email || 'Available on request'}
- WhatsApp / Hotline: ${ctx.whatsappNumber || inst.phone || ''}
- Operating Hours: ${ctx.operatingHours || 'Monday - Saturday: 8:00 AM - 6:00 PM'}
- Currency: ${currency}
${catalogText}
${servicesText}

YOUR OBJECTIVES & BEHAVIOR:
1. Greet customers warmly and answer any questions about products, services, pricing, availability, and policies.
2. Recommend relevant products or services based on the customer's needs. Quote exact prices in ${currency}.
3. Guide customers through placing orders, booking services, or registering for courses/programs.
4. If a customer is ready to buy or wants to be contacted, politely ask for their Name and Phone Number / WhatsApp number so our team can finalize their order.
5. Keep your answers concise, clear, and structured with bullet points where appropriate.
6. Always maintain a welcoming, helpful, and courteous tone.`;
}

/**
 * Sends conversation history and current user message to /api/ai
 */
export async function querySalesAgent(
    history: AgentMessage[],
    userMessage: string,
    context: SalesAgentContext
): Promise<AgentMessage> {
    try {
        const systemPrompt = buildSystemPrompt(context);
        const token = await apiService.getAuthToken();
        const customGeminiKey = localStorage.getItem('eduai_gemini_key') || localStorage.getItem('custom_gemini_api_key') || '';
        const customOpenAiKey = localStorage.getItem('eduai_openai_key') || localStorage.getItem('custom_openai_api_key') || '';

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
        if (customGeminiKey) headers['x-gemini-api-key'] = customGeminiKey;
        if (customOpenAiKey) headers['x-openai-api-key'] = customOpenAiKey;

        // Build history formatted for Gemini
        const formattedHistory = [
            { role: 'user', parts: [{ text: `SYSTEM CONTEXT:\n${systemPrompt}` }] },
            { role: 'model', parts: [{ text: `Understood! I am ready to assist customers of ${context.institution.name}.` }] },
            ...history.map(msg => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }))
        ];

        const response = await fetch('/api/ai', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                prompt: userMessage,
                history: formattedHistory,
                model: 'gemini-1.5-flash',
                temperature: 0.7,
                maxOutputTokens: 1024
            })
        });

        if (!response.ok) {
            throw new Error(`AI Gateway responded with status: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.text || data.response || "Thank you for reaching out! How else can I assist you with our products or services today?";

        // Detect if any products or action matches
        let actionType: AgentMessage['actionType'] = undefined;
        let actionData: any = undefined;

        const lowerUser = userMessage.toLowerCase();
        const lowerRes = responseText.toLowerCase();

        if (lowerUser.includes('contact') || lowerUser.includes('call me') || lowerUser.includes('agent') || lowerUser.includes('human') || lowerRes.includes('phone number') || lowerRes.includes('contact details')) {
            actionType = 'create_lead';
        } else if (lowerUser.includes('book') || lowerUser.includes('appointment') || lowerUser.includes('schedule') || lowerUser.includes('reserve')) {
            actionType = 'book_service';
        } else if (lowerUser.includes('product') || lowerUser.includes('item') || lowerUser.includes('buy') || lowerUser.includes('price') || lowerUser.includes('stock')) {
            // Find relevant catalog items
            if (context.catalogItems && context.catalogItems.length > 0) {
                const matched = context.catalogItems.filter(item => 
                    lowerRes.includes(item.name.toLowerCase()) || lowerUser.includes(item.name.toLowerCase())
                ).slice(0, 3);
                if (matched.length > 0) {
                    actionType = 'show_products';
                    actionData = matched;
                }
            }
        }

        return {
            role: 'model',
            text: responseText,
            actionType,
            actionData
        };
    } catch (err: any) {
        console.error("Sales Agent Query Error:", err);
        return {
            role: 'model',
            text: `Hello! We are delighted to assist you at ${context.institution.name}. For immediate assistance, feel free to reach our sales team directly at ${context.contactPhone || context.institution.phone || 'our support line'}. How can we assist you with our products and services today?`
        };
    }
}
