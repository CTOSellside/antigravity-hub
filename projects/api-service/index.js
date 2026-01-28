const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');
const app = express();
const port = process.env.PORT || 8080;

// Initialize Firebase Admin (uses default credentials in GCP)
admin.initializeApp();

app.use(cors());
app.use(express.json());

// Initialize Firestore
const firestore = new Firestore();
const projectsCollection = firestore.collection('projects');
const profilesCollection = firestore.collection('profiles');

// Seeding Initial Profiles & Migration
const seedProfiles = async () => {
    let defaultProfileId;
    const snapshot = await profilesCollection.get();

    if (snapshot.empty) {
        console.log('[SEED] Seeding initial profiles...');
        const initialProfiles = [
            { name: 'CTO Sellside', projectId: 'antigravity-cto', color: '#1a73e8' },
            { name: 'Repuestos MOM', projectId: 'repuestosmom-main', color: '#e91e63' }
        ];
        for (const profile of initialProfiles) {
            const docRef = await profilesCollection.add(profile);
            if (!defaultProfileId) defaultProfileId = docRef.id;
        }
    } else {
        defaultProfileId = snapshot.docs[0].id;
    }

    // Migration: Assign orphan projects to the default profile
    console.log('[MIGRATION] Checking for projects without profileId...');
    const orphanProjects = await projectsCollection.where('profileId', '==', null).get();
    const projectsWithoutField = await projectsCollection.orderBy('name').get(); // Fallback to check all if needed, but Firestore 'where' on missing fields is tricky

    // Better way to find projects without the field: loop and check docs
    const allProjects = await projectsCollection.get();
    let migratedCount = 0;

    for (const doc of allProjects.docs) {
        if (!doc.data().profileId) {
            await doc.ref.update({ profileId: defaultProfileId });
            migratedCount++;
        }
    }

    if (migratedCount > 0) {
        console.log(`[MIGRATION] Successfully migrated ${migratedCount} projects to profile ${defaultProfileId}.`);
    } else {
        console.log('[MIGRATION] No orphan projects found.');
    }
};

// Middleware: Verify Authentication Token
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Auth token missing or malformed' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
};

app.get('/api', (req, res) => {
    const testSecret = process.env.SS_TEST_SECRET || 'Secret no cargado';
    res.json({
        message: '¡Hola desde la API de Proyectos!',
        secret_test: testSecret,
        status: 'Online with Multi-Profile Support'
    });
});

// GET /api/profiles - List all profiles (Secured)
app.get('/api/profiles', verifyToken, async (req, res) => {
    try {
        const snapshot = await profilesCollection.get();
        const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(profiles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/profiles - Add a new profile (Secured)
app.post('/api/profiles', verifyToken, async (req, res) => {
    try {
        const { name, projectId, color } = req.body;
        const newProfile = { name, projectId, color: color || '#888' };
        const docRef = await profilesCollection.add(newProfile);
        res.status(201).json({ id: docRef.id, ...newProfile });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/projects - List all projects (Secured + filtered by profile)
app.get('/api/projects', verifyToken, async (req, res) => {
    try {
        const { profileId } = req.query;
        let query = projectsCollection;
        if (profileId) {
            query = query.where('profileId', '==', profileId);
        }
        const snapshot = await query.get();
        const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/projects - Add a new project (Secured)
app.post('/api/projects', verifyToken, async (req, res) => {
    try {
        const { name, owner, status, profileId } = req.body;
        if (!profileId) return res.status(400).json({ error: 'profileId is required' });

        const newProject = {
            name,
            owner: owner || req.user.name || 'Anonymous',
            status: status || 'Planning',
            profileId,
            createdAt: new Date().toISOString(),
            createdBy: req.user.email
        };
        const docRef = await projectsCollection.add(newProject);
        res.status(201).json({ id: docRef.id, ...newProject });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/projects/stats - Summary statistics (Secured)
app.get('/api/projects/stats', verifyToken, async (req, res) => {
    try {
        const { profileId } = req.query;
        let query = projectsCollection;
        if (profileId) {
            query = query.where('profileId', '==', profileId);
        }
        const snapshot = await query.get();
        const stats = {
            Planning: 0,
            'In Progress': 0,
            Live: 0,
            total: snapshot.size
        };
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (stats[data.status] !== undefined) {
                stats[data.status]++;
            } else {
                stats[data.status] = (stats[data.status] || 0) + 1;
            }
        });
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, async () => {
    await seedProfiles();
    console.log(`API Service listening on port ${port}`);
});
