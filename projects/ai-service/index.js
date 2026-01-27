const admin = require('firebase-admin');
const { genkit, z } = require('genkit');
const vertexAI = require('@genkit-ai/vertexai');
const genkitExpress = require('@genkit-ai/express');
const xmlrpc = require('xmlrpc');

// --- AGENTIC AI SERVICE v3.2 (History + Strict Grounding + Stemming) ---
console.log('[INIT] AI Service starting (Agentic Mode + Loop)...');

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

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function getSecret(name) {
    try {
        const [version] = await client.accessSecretVersion({
            name: `projects/antigravity-cto/secrets/${name}/versions/latest`,
        });
        return version.payload.data.toString().trim();
    } catch (err) {
        console.error(`[SECRET-ERROR] Error accessing secret ${name}:`, err);
        throw err;
    }
}

// Odoo Config placeholder
let ODOO_CONFIG = {};

async function initSecrets() {
    console.log('[INIT] Loading secrets from GCP Secret Manager...');
    ODOO_CONFIG = {
        url: await getSecret('SS_ODOO_URL'),
        host: (new URL(await getSecret('SS_ODOO_URL'))).hostname,
        port: 443,
        db: await getSecret('SS_ODOO_DB'),
        username: await getSecret('SS_ODOO_USER'),
        password: await getSecret('SS_ODOO_PASSWORD')
    };
    console.log('[INIT] Secrets loaded successfully.');
}

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

            let cleanQuery = input.query.replace(/[?¿!¡.,]/g, '').trim();

            // Basic Stemming: Handle plurals (radiadores -> radiador)
            if (cleanQuery.endsWith('es')) cleanQuery = cleanQuery.slice(0, -2);
            else if (cleanQuery.endsWith('s')) cleanQuery = cleanQuery.slice(0, -1);

            const terms = cleanQuery.split(/\s+/).filter(t => t.length > 2);

            let products = [];
            let searchType = "";

            // 1. Strict Search (AND)
            if (terms.length > 0) {
                const strictDomain = [['type', 'in', ['product', 'consu']]];
                terms.forEach(term => strictDomain.push(['name', 'ilike', term]));

                console.log(`[ODOO-TOOL] Trying Strict Search: ${terms.join(', ')}`);
                products = await searchOdoo(strictDomain);
                searchType = "EXACT MATCH";
            }

            // 2. Loose Search (OR / Specific Fallback)
            if (products.length === 0 && terms.length > 0) {
                const significantTerm = terms.reduce((a, b) => a.length > b.length ? a : b);
                console.log(`[ODOO-TOOL] Strict failed. Trying Loose Search for: ${significantTerm}`);

                const looseDomain = [['type', 'in', ['product', 'consu']], ['name', 'ilike', significantTerm]];
                products = await searchOdoo(looseDomain);
                searchType = "PARTIAL MATCH";
            }

            // 3. Fallback (Top Stock)
            if (products.length === 0) {
                console.log(`[ODOO-TOOL] No results. Fetching Top Stock fallback.`);
                const fallbackDomain = [['qty_available', '>', 0], ['type', 'in', ['product', 'consu']]];
                const allStock = await searchOdoo(fallbackDomain);
                products = allStock;
                searchType = "FALLBACK (NO MATCH)";
            }

            // Format Output
            const duration = Date.now() - startTime;
            if (products.length === 0) return `No products found in Odoo inventory matching '${input.query}'. (Time: ${duration}ms).`;

            const list = products.map(p => `- ${p.name}: ${p.qty_available} units ($${p.list_price})`).join('\n');

            if (searchType.includes("FALLBACK")) {
                return `WARNING: NO EXACT MATCHES found for '${input.query}'. \nHere is a list of GENERIC available products instead (DO NOT claim these are '${input.query}'):\n${list}`;
            }
            return `SUCCESS: Found ${products.length} products matching '${input.query}' (${searchType}):\n${list}`;

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
            context_type: z.string().optional(),
            // History schema: Array of objects with role ('user', 'model', 'tool') and content
            history: z.array(z.any()).optional()
        }),
        outputSchema: z.string(),
        tools: [searchInventory],
    },
    async (input) => {
        console.log(`[FLOW-START] Prompt: "${input.prompt}"`);

        // System Prompt: Strict Grounding
        let systemInstructions = `Eres 'La Brújula', el asistente experto en logística de RepuestosMOM.
        
        REGLAS DE ORO (STRICT GROUNDING):
        1. Tu única fuente de verdad es la herramienta 'searchInventory'.
        2. Si la herramienta dice "WARNING: NO EXACT MATCHES", DILE AL USUARIO QUE NO TENEMOS ESE PRODUCTO ESPECÍFICO. No inventes que los productos genéricos son lo que busca.
        3. Si la herramienta dice "No products found", di simplemente "No encontré información sobre eso".
        4. Sé conciso y profesional. Muestra precios y cantidades exactas devueltas por la herramienta.
        `;

        if (input.context_type !== 'MOM') {
            systemInstructions += "\n(Nota: Si la consulta no es sobre inventario, responde como asistente general de proyectos).";
        }

        try {
            // Prepare History
            const history = input.history || [];

            // 1. First Generation Call (Model decides to use tool)
            const llmResponse = await ai.generate({
                model: vertexAI.gemini20Flash,
                prompt: input.prompt,
                system: systemInstructions,
                history: history, // Pass conversation history
                tools: [searchInventory],
                config: { temperature: 0.1 } // Very low temp for precision
            });

            // 2. Check for Tool Calls
            const toolCalls = llmResponse.toolCalls;

            if (toolCalls && toolCalls.length > 0) {
                // Determine if we need to run tools
                const toolCall = toolCalls[0];

                if (toolCall.tool.name === 'searchInventory') {
                    console.log(`[FLOW-LOOP] Executing Tool: ${toolCall.tool.name}`);

                    // Execute the Tool
                    const toolOutput = await searchInventory(toolCall.toolInput);

                    // 3. Second Generation Call (Feed tool output back to model for final answer)
                    const finalResponse = await ai.generate({
                        model: vertexAI.gemini20Flash,
                        prompt: input.prompt, // Original prompt
                        system: systemInstructions,
                        history: [
                            ...history, // Include previous history
                            { role: 'model', content: [{ toolRequest: { name: toolCall.tool.name, ref: toolCall.ref, input: toolCall.toolInput } }] },
                            { role: 'tool', content: [{ toolResponse: { name: toolCall.tool.name, ref: toolCall.ref, output: toolOutput } }] }
                        ],
                        tools: [searchInventory],
                        config: { temperature: 0.1 }
                    });

                    console.log(`[FLOW-END] Response with tool data.`);
                    return finalResponse.text;
                }
            }

            // 2.5 Fallback: Check for "Hallucinated" Text Tool Calls
            // Gemini sometimes outputs text like: ```tool_code searchInventory(query='radiador')```
            const textCallRegex = /searchInventory\s*\(\s*(?:query\s*=\s*)?['"]([^'"]+)['"]\s*\)/i;
            const match = llmResponse.text.match(textCallRegex);

            if (match) {
                const capturedQuery = match[1];
                console.log(`[FLOW-LOOP] Intercepted Text Tool Call: searchInventory('${capturedQuery}')`);

                // Execute Tool manually
                const toolOutput = await searchInventory({ query: capturedQuery });

                // Feed back to model pretending it was a legitimate tool interaction
                const finalResponse = await ai.generate({
                    model: vertexAI.gemini20Flash,
                    prompt: input.prompt,
                    system: systemInstructions + `\n\n[SYSTEM UPDATE]: I executed the tool scan you requested. Result: ${toolOutput}. Please summarize this for the user.`,
                    history: history,
                    config: { temperature: 0.1 }
                });
                return finalResponse.text;
            }

            // No tool used, just return text
            console.log(`[FLOW-END] Direct response.`);
            return llmResponse.text;

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

// START SERVER WRAPPED IN ASYNC FOR SECRETS
async function start() {
    try {
        await initSecrets();
        genkitExpress.startFlowServer({
            flows: [chatFlow],
            port: 8080,
            cors: { origin: '*' }
        });
    } catch (err) {
        console.error('[FATAL-START] Could not initialize secrets:', err);
        process.exit(1);
    }
}

start();
