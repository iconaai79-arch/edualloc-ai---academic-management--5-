import { apiService } from './apiService';
import type { Institution } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const businessName = inst.name || 'our institution';

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
        servicesText = `\nAVAILABLE COURSES / PACKAGES / SERVICES:\n` +
            ctx.services.map(s => {
                return `- ${s.name} | Price/Fee: ${currency} ${s.price.toLocaleString()}${s.duration ? ` | Duration: ${s.duration}` : ''}${s.description ? ` | ${s.description}` : ''}`;
            }).join('\n');
    }

    const isSchool = instType === 'Education' || instType === 'Primary' || instType === 'Secondary' || instType === 'Tertiary' || instType === 'Higher Education' || instType === 'TVET' || instType === 'College' || instType === 'University';

    if (isSchool) {
        return `You are "${inst.name} Admissions, Academic & Campus Support AI Assistant", a friendly, highly intelligent, and courteous digital campus representative.

CAMPUS PROFILE:
- School / Institution: ${businessName}
- Type: ${instType}
- Location: ${inst.address || inst.subCounty || inst.countyId || 'Kenya'}
- Contact Phone: ${ctx.contactPhone || inst.phoneNumber || inst.phone || 'Available on request'}
- Contact Email: ${ctx.contactEmail || inst.email || 'Available on request'}
- WhatsApp: ${ctx.whatsappNumber || inst.phoneNumber || inst.phone || ''}
- Operating / Office Hours: ${ctx.operatingHours || 'Monday - Friday: 7:30 AM - 5:00 PM'}
- Currency: ${currency}
${servicesText}

IMPORTANT CAMPUS STORE & INVENTORY POLICY:
- The school store is an internal supply and issuance facility. The school DOES NOT sell items commercially to the general public.
- Textbooks, classroom learning materials, uniform sets, laboratory supplies, and athletic equipment are allocated and ISSUED directly to enrolled students, teachers, and staff upon registration and term reporting.
- If visitors ask to purchase school materials, explain that items are officially allocated to registered learners as part of academic onboarding and curriculum requirements.

YOUR OBJECTIVES & BEHAVIOR:
1. Greet visitors, prospective parents, and students warmly with institutional pride.
2. Answer questions thoroughly regarding course curricula, grade placement, admissions, fee structures, term calendars, and institutional procedures.
3. Guide prospective learners or parents to start admission applications or book a campus tour.
4. Keep answers clear, structured with bullet points, courteous, and directly relevant to the user's inquiry.`;
    }

    return `You are "${inst.name} Sales & Customer Support AI Assistant", a friendly, professional, and knowledgeable digital sales representative and customer support specialist.

BUSINESS PROFILE:
- Business Name: ${businessName}
- Industry / Type: ${instType} ${inst.businessSubType ? `(${inst.businessSubType})` : ''}
- Location / Address: ${inst.address || inst.countyId || 'Kenya'}
- Contact Phone: ${ctx.contactPhone || inst.phoneNumber || inst.phone || 'Available on request'}
- Contact Email: ${ctx.contactEmail || inst.email || 'Available on request'}
- WhatsApp / Hotline: ${ctx.whatsappNumber || inst.phoneNumber || inst.phone || ''}
- Operating Hours: ${ctx.operatingHours || 'Monday - Saturday: 8:00 AM - 6:00 PM'}
- Currency: ${currency}
${catalogText}
${servicesText}

YOUR OBJECTIVES & BEHAVIOR:
1. Greet customers warmly and provide clear, structured answers regarding products, services, pricing, availability, and ordering policies.
2. Recommend relevant products or services based on customer requirements. Quote exact prices in ${currency}.
3. Guide customers through placing orders, booking appointments, or registering for offerings.
4. If a customer is ready to buy or requests a callback, ask for their Name and Phone Number / WhatsApp number so the team can finalize their order.
5. Always maintain a welcoming, helpful, and courteous tone.`;
}

/**
 * Intelligent Local Knowledge-Base Fallback Engine:
 * Formulates detailed, rich, multi-turn conversational responses when external AI gateways are unavailable.
 */
