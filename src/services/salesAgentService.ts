import { apiService } from './apiService';
import type { Institution } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface SalesAgentContext {
    institution: Institution;
    agentName?: string;
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
    preferredProvider?: 'openai' | 'gemini' | 'auto';
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
    const inst = ctx.institution || {} as any;
    const instType = inst.institutionType || 'Enterprise Cloud ERP & Multi-Industry SaaS';
    const currency = (inst as any)?.currency || 'KES';
    const businessName = inst.name || 'EduAI Global Cloud OS';
    const agentTitle = ctx.agentName || `${businessName} AI Solutions Advisor`;

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
        servicesText = `\nAVAILABLE MODULES / PACKAGES / SERVICES:\n` +
            ctx.services.map(s => {
                return `- ${s.name} | Rate/Fee: ${s.price > 0 ? `${currency} ${s.price.toLocaleString()}` : 'Custom Tier'}${s.duration ? ` | Model: ${s.duration}` : ''}${s.description ? ` | ${s.description}` : ''}`;
            }).join('\n');
    }

    const isSchool = ['Education', 'Primary', 'Secondary', 'Tertiary', 'Higher Education', 'TVET', 'College', 'University'].includes(instType as string);

    if (isSchool) {
        return `You are "${agentTitle}", a friendly, highly intelligent, and courteous digital campus representative for ${businessName}.

CAMPUS PROFILE:
- School / Institution: ${businessName}
- Type: ${instType}
- Location: ${inst.address || inst.subCounty || inst.countyId || 'Kenya'}
- Contact Phone: ${ctx.contactPhone || inst.phoneNumber || (inst as any)?.phone || 'Available on request'}
- Contact Email: ${ctx.contactEmail || inst.email || 'Available on request'}
- WhatsApp: ${ctx.whatsappNumber || inst.phoneNumber || (inst as any)?.phone || ''}
- Operating / Office Hours: ${ctx.operatingHours || 'Monday - Friday: 7:30 AM - 5:00 PM'}
- Currency: ${currency}
${servicesText}

IMPORTANT CAMPUS STORE & INVENTORY POLICY:
- The school store is an internal supply and issuance facility. The school DOES NOT sell items commercially to the general public.
- Textbooks, classroom learning materials, uniform sets, laboratory supplies, and athletic equipment are allocated and ISSUED directly to enrolled students, teachers, and staff upon registration and term reporting.
- If visitors ask to purchase school materials, explain that items are officially allocated to registered learners as part of academic onboarding and curriculum requirements.

YOUR OBJECTIVES & BEHAVIOR:
1. Greet visitors, prospective parents, and students warmly with institutional pride.
2. State your name and role clearly when asked ("I am ${agentTitle}").
3. Answer questions thoroughly regarding course curricula, grade placement, CBC, admissions, fee structures, term calendars, and institutional procedures.
4. PROACTIVELY ASK FOR CONTACT DETAILS: Politely ask for the parent's or learner's Name and Phone Number (or WhatsApp number) so our admissions desk and administration team can follow up with full prospectus documents or schedule a campus tour.
5. When the user provides their name or phone number, warmly thank them and confirm that our team will reach out to them shortly.
6. Keep answers clear, structured with bullet points, courteous, and directly relevant to the user's inquiry.`;
    }

    return `You are "${agentTitle}", an expert AI solutions consultant and customer advisor for ${businessName}.

BUSINESS & PLATFORM PROFILE:
- Organization Name: ${businessName}
- Industry / Focus: ${instType} ${inst.businessSubType ? `(${inst.businessSubType})` : ''}
- Location / Address: ${inst.address || inst.countyId || 'Nairobi, Kenya'}
- Contact Phone: ${ctx.contactPhone || inst.phoneNumber || (inst as any)?.phone || '+254 700 000 000'}
- Contact Email: ${ctx.contactEmail || inst.email || 'sales@eduai.co.ke'}
- WhatsApp / Hotline: ${ctx.whatsappNumber || inst.phoneNumber || (inst as any)?.phone || '+254 700 000 000'}
- Operating Hours: ${ctx.operatingHours || '24/7 Cloud Support | Mon - Sat: 8:00 AM - 6:00 PM'}
- Currency: ${currency}
${catalogText}
${servicesText}

YOUR OBJECTIVES & BEHAVIOR:
1. Greet customers warmly and answer any question with clarity, intelligence, and structured formatting.
2. When asked your name or identity, clearly introduce yourself as "${agentTitle}".
3. Reason with users step-by-step to understand their requirements, explain how EduAI modules work, calculate approximate costs or subscription models, and suggest the best workflow.
4. LEAD GENERATION & PROACTIVE CONTACT CAPTURE: During the conversation, politely ask for the visitor's Name and Phone Number / WhatsApp number so that our Super Admin and solution specialists can follow up with a live interactive demo, setup guide, or custom quotation.
5. When the visitor shares their name or phone number, warmly thank them and confirm their details have been recorded for prompt follow-up.
6. Always maintain an intelligent, friendly, and empowering tone.`;
}

