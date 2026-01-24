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
                    if (keywords.length > 2 && keywords.split(' ').length < 4) {
                        // Search by name
                        domain.push(['name', 'ilike', keywords]);
                        console.log(`[ODOO-SEARCH] Searching for specific product: "${keywords}"`);
                    } else {
                        // Default: Top stock items (qty > 0)
                        domain.push(['qty_available', '>', 0]);
                        console.log(`[ODOO-SEARCH] Keyword retrieval failed or broad query. Fetching TOP available stock...`);
                    }

                    // Step 1: Search IDs
                    const productIds = await new Promise((resolve, reject) => {
                        models.methodCall('execute_kw', [
                            ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
                            'product.product', 'search',
                            [domain],
                            { limit: 5 }
                        ], (err, val) => {
                            if (err) reject(err); else resolve(val);
                        });
                    });

                    // Step 2: Read Data (Computed fields like qty_available work here)
                    const products = await new Promise((resolve, reject) => {
                        if (productIds.length === 0) return resolve([]);
                        models.methodCall('execute_kw', [
                            ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
                            'product.product', 'read',
                            [productIds],
                            {
                                fields: ['name', 'qty_available', 'list_price', 'type']
                            }
                        ], (err, val) => {
                            if (err) reject(err); else resolve(val);
                        });
                    });

                    const duration = Date.now() - odooStart;
                    const inventoryList = products.map(p => `- ${p.name}: ${p.qty_available} unidades ($${p.list_price})`).join('\n');

                    console.log(`[ODOO-SUCCESS] Connected in ${duration}ms. UID: ${uid}. Found ${products.length} items.`);
                    contextData = `[DATOS REALES DE ODOO]:\n${inventoryList || "No se encontraron productos que coincidan con la búsqueda."}`;
                }
            } catch (error) {
                console.error('[ODOO-ERROR]', error.message);
                contextData = `[AVISO]: No pude consultar Odoo (${error.message}).`;
            }
        }

        systemInstructions += `\nINFO ADICIONAL: ${contextData}`;

        console.log('[AI] Calling Gemini model...');
        try {
            // Using Gemini 2.0 Flash (Experimental/Preview) as 1.5 alias seems unstable in this region
            const response = await ai.generate({
                model: vertexAI.gemini20Flash, // Should resolve to 'vertexai/gemini-2.0-flash-exp' or similar
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