function generateLocalAgentResponse(
    userMessage: string,
    history: AgentMessage[],
    ctx: SalesAgentContext
): AgentMessage {
    const inst = ctx.institution;
    const lower = userMessage.toLowerCase().trim();
    const currency = inst.currency || 'KES';
    const instName = inst.name || 'our institution';
    const phone = ctx.contactPhone || inst.phoneNumber || inst.phone || '';
    const email = ctx.contactEmail || inst.email || '';
    const address = inst.address || inst.subCounty || inst.countyId || 'our main campus';
    const isSchool = !inst.institutionType || ['Education', 'Primary', 'Secondary', 'Tertiary', 'Higher Education', 'TVET', 'College', 'University'].includes(inst.institutionType);

    let actionType: AgentMessage['actionType'] = undefined;
    let actionData: any = undefined;

    // 1. Human Agent / Callback Handover
    if (lower.includes('speak to human') || lower.includes('real person') || lower.includes('sales team') || lower.includes('human agent') || lower.includes('call me') || lower.includes('representative') || lower.includes('contact me') || lower.includes('phone number')) {
        actionType = 'create_lead';
        return {
            role: 'model',
            text: `I'd be glad to connect you directly with our team! 📞\n\n• **Direct Phone:** ${phone || 'Available via our helpdesk'}\n• **Email:** ${email || 'Available upon request'}\n• **Campus / Office:** ${address}\n\nPlease enter your **Name** and **Phone Number** below, and our team will get in touch with you shortly!`,
            actionType
        };
    }

    // 2. Admissions, Application & Registration
    if (lower.includes('admission') || lower.includes('apply') || lower.includes('enroll') || lower.includes('join') || lower.includes('registration') || lower.includes('requirement') || lower.includes('intake') || lower.includes('entry')) {
        actionType = 'book_service';
        if (isSchool) {
            const courseList = (ctx.services || []).slice(0, 5).map(c => `• **${c.name}** (${c.duration || 'Full Academic Year'})`).join('\n');
            return {
                role: 'model',
                text: `🎓 **Admissions & Enrollment at ${instName}**\n\nWe welcome prospective learners and parents for ongoing and upcoming intakes!\n\n**Admission Process:**\n1. Complete the online admission inquiry or application.\n2. Submit academic transcripts / assessment records and birth certificate.\n3. Schedule a campus visit / interview with our admissions team.\n\n${courseList ? `**Available Programs & Levels:**\n${courseList}\n\n` : ''}Would you like to initiate an application or schedule a campus visit today? Click **Book / Apply** below to begin!`,
                actionType
            };
        } else {
            return {
                role: 'model',
                text: `📋 **Registration & Onboarding at ${instName}**\n\nGetting started with our programs and services is simple!\n\n• You can register online or visit our office at ${address}.\n• For personalized registration support, reach us directly at **${phone || 'our support line'}**.\n\nWould you like to book an appointment or consult with our representative now?`,
                actionType
            };
        }
    }

    // 3. Fees, Tuition & Pricing
    if (lower.includes('fee') || lower.includes('tuition') || lower.includes('cost') || lower.includes('price') || lower.includes('how much') || lower.includes('payment') || lower.includes('pricing')) {
        if (ctx.services && ctx.services.length > 0) {
            const feeItems = ctx.services.slice(0, 6).map(s => `• **${s.name}**: ${currency} ${s.price.toLocaleString()} (${s.duration || 'Termly'})`).join('\n');
            return {
                role: 'model',
                text: `💰 **Fee Structure & Program Pricing for ${instName}**\n\nHere are our standard program offerings and tuition rates:\n\n${feeItems}\n\n*Note: Flexible payment plans and institutional bank/M-PESA channels are available upon admission.* For a detailed official fee breakdown, feel free to reach our accounts desk at **${phone || email || 'our office'}**.`,
                actionType: 'book_service'
            };
        } else {
            return {
                role: 'model',
                text: `💰 **Pricing & Fee Inquiries at ${instName}**\n\nOur fee schedule is competitive, transparent, and structured according to grade level and academic requirements.\n\nFor a complete fee breakdown and payment schedules, please contact our accounts and admissions desk at **${phone || 'our helpline'}** or via email at **${email || 'our official desk'}**.`,
                actionType: 'create_lead'
            };
        }
    }

    // 4. Courses, Academics, Subjects & Curriculum
    if (lower.includes('course') || lower.includes('curriculum') || lower.includes('subject') || lower.includes('grade') || lower.includes('level') || lower.includes('class') || lower.includes('program') || lower.includes('academic') || lower.includes('cbc')) {
        if (ctx.services && ctx.services.length > 0) {
            const courseList = ctx.services.map(s => `• **${s.name}** ${s.description ? `— ${s.description}` : ''} (${currency} ${s.price.toLocaleString()})`).join('\n');
            return {
                role: 'model',
                text: `📚 **Academic Programs & Curriculum at ${instName}**\n\nWe offer a comprehensive, learner-centered curriculum designed to foster academic excellence, character development, and future-ready skills:\n\n${courseList}\n\nWould you like more details on admission requirements for any of these levels?`,
                actionType: 'book_service'
            };
        } else {
            return {
                role: 'model',
                text: `📚 **Academics & Curricula at ${instName}**\n\nWe deliver high-standard CBC and foundational academic programs equipped with modern learning facilities, computer labs, science practicals, and co-curricular activities.\n\nWould you like to schedule a campus tour or speak with our academic director? Reach us at **${phone}**.`,
                actionType: 'book_service'
            };
        }
    }

    // 5. School Uniforms, Textbooks & Store Supplies
    if (lower.includes('uniform') || lower.includes('book') || lower.includes('textbook') || lower.includes('stationery') || lower.includes('supply') || lower.includes('store') || lower.includes('buy book') || lower.includes('material')) {
        if (isSchool) {
            return {
                role: 'model',
                text: `👕 **Institutional Resource & Uniform Policy**\n\n• **Textbooks & Learning Kits:** At ${instName}, essential textbooks, curriculum course books, and lab supplies are institutional resources allocated and **issued directly to enrolled learners** upon term reporting.\n• **Uniform Sets:** School uniform sets, sports kits, and identity badges are provided as part of the student onboarding package upon admission.\n• **School Store:** Our store serves as an internal issuance facility for students and staff. Commercial retail sales to external parties are not conducted.\n\nIf you need assistance with learner material allocations, please contact the administration desk at **${phone || 'our campus'}**.`,
                actionType: 'create_lead'
            };
        }
    }

    // 6. Products / Catalog for Non-Schools
    if (ctx.catalogItems && ctx.catalogItems.length > 0 && (lower.includes('product') || lower.includes('item') || lower.includes('catalog') || lower.includes('stock') || lower.includes('buy') || lower.includes('order'))) {
        const topProducts = ctx.catalogItems.slice(0, 4);
        const productList = topProducts.map(p => `• **${p.name}** — ${currency} ${p.price.toLocaleString()} (${p.inStock !== false ? 'In stock' : 'Out of stock'})`).join('\n');
        actionType = 'show_products';
        actionData = topProducts;
        return {
            role: 'model',
            text: `🛍️ **Available Catalog at ${instName}**\n\nHere are some of our popular items:\n\n${productList}\n\nClick on any product below to order or view details!`,
            actionType,
            actionData
        };
    }

    // 7. Location, Campus Tours & Visiting Hours
    if (lower.includes('location') || lower.includes('where') || lower.includes('address') || lower.includes('direction') || lower.includes('map') || lower.includes('visit') || lower.includes('tour') || lower.includes('hours') || lower.includes('time') || lower.includes('open')) {
        actionType = 'book_service';
        return {
            role: 'model',
            text: `📍 **Campus Location & Visiting Hours — ${instName}**\n\n• **Physical Location:** ${address}\n• **Office & Helpdesk Hours:** ${ctx.operatingHours || 'Monday to Friday, 7:30 AM – 5:00 PM'}\n• **Telephone:** ${phone || 'Available on request'}\n• **Email:** ${email || 'Available on request'}\n\nWe warmly welcome parents and visitors for campus tours! Would you like to schedule a visit? Click below to book an appointment.`,
            actionType
        };
    }

    // 8. Greetings & General Inquiries
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('good morning') || lower.includes('good afternoon') || lower.includes('good evening') || lower === 'start' || lower === 'help') {
        const greetingOptions = isSchool 
            ? `Hello and welcome to **${instName}**! 👋 I am your dedicated digital campus assistant.\n\nI can assist you with:\n• 🎓 **Admissions & Enrollment** (Intake dates, entry requirements)\n• 📚 **Academic Programs** (Curriculum, grades, subjects)\n• 💰 **Tuition & Fee Schedules**\n• 👕 **Textbook & Uniform Issuance Policies**\n• 📍 **Campus Location & Tour Scheduling**\n\nHow can I help you today?`
            : `Hello and welcome to **${instName}**! 👋 I am your AI Sales & Support Representative.\n\nI can help you with:\n• 🛍️ **Products & Pricing Catalog**\n• 💼 **Services & Packages**\n• 📅 **Booking Appointments**\n• 📞 **Connecting with our Team**\n\nWhat would you like to explore today?`;

        return {
            role: 'model',
            text: greetingOptions
        };
    }

    // 9. Polite Fallback / General Continuity
    return {
        role: 'model',
        text: `Thank you for your message! At **${instName}**, we are committed to providing you with prompt and comprehensive assistance.\n\n• For immediate help regarding **Admissions, Courses, Fees, or Campus Tours**, simply ask me or select an option below.\n• You can also contact our administration directly at **${phone || 'our official phone number'}** or email **${email || 'our helpdesk'}**.\n\nWhat specific information can I find for you right now?`
    };
}

