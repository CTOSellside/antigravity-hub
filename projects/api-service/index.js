const express = require('express');
const cors = require('cors');
const { Firestore } = require('@google-cloud/firestore');
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Startup Log
console.log('--- API BOOTING (v1.0.2) ---');
console.log('Routes: /api, /api/projects (GET/POST)');

// Initialize Firestore
const firestore = new Firestore();
const projectsCollection = firestore.collection('projects');

app.get('/api', (req, res) => {
    const testSecret = process.env.SS_TEST_SECRET || 'Secret no cargado';
    res.json({
        message: '¡Hola desde la API de Proyectos!',
        secret_test: testSecret,
        status: 'Online with Firestore'
    });
});

// GET /api/projects - List all projects
app.get('/api/projects', async (req, res) => {
    try {
        const snapshot = await projectsCollection.get();
        const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/projects - Add a new project
app.post('/api/projects', async (req, res) => {
    try {
        const { name, owner, status } = req.body;
        const newProject = {
            name,
            owner: owner || 'Javi',
            status: status || 'Planning',
            createdAt: new Date().toISOString()
        };
        const docRef = await projectsCollection.add(newProject);
        res.status(201).json({ id: docRef.id, ...newProject });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`API Service listening on port ${port}`);
});
