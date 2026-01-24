const { VertexAI } = require('@google-cloud/vertexai');

async function listModels() {
    const project = 'antigravity-cto';
    const location = 'us-central1';
    const vertexAI = new VertexAI({ project: project, location: location });

    console.log('--- Vertex AI Model Diagnostic ---');
    // Attempting to list via a known method or just trying common names
    const modelsToTest = [
        'gemini-1.5-flash-002',
        'gemini-1.5-pro-002',
        'gemini-2.0-flash-exp',
        'gemini-3-pro-preview',
        'gemini-2.5-pro'
    ];

    for (const modelId of modelsToTest) {
        try {
            const generativeModel = vertexAI.getGenerativeModel({ model: modelId });
            const result = await generativeModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: 'say test' }] }],
            });
            console.log(`[OK] Model ${modelId} is available.`);
        } catch (e) {
            console.log(`[FAIL] Model ${modelId}: ${e.message}`);
        }
    }
}

listModels().catch(console.error);
