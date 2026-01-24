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
        console.log(`[Genkit] Flow started for: ${input.prompt}`);

        let systemInstructions = "Eres 'La Brújula', el asistente personal de Javi para gestionar el ecosistema Antigravity. ";
        if (input.context_type === 'MOM') {
            systemInstructions += "Actúa como experto en el inventario de RepuestosMOM. Responde de forma clara y ejecutiva. ";
        } else {
            systemInstructions += "Ofrece consejos sobre gestión de proyectos y prioridades Scrum. ";
        }

        const response = await ai.generate({
            model: vertexAI.gemini15Flash,
            prompt: input.prompt,
            system: systemInstructions,
        });

        console.log(`[Genkit] Response generated successfully.`);
        return response.text;
    }
);

// Start the Genkit server (Express-based)
// This exposes each flow as a POST endpoint: /chatFlow
genkitExpress.startFlowsServer({
    flows: [chatFlow],
    port: 8080,
    cors: { origin: '*' } // Enable CORS for the Dashboard
});
