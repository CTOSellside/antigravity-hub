const admin = require('firebase-admin');
const { genkit, z } = require('genkit');
const vertexAI = require('@genkit-ai/vertexai');
const genkitExpress = require('@genkit-ai/express');

console.log('[DEBUG] Genkit Package Keys:', Object.keys(require('genkit')));
console.log('[DEBUG] VertexAI Package Keys:', Object.keys(vertexAI));
console.log('[DEBUG] Express Package Keys:', Object.keys(genkitExpress));

// Initialize Firebase Admin for Firebase service context if needed
admin.initializeApp();

// Configure Genkit with Vertex AI
const ai = genkit({
    plugins: [
        vertexAI.vertexAI({
            projectId: 'antigravity-cto',
            location: 'us-central1'
        }),
    ],
});

/**
 * Define the Brújula Chat Flow
 * This is a structured, observable unit of AI logic.
 */
const xmlrpc = require('xmlrpc');

// Odoo Configuration (Hardcoded for verification as requested)
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
        console.log(`[Genkit] Flow started for: ${input.prompt} (Context: ${input.context_type})`);

        let contextData = "";
        let systemInstructions = "Eres 'La Brújula', el asistente personal de Javi para gestionar el ecosistema Antigravity. ";

        if (input.context_type === 'MOM') {
            systemInstructions += "Eres un experto en el inventario real de RepuestosMOM usando datos de Odoo. ";

            // Connect to Odoo
            try {
                const common = xmlrpc.createSecureClient({ host: ODOO_CONFIG.host, port: ODOO_CONFIG.port, path: '/xmlrpc/2/common' });

                // We wrap XML-RPC in a promise for Genkit flow
                const uid = await new Promise((resolve, reject) => {
                    common.methodCall('authenticate', [ODOO_CONFIG.db, ODOO_CONFIG.username, ODOO_CONFIG.password, {}], (err, val) => {
                        if (err) reject(err); else resolve(val);
                    });
                });

                if (uid) {
                    const models = xmlrpc.createSecureClient({ host: ODOO_CONFIG.host, port: ODOO_CONFIG.port, path: '/xmlrpc/2/object' });
                    // Example: Check product count
                    const count = await new Promise((resolve, reject) => {
                        models.methodCall('execute_kw', [
                            ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
                            'product.template', 'search_count',
                            [[['type', '=', 'product']]]
                        ], (err, val) => {
                            if (err) reject(err); else resolve(val);
                        });
                    });
                    contextData = `[DATOS EN TIEMPO REAL]: Conexión exitosa a Odoo. Inventario actual: ${count} productos registrados.`;
                }
            } catch (error) {
                console.error('[Odoo Error]', error);
                contextData = `[ERROR CONEXIÓN]: No pude leer Odoo en este momento (${error.message}).`;
            }
        }

        systemInstructions += `\nUSA ESTA INFORMACIÓN ACTUALIZADA: ${contextData}`;

        const response = await ai.generate({
            model: 'vertexai/gemini-1.5-flash-002',
            prompt: input.prompt,
            system: systemInstructions,
        });

        console.log(`[Genkit] Response generated successfully.`);
        return response.text;
    }
);

// Start the Genkit server (Express-based)
// This exposes each flow as a POST endpoint: /chatFlow
genkitExpress.startFlowServer({
    flows: [chatFlow],
    port: 8080,
    cors: { origin: '*' } // Enable CORS for the Dashboard
});