/**
 * Sends conversation history and current user message to /api/ai with multi-layer resilience
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
            { role: 'user', parts: [{ text: `SYSTEM CONTEXT & INSTRUCTIONS:\n${systemPrompt}` }] },
            { role: 'model', parts: [{ text: `Understood! I am the official AI representative for ${context.institution.name}. I will provide comprehensive, accurate, and polite assistance.` }] },
            ...history.slice(-10).map(msg => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }))
        ];

        // 1. Attempt API Gateway
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: userMessage,
                prompt: userMessage,
                history: formattedHistory,
                model: 'gemini-2.0-flash',
                temperature: 0.7,
                maxOutputTokens: 1024
            })
        });

        if (response.ok) {
            const data = await response.json();
            const responseText = data.text || data.response;

            if (responseText && responseText.trim().length > 0) {
                // Detect action triggers
                let actionType: AgentMessage['actionType'] = undefined;
                let actionData: any = undefined;

                const lowerUser = userMessage.toLowerCase();
                const lowerRes = responseText.toLowerCase();

                if (lowerUser.includes('contact') || lowerUser.includes('call me') || lowerUser.includes('agent') || lowerUser.includes('human') || lowerRes.includes('phone number') || lowerRes.includes('contact details')) {
                    actionType = 'create_lead';
                } else if (lowerUser.includes('book') || lowerUser.includes('appointment') || lowerUser.includes('schedule') || lowerUser.includes('reserve') || lowerUser.includes('apply') || lowerUser.includes('admission')) {
                    actionType = 'book_service';
                } else if (lowerUser.includes('product') || lowerUser.includes('item') || lowerUser.includes('buy') || lowerUser.includes('price') || lowerUser.includes('stock')) {
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
            }
        }

        // 2. Direct client-side Gemini fallback if key is available in browser / env
        const envGeminiKey = customGeminiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
        if (envGeminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(envGeminiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const chat = model.startChat({
                    history: formattedHistory
                });
                const result = await chat.sendMessage(userMessage);
                const geminiText = (await result.response).text();
                if (geminiText && geminiText.trim().length > 0) {
                    return {
                        role: 'model',
                        text: geminiText
                    };
                }
            } catch (clientGeminiErr) {
                console.warn("[SalesAgent] Client Gemini fallback warning:", clientGeminiErr);
            }
        }

        // 3. Intelligent Local Knowledge-Base Response (High reliability fallback)
        return generateLocalAgentResponse(userMessage, history, context);

    } catch (err: any) {
        console.warn("Sales Agent fallback to local conversational engine:", err?.message || err);
        return generateLocalAgentResponse(userMessage, history, context);
    }
}
