const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { VertexAI } = require('@google-cloud/vertexai');

const app = express();
const port = process.env.PORT || 8080;

// Initialize Firebase Admin (for Auth verification)
admin.initializeApp();

// Initialize Vertex AI
const project = 'antigravity-cto';
const location = 'us-central1';
const vertexAI = new VertexAI({ project: project, location: location });
const generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-flash-002',
});

app.use(cors());
app.use(express.json());

// Auth Middleware
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (e) {
        res.status(403).json({ error: 'Invalid Token' });
    }
};

app.post('/api/ai/chat', verifyToken, async (req, res) => {
    const { prompt, context_type } = req.body;
    console.log(`[AI-START] Prompt from ${req.user.email}: "${prompt}"`);

    try {
        let context = "";
        if (context_type === 'MOM') {
            context = "Eres un experto en inventario de RepuestosMOM. El usuario es Javi, el CTO. Responde de forma ejecutiva y eficiente. ";
            // Here we could add real data from repo-mom
        } else {
            context = "Eres 'La Brújula', el asistente personal de Javi para gestionar Antigravity. Analiza tareas y ofrece consejos Scrum. ";
        }

        const request = {
            contents: [{ role: 'user', parts: [{ text: `${context} Pregunta del usuario: ${prompt}` }] }],
        };

        const result = await generativeModel.generateContent(request);
        const text = result.response.candidates[0].content.parts[0].text;

        console.log(`[AI-SUCCESS] Response sent back to ${req.user.email}`);
        res.json({ response: text });
    } catch (error) {
        console.error('[AI-FAILURE] Full Error:', JSON.stringify(error, null, 2));
        res.status(500).json({
            error: 'Error calling AI Engine',
            details: error.message,
            advice: "Rosa está revisando los logs en GCP, un momento por favor."
        });
    }
});

app.get('/api', (req, res) => {
    res.json({ message: "AI Service 'La Brújula' is Online" });
});

app.listen(port, () => {
    console.log(`AI Service listening on port ${port}`);
});