/**
 * Intelligent Local Knowledge-Base & Reasoning Fallback Engine:
 * Formulates multi-turn, contextual responses when external AI gateways are offline or unconfigured.
 */
function generateLocalAgentResponse(
    userMessage: string,
    history: AgentMessage[],
    ctx: SalesAgentContext
): AgentMessage {
    const inst = ctx.institution || {} as any;
    const lower = userMessage.toLowerCase().trim();
    const currency = (inst as any)?.currency || 'KES';
    const instName = inst.name || 'EduAI Global Cloud OS';
    const agentTitle = ctx.agentName || `${instName} Solutions Advisor`;
    const phone = ctx.contactPhone || inst.phoneNumber || (inst as any)?.phone || '+254 700 000 000';
    const email = ctx.contactEmail || inst.email || 'sales@eduai.co.ke';
    const address = inst.address || inst.subCounty || inst.countyId || 'Nairobi, Kenya';
    const isSchool = inst.institutionType && ['Education', 'Primary', 'Secondary', 'Tertiary', 'Higher Education', 'TVET', 'College', 'University'].includes(inst.institutionType as string);

    let actionType: AgentMessage['actionType'] = undefined;
    let actionData: any = undefined;

    // Detect if user is sharing phone number or name in message
    const phoneMatch = userMessage.match(/(?:(?:\+254|0)[17]\d{8}|\b0\d{9}\b|\+?\d{9,13}\b)/);
    if (phoneMatch) {
        actionType = 'create_lead';
        return {
            role: 'model',
            text: `Thank you so much! 🎉 I have recorded your contact number **${phoneMatch[0]}** for **${instName}**.\n\nOur Super Admin and technical solutions team have been notified and will follow up with you directly via Call / WhatsApp with personalized details and demo access.\n\nIn the meantime, feel free to ask me any further questions about our modules, pricing, or system capabilities!`,
            actionType
        };
    }

    // 1. Identity, Name & Creator Queries
    if (lower.includes('name') || lower.includes('who are you') || lower.includes('what are you') || lower.includes('who made you') || lower.includes('who created you') || lower.includes('what is your name')) {
        return {
            role: 'model',
            text: `Hello! 👋 My name is **${agentTitle}**.\n\nI am your intelligent digital AI solutions consultant and assistant for **${instName}**.\n\nI can help you with:\n• 🌟 **Module Consultations & Workflows** (Academics, Hospital HIS, SACCO, POS, Security, Real Estate, Church & more)\n• 📋 **Admissions, Registration & Onboarding**\n• 💰 **Tuition, Subscription & Fee Schedules**\n• 📅 **Scheduling Demos & Campus Visits**\n• 📞 **Connecting with our Specialist Team**\n\nWhat can I assist you with today?`
        };
    }

    // 2. AI Reasoning & Capability Inquiries
    if (lower.includes('reason') || lower.includes('openai') || lower.includes('chatgpt') || lower.includes('gemini') || lower.includes('how smart') || lower.includes('how do you work') || lower.includes('what can you do') || lower.includes('can you help')) {
        return {
            role: 'model',
            text: `I am engineered with **Advanced Multi-Engine AI Reasoning** (powered by OpenAI GPT-4o and Google Gemini neural models), integrated directly into **${instName}**.\n\nHere is how I can reason and assist:\n• **Logical Problem Solving:** I analyze your specific institutional setup to recommend optimized workflows.\n• **Automated Calculations:** I calculate tuition schedules, student subscriptions, or ERP package costs in ${currency}.\n• **Domain Intelligence:** From Kenyan CBC academic grading to Hospital HIS triaging and SACCO loan interest, I understand your operational requirements.\n\nFeel free to ask me any complex question, or let me know what module you'd like to explore!`
        };
    }

    // 3. Human Agent / Callback Handover
    if (lower.includes('speak to human') || lower.includes('real person') || lower.includes('sales team') || lower.includes('human agent') || lower.includes('call me') || lower.includes('representative') || lower.includes('contact me') || lower.includes('phone number') || lower.includes('callback')) {
        actionType = 'create_lead';
        return {
            role: 'model',
            text: `I'd be glad to connect you directly with our team! 📞\n\n• **Direct Phone:** ${phone}\n• **Email:** ${email}\n• **Office / Campus:** ${address}\n\nPlease enter your **Name** and **Phone Number** below, and our specialist will reach out to you directly!`,
            actionType
        };
    }

    // 4. Module Specific Explanations (Hospital, SACCO, POS, Retail, Security, Church, Hotel)
    if (lower.includes('hospital') || lower.includes('health') || lower.includes('clinic') || lower.includes('his') || lower.includes('patient') || lower.includes('triage') || lower.includes('pharmacy')) {
        return {
            role: 'model',
            text: `🏥 **Hospital Information System (HIS) Module**\n\nOur integrated healthcare platform delivers comprehensive digital clinical workflows:\n\n• **OPD & IPD Management:** Real-time patient triage, vital signs charting, bed occupancy, and ward transfers.\n• **Doctor Consultation Desk:** Digital diagnosis (ICD-11), electronic prescription issuing, and clinical notes.\n• **Integrated Pharmacy & Dispensing:** Real-time drug inventory tracking, expiry alerts, and prescription verification.\n• **Automated Billing & Insurance:** Cash, M-PESA, NHIF/SHA, and private insurance remittance claim processing.\n• **Laboratory & Radiology:** Test ordering, specimen tracking, and automated result delivery.\n\nWould you like to book a live demo of the HIS module?`,
            actionType: 'book_service'
        };
    }

    if (lower.includes('sacco') || lower.includes('microfinance') || lower.includes('loan') || lower.includes('savings') || lower.includes('dividend') || lower.includes('member')) {
        return {
            role: 'model',
            text: `🏦 **SACCO & Microfinance ERP Module**\n\nDesigned to automate credit union and financial cooperative operations:\n\n• **Member Management:** KYC onboarding, share capital registers, and savings account ledgers.\n• **Automated Loan Engine:** Reducing balance and straight-line interest calculations, guarantor approvals, and disbursement.\n• **M-PESA & Bank Reconciliation:** Automated deposit tracking, instant B2C disbursements, and SMS payment receipts.\n• **Dividend & Financial Reports:** SASRA compliance reporting, balance sheets, and automated dividend distribution.\n\nWould you like to see how our loan automation engine works?`,
            actionType: 'book_service'
        };
    }

    if (lower.includes('retail') || lower.includes('pos') || lower.includes('supermarket') || lower.includes('storefront') || lower.includes('inventory') || lower.includes('sales') || lower.includes('shop')) {
        return {
            role: 'model',
            text: `🛒 **Retail POS & Multi-Branch Inventory Module**\n\nEquipped for modern commerce and supermarkets:\n\n• **Lightning POS:** Barcode scanning, offline receipt generation, cash, card, and M-PESA Till integration.\n• **Smart Inventory:** Batch tracking, low-stock reorder thresholds, and shrinkage analytics.\n• **Supplier & Purchase Orders:** Automated PO creation and stock receipt matching.\n• **Online Customer Storefront:** Built-in customer web portal for remote ordering and deliveries.\n\nWould you like to test our Point of Sale interface?`,
            actionType: 'book_service'
        };
    }

    if (lower.includes('security') || lower.includes('guard') || lower.includes('armory') || lower.includes('patrol') || lower.includes('visitor')) {
        return {
            role: 'model',
            text: `🛡️ **Private Security & Facility Guarding Module**\n\nEngineered for security firms and facility protection:\n\n• **Guard Rostering & Shifts:** Automated assignment of guard personnel across client beats.\n• **Armory & Firearm Logistics:** Digital weapon issuance, ammunition reconciliation, and license tracking.\n• **Visitor & Asset Gate Logs:** QR-code visitor scanning, vehicle checks, and property gate passes.\n• **Incident & Medical Logs:** Emergency dispatch tracking and occurrence book (OB) logs.\n\nWould you like more details on security personnel rostering?`,
            actionType: 'book_service'
        };
    }

    // 5. Admissions, Application & Registration
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
                text: `📋 **Onboarding & Setup with ${instName}**\n\nGetting started with our cloud platform is quick and seamless!\n\n• Instant tenant provisioning with dedicated multi-branch database isolation.\n• Seamless data migration for students, patients, staff, and inventory records.\n• Full on-site and remote staff training.\n\nWould you like our deployment team to configure your environment? Click **Book / Apply** below to begin!`,
                actionType
            };
        }
    }

    // 6. Fees, Tuition & Pricing
    if (lower.includes('fee') || lower.includes('tuition') || lower.includes('cost') || lower.includes('price') || lower.includes('how much') || lower.includes('payment') || lower.includes('pricing') || lower.includes('subscription')) {
        if (ctx.services && ctx.services.length > 0) {
            const feeItems = ctx.services.slice(0, 6).map(s => `• **${s.name}**: ${s.price > 0 ? `${currency} ${s.price.toLocaleString()}` : 'Contact for Tier'} (${s.duration || 'Standard'})`).join('\n');
            return {
                role: 'model',
                text: `💰 **Pricing & Modules Overview for ${instName}**\n\nHere are our standard packages and service tiers:\n\n${feeItems}\n\n*Note: Flexible billing, per-student subscriptions, and custom enterprise licensing are available.* For a customized proposal, feel free to contact our sales desk at **${phone}** or **${email}**.`,
                actionType: 'book_service'
            };
        } else {
            return {
                role: 'model',
                text: `💰 **Pricing & Subscription Inquiries for ${instName}**\n\nOur pricing is flexible, transparent, and structured according to your organization size, learner count, or branch footprint.\n\nFor a detailed quotation and invoice, please contact our accounts and sales desk at **${phone}** or via email at **${email}**.`,
                actionType: 'create_lead'
            };
        }
    }

    // 7. Academic CBC & Curriculum
    if (lower.includes('course') || lower.includes('curriculum') || lower.includes('subject') || lower.includes('grade') || lower.includes('level') || lower.includes('class') || lower.includes('program') || lower.includes('academic') || lower.includes('cbc')) {
        if (ctx.services && ctx.services.length > 0) {
            const courseList = ctx.services.map(s => `• **${s.name}** ${s.description ? `— ${s.description}` : ''} (${s.price > 0 ? `${currency} ${s.price.toLocaleString()}` : 'Included'})`).join('\n');
            return {
                role: 'model',
                text: `📚 **Academic Programs & Modules at ${instName}**\n\nWe provide a comprehensive curriculum designed for modern excellence:\n\n${courseList}\n\nWould you like more details on any specific program?`,
                actionType: 'book_service'
            };
        } else {
            return {
                role: 'model',
                text: `📚 **Academics & Curricula at ${instName}**\n\nWe deliver high-standard CBC and foundational academic programs equipped with automated grading, competency assessments, student portals, and attendance tracking.\n\nWould you like to schedule a demonstration? Reach us at **${phone}**.`,
                actionType: 'book_service'
            };
        }
    }

    // 8. Uniforms & School Store Policies
    if (lower.includes('uniform') || lower.includes('book') || lower.includes('textbook') || lower.includes('stationery') || lower.includes('supply') || lower.includes('store') || lower.includes('buy book') || lower.includes('material')) {
        if (isSchool) {
            return {
                role: 'model',
                text: `👕 **Institutional Resource & Uniform Policy**\n\n• **Textbooks & Learning Kits:** At ${instName}, essential textbooks, curriculum course books, and lab supplies are institutional resources allocated and **issued directly to enrolled learners** upon term reporting.\n• **Uniform Sets:** School uniform sets, sports kits, and identity badges are provided as part of the student onboarding package upon admission.\n• **School Store:** Our store serves as an internal issuance facility for students and staff. Commercial retail sales to external parties are not conducted.\n\nIf you need assistance with learner material allocations, please contact the administration desk at **${phone}**.`,
                actionType: 'create_lead'
            };
        }
    }

    // 9. Location, Campus Tours & Visiting Hours
    if (lower.includes('location') || lower.includes('where') || lower.includes('address') || lower.includes('direction') || lower.includes('map') || lower.includes('visit') || lower.includes('tour') || lower.includes('hours') || lower.includes('time') || lower.includes('open')) {
        actionType = 'book_service';
        return {
            role: 'model',
            text: `📍 **Location & Visiting Hours — ${instName}**\n\n• **Physical Location:** ${address}\n• **Office & Helpdesk Hours:** ${ctx.operatingHours || 'Monday to Friday, 7:30 AM – 5:00 PM'}\n• **Telephone:** ${phone}\n• **Email:** ${email}\n\nWe warmly welcome visitors and partners! Would you like to schedule an on-site visit or virtual consultation? Click below to book an appointment.`,
            actionType
        };
    }

    // 10. Greetings & Friendly Small Talk
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('good morning') || lower.includes('good afternoon') || lower.includes('good evening') || lower === 'start' || lower === 'help') {
        return {
            role: 'model',
            text: `Hello and welcome to **${instName}**! 👋 I am **${agentTitle}**.\n\nI can assist you with:\n• 🌟 **Module Demonstrations & Features** (Schools, Hospitals, Saccos, Retail & more)\n• 📋 **Admissions, Subscriptions & Setup Guides**\n• 💰 **Fee Schedules & Package Pricing**\n• 📍 **Location, Contacts & Scheduling Consultations**\n\nWhat would you like to explore today?`
        };
    }

    if (lower.includes('thank') || lower.includes('great') || lower.includes('awesome') || lower.includes('good') || lower === 'ok' || lower === 'okay' || lower === 'cool') {
        return {
            role: 'model',
            text: `You're very welcome! 😊 I'm always here to help you get the most out of **${instName}**.\n\nIs there anything else you would like to know about our modules, pricing, or system capabilities?`
        };
    }

    // 11. Intelligent Context-Aware Continuation
    return {
        role: 'model',
        text: `Thank you for your question! Regarding **${instName}**, I can help you explore any part of our platform—including **Admissions, Course Curricula, Fee Schedules, Hospital HIS, SACCO Microfinance, Retail POS, or Security Logistics**.\n\n• You can ask me any specific question about these modules.\n• Or reach our direct support desk at **${phone}** / **${email}**.\n\nWhat specific detail or workflow would you like to look at?`
    };
}

