const admin = require('firebase-admin');
const { genkit, z } = require('genkit');
const vertexAI = require('@genkit-ai/vertexai');
const genkitExpress = require('@genkit-ai/express');
const xmlrpc = require('xmlrpc');

// --- DEEP LOGGING INIT ---
console.log('[INIT] AI Service starting...');
console.log('[DEBUG] VertexAI Keys:', Object.keys(vertexAI));

// Initialize Firebase
admin.initializeApp();

// Configure Genkit
const ai = genkit({
    plugins: [
        vertexAI.vertexAI({
            projectId: 'antigravity-cto',
            location: 'us-central1'
        }),
    ],
});

// Odoo Config
const ODOO_CONFIG = {
    url: 'https://www.repuestosmom.cl',
    host: 'www.repuestosmom.cl',
    port: 443,
    db: 'repuestosmom-mom-main-25810633',
    username: 'cio@repuestosmom.cl',
    password: '95512ac750d1fad3accc6b498a6490d9ef24f2f3'
};

const chatFlow = ai.defineFlow(
    {
        name: 'chatFlow',
        inputSchema: z.object({
            prompt: z.string(),
            context_type: z.string().optional()
        }),
        outputSchema: z.string(),
    },
    async (input) => {
        const startTime = Date.now();
        console.log(`[FLOW-START] Prompt: "${input.prompt}" | Context: ${input.context_type}`);

        let contextData = "";
        let systemInstructions = "Eres 'La Brújula', el asistente personal de Javi para gestionar el ecosistema Antigravity. ";

        if (input.context_type === 'MOM') {
            systemInstructions += "Actúa como experto en el inventario de RepuestosMOM. ";
            console.log('[ODOO] Starting connection check...');

            try {
                const odooStart = Date.now();
                const common = xmlrpc.createSecureClient({ host: ODOO_CONFIG.host, port: ODOO_CONFIG.port, path: '/xmlrpc/2/common' });

                const uid = await new Promise((resolve, reject) => {
                    common.methodCall('authenticate', [ODOO_CONFIG.db, ODOO_CONFIG.username, ODOO_CONFIG.password, {}], (err, val) => {
                        if (err) reject(err); else resolve(val);
                    });
                });

                if (uid) {
                    const models = xmlrpc.createSecureClient({ host: ODOO_CONFIG.host, port: ODOO_CONFIG.port, path: '/xmlrpc/2/object' });

                    // Dynamic Search Logic
                    let domain = [['type', 'in', ['product', 'consu']]]; // Filter for product and consumable types

                    // Improved cleaning: remove many common conversational words to isolate the product name
                    const stopWords = ['hola', 'stock', 'tienes', 'traeme', 'muestrame', 'inventario', 'quiero', 'saber', 'los', 'las', 'dame', 'cuales', 'son', 'productos', 'con', 'mas', 'mayor', 'disponibles', 'hay', 'repuesto', 'para'];
                    const regex = new RegExp(`\\b(${stopWords.join('|')})\\b`, 'gi');
                    const keywords = input.prompt.replace(regex, '').replace(/[?¿!¡.,]/g, '').trim();

                    // Heuristic: If keywords are short (likely a product name like "Radiador" or "Bujia"), search by name.
                    // If keywords are empty or very long/complex, fallback to showing top available stock.
                    // Step 1: Strict Search (AND Logic)
                    // Must contain ALL terms (e.g. "Radiador" AND "Corsa")
                    let strictDomain = [['type', 'in', ['product', 'consu']]];
                    const terms = keywords.split(/\s+/).filter(t => t.length > 2);

                    if (terms.length > 0) {
                        terms.forEach(term => {
                            strictDomain.push(['name', 'ilike', term]);
                        });
                        console.log(`[ODOO-SEARCH] Trying Strict (AND) Search: ${terms.join(', ')}`);
                    } else {
                        // If cleaning removed everything, fallback immediately
                        strictDomain = [['qty_available', '>', 0]];
                    }

                    // Execution helper
                    const searchOdoo = async (searchDomain) => {
                        const ids = await new Promise((resolve, reject) => {
                            models.methodCall('execute_kw', [
                                ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
                                'product.product', 'search',
                                [searchDomain],
                                { limit: 5 }
                            ], (err, val) => {
                                if (err) reject(err); else resolve(val);
                            });
                        });

                        if (ids.length === 0) return [];

                        return new Promise((resolve, reject) => {
                            models.methodCall('execute_kw', [
                                ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
                                'product.product', 'read',
                                [ids],
                                { fields: ['name', 'qty_available', 'list_price', 'type'] }
                            ], (err, val) => {
                                if (err) reject(err); else resolve(val);
                            });
                        });
                    };

                    let products = [];
                    let searchType = "Strict";

                    // Try 1: Strict
                    if (terms.length > 0) {
                        products = await searchOdoo(strictDomain);
                    }

                    // Try 2: Loose (OR Logic) - if Strict failed and we have multiple terms
                    if (products.length === 0 && terms.length > 1) {
                        console.log(`[ODOO-SEARCH] Strict failed. Trying Loose (OR) Search...`);
                        searchType = "Loose";
                        let looseDomain = [['type', 'in', ['product', 'consu']], '|'];
                        // Odoo Polish Notation for OR is tricky with dynamic length. 
                        // Simplified strategy: Just search for the longest word (most specific)
                        const longestTerm = terms.reduce((a, b) => a.length > b.length ? a : b);
                        looseDomain.push(['name', 'ilike', longestTerm]);
                        products = await searchOdoo(looseDomain);
                    }

                    // Try 3: Fallback (Top Stock)
                    if (products.length === 0) {
                        console.log(`[ODOO-SEARCH] No matches. Fetching Top Stock...`);
                        searchType = "Fallback";
                        // Simplify fallback to generic stock > 0
                        products = await searchOdoo([['qty_available', '>', 0]]);
                        // Sort fallback by stock desc manually
                        products.sort((a, b) => b.qty_available - a.qty_available);
                    }

                    const duration = Date.now() - odooStart;
                    const inventoryList = products.map(p => `- ${p.name}: ${p.qty_available} unidades ($${p.list_price})`).join('\n');

                    console.log(`[ODOO-SUCCESS] Connected in ${duration}ms. UID: ${uid}. Found ${products.length} items (${searchType}).`);
                    contextData = `[RESULTADOS ODOO (${searchType})]:\n${inventoryList}`;
                }
            } catch (error) {
                console.error('[ODOO-ERROR]', error.message);
                contextData = `[AVISO]: No pude consultar Odoo (${error.message}).`;
            }
        }

        systemInstructions += `\nINFO ADICIONAL: ${contextData}`;

        console.log('[AI] Calling Gemini model...');
        try {
            // Reverting to Gemini 2.0 Flash (STABLE & TESTED)
            // The previous 2.5 Pro attempt failed with 404 despite listing keys.
            const response = await ai.generate({
                model: vertexAI.gemini20Flash,
                prompt: input.prompt,
                system: systemInstructions,
            });
            console.log(`[FLOW-END] Success. Duration: ${Date.now() - startTime}ms`);
            return response.text;
        } catch (e) {
            console.error('[AI-FATAL]', e);
            throw new Error(`Error generando respuesta: ${e.message}`);
        }
    }
);

// Global Error Trap
process.on('uncaughtException', (err) => {
    console.error('[PROCESS-CRASH] Uncaught Exception:', err);
});

genkitExpress.startFlowServer({
    flows: [chatFlow],
    port: 8080,
    cors: { origin: '*' }
});
