const admin = require('firebase-admin');
const { genkit, z } = require('genkit');
const vertexAI = require('@genkit-ai/vertexai');
const genkitExpress = require('@genkit-ai/express');
const xmlrpc = require('xmlrpc');

// --- AGENTIC AI SERVICE v3.0 ---
console.log('[INIT] AI Service starting (Agentic Mode)...');

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

// --- TOOL DEFINITION ---

const searchInventory = ai.defineTool(
    {
        name: 'searchInventory',
        description: 'Searches the RepuestosMOM inventory (Odoo) for products. Use this whenever the user asks about stock, prices, or product availability.',
        inputSchema: z.object({
            query: z.string().describe('The search terms for the product (e.g., "Radiador Corsa" or just "Pastillas").'),
        }),
        outputSchema: z.string().describe('A text summary of the found products and their stock/price.'),
    },
    async (input) => {
        console.log(`[TOOL-EXEC] searchInventory called with query: "${input.query}"`);
        const startTime = Date.now();

        try {
            const common = xmlrpc.createSecureClient({ host: ODOO_CONFIG.host, port: ODOO_CONFIG.port, path: '/xmlrpc/2/common' });

            // 1. Authenticate
            const uid = await new Promise((resolve, reject) => {
                common.methodCall('authenticate', [ODOO_CONFIG.db, ODOO_CONFIG.username, ODOO_CONFIG.password, {}], (err, val) => {
                    if (err) reject(err); else resolve(val);
                });
            });

            if (!uid) throw new Error("Odoo Authentication failed");

            const models = xmlrpc.createSecureClient({ host: ODOO_CONFIG.host, port: ODOO_CONFIG.port, path: '/xmlrpc/2/object' });

            // WATERFALL SEARCH LOGIC
            const searchOdoo = async (domain) => {
                // Step A: Search IDs
                const ids = await new Promise((resolve, reject) => {
                    models.methodCall('execute_kw', [
                        ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
                        'product.product', 'search',
                        [domain],
                        { limit: 5 }
                    ], (err, val) => {
                        if (err) reject(err); else resolve(val);
                    });
                });

                if (!ids || ids.length === 0) return [];

                // Step B: Read Fields
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

            const cleanQuery = input.query.replace(/[?¿!¡.,]/g, '').trim();
            const terms = cleanQuery.split(/\s+/).filter(t => t.length > 2);

            let products = [];
            let searchType = "";

            // 1. Strict Search (AND)
            if (terms.length > 0) {
                const strictDomain = [['type', 'in', ['product', 'consu']]];
                terms.forEach(term => strictDomain.push(['name', 'ilike', term]));

                console.log(`[ODOO-TOOL] Trying Strict Search: ${terms.join(', ')}`);
                products = await searchOdoo(strictDomain);
                searchType = "Exact Match";
            }

            // 2. Loose Search (OR / Specific Fallback)
            if (products.length === 0 && terms.length > 0) {
                // Just search for the longest/most significant term
                const significantTerm = terms.reduce((a, b) => a.length > b.length ? a : b);
                console.log(`[ODOO-TOOL] Strict failed. Trying Loose Search for: ${significantTerm}`);

                const looseDomain = [['type', 'in', ['product', 'consu']], ['name', 'ilike', significantTerm]];
                products = await searchOdoo(looseDomain);
                searchType = "Partial Match";
            }

            // 3. Fallback (Top Stock)
            if (products.length === 0) {
                console.log(`[ODOO-TOOL] No results. Fetching Top Stock fallback.`);
                const fallbackDomain = [['qty_available', '>', 0], ['type', 'in', ['product', 'consu']]];
                const allStock = await searchOdoo(fallbackDomain);
                // Sort manually desc (since we pulled a small batch, this might be imperfect but better than 0)
                // Actually for true top stock we should sort in database, but computed fields limit that.
                // We'll stick to 'recent active' as fallback.
                products = allStock;
                searchType = "General Stock";
            }

            // Format Output
            const duration = Date.now() - startTime;
            if (products.length === 0) return `No products found in Odoo inventory (Time: ${duration}ms).`;

            const list = products.map(p => `- ${p.name}: ${p.qty_available} units ($${p.list_price})`).join('\n');
            return `Found ${products.length} products (${searchType}) in ${duration}ms:\n${list}`;

        } catch (error) {
            console.error('[TOOL-ERROR]', error);
            return `Error connecting to Odoo: ${error.message}`;
        }
    }
);

// --- MAIN FLOW ---

const chatFlow = ai.defineFlow(
    {
        name: 'chatFlow',
        inputSchema: z.object({
            prompt: z.string(),
            context_type: z.string().optional()
        }),
        outputSchema: z.string(),
        tools: [searchInventory], // <--- Tool Registered Here
    },
    async (input) => {
        console.log(`[FLOW-START] Prompt: "${input.prompt}"`);

        // System Prompt: Gives the AI identity and instructions to use tools.
        let systemInstructions = `Eres 'La Brújula', el asistente experto en logística de RepuestosMOM.
        
        TU MISIÓN:
        Ayudar a Javi a gestionar el inventario usando DATOS REALES de Odoo.
        
        INSTRUCCIONES CLAVE:
        1. Si Javi pregunta por stock, precios o productos -> USA LA HERRAMIENTA 'searchInventory' INMEDIATAMENTE.
        2. No inventes datos. Usa solo lo que devuelve la herramienta.
        3. Si la herramienta devuelve productos, preséntalos de forma clara y ejecutiva.
        4. Si es una búsqueda vaga (ej. "dame stock"), la herramienta ya maneja el fallback, tú solo reporta el resultado.
        `;

        if (input.context_type !== 'MOM') {
            systemInstructions += "\n(Nota: Si la consulta no es sobre inventario, responde como asistente general de proyectos).";
        }

        try {
            const response = await ai.generate({
                model: vertexAI.gemini20Flash, // Stable Model
                prompt: input.prompt,
                system: systemInstructions,
                config: {
                    temperature: 0.2, // Low temp for factual data
                }
            });

            console.log(`[FLOW-END] Response generated.`);
            return response.text;
        } catch (e) {
            console.error('[FLOW-FATAL]', e);
            throw new Error(`Flow Error: ${e.message}`);
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