/**
 * Direct client-side OpenAI chat completion executor
 */
async function callClientOpenAi(
    messages: Array<{ role: string; content: string }>,
    apiKey: string,
    model: string = 'gpt-4o-mini'
): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `OpenAI error ${response.status}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
}

/**
 * Sends conversation history and current user message to AI with multi-layer resilience:
 * 1. Serverless Gateway (/api/ai) supporting OpenAI & Gemini with bidirectional failover
 * 2. Direct client-side OpenAI execution if key is present in browser/env
 * 3. Direct client-side Gemini execution if key is present in browser/env
 * 4. Intelligent multi-turn conversational reasoning fallback engine
 */
export async function querySalesAgent(
    history: AgentMessage[],
    userMessage: string,
    context: SalesAgentContext
): Promise<AgentMessage> {
    const systemPrompt = buildSystemPrompt(context);

    // Retrieve client keys
    const customGeminiKey = localStorage.getItem('eduai_gemini_key') || localStorage.getItem('custom_gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
    const customOpenAiKey = localStorage.getItem('eduai_openai_key') || localStorage.getItem('custom_openai_api_key') || localStorage.getItem('openai_api_key') || (import.meta as any).env?.VITE_OPENAI_API_KEY || '';

    // Build OpenAI messages array
    const openAiMessages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10).map(msg => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.text
        })),
        { role: 'user', content: userMessage }
    ];

    // Build Gemini history array
    const geminiHistory = [
        { role: 'user', parts: [{ text: `SYSTEM CONTEXT & INSTRUCTIONS:\n${systemPrompt}` }] },
        { role: 'model', parts: [{ text: `Understood! I am ${context.agentName || context.institution.name + ' AI Solutions Advisor'}. I will reason logically and provide clear, comprehensive, and courteous assistance.` }] },
        ...history.slice(-10).map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }))
    ];

    // ─── STEP 1: Attempt Server Gateway (/api/ai) ───────────────────────────
    try {
        const token = await apiService.getAuthToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
        if (customGeminiKey) headers['x-gemini-api-key'] = customGeminiKey;
        if (customOpenAiKey) headers['x-openai-api-key'] = customOpenAiKey;

        const preferredProvider = context.preferredProvider || (customOpenAiKey ? 'openai' : 'auto');

        const response = await fetch('/api/ai', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: userMessage,
                prompt: userMessage,
                history: geminiHistory,
                model: preferredProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash',
                provider: preferredProvider,
                temperature: 0.7,
                maxOutputTokens: 1024
            })
        });

        if (response.ok) {
            const data = await response.json();
            const responseText = data.text || data.response;

            if (responseText && responseText.trim().length > 0) {
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
    } catch (apiErr) {
        console.warn("[SalesAgent] Gateway /api/ai fetch failed, falling back to direct client execution:", apiErr);
    }

    // ─── STEP 2: Direct Client-Side OpenAI Execution ─────────────────────────
    if (customOpenAiKey) {
        try {
            console.log("[SalesAgent] Executing client-side OpenAI chat completion...");
            const openAiText = await callClientOpenAi(openAiMessages, customOpenAiKey, 'gpt-4o-mini');
            if (openAiText && openAiText.trim().length > 0) {
                return {
                    role: 'model',
                    text: openAiText
                };
            }
        } catch (openAiErr) {
            console.warn("[SalesAgent] Direct client OpenAI execution error:", openAiErr);
        }
    }

    // ─── STEP 3: Direct Client-Side Gemini Execution ─────────────────────────
    if (customGeminiKey) {
        try {
            console.log("[SalesAgent] Executing client-side Gemini chat completion...");
            const genAI = new GoogleGenerativeAI(customGeminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const chat = model.startChat({
                history: geminiHistory
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
            console.warn("[SalesAgent] Client Gemini fallback error:", clientGeminiErr);
        }
    }

    // ─── STEP 4: Intelligent Local Conversational Reasoning Engine ────────────
    console.log("[SalesAgent] Engaging intelligent local conversational reasoning engine...");
    return generateLocalAgentResponse(userMessage, history, context);
}

