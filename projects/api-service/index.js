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
            if (profile.name === 'CTO Sellside') defaultProfileId = docRef.id;
        }
    } else {
        const ctoDoc = snapshot.docs.find(doc => doc.data().name === 'CTO Sellside');
        defaultProfileId = ctoDoc ? ctoDoc.id : snapshot.docs[0].id;
    }

    // Migration: Assign orphan projects to the default profile (CTO Sellside)
    console.log('[MIGRATION] Checking for projects without profileId...');
    const allProjects = await projectsCollection.get();
    let migratedCount = 0;

    for (const doc of allProjects.docs) {
        const data = doc.data();
        if (!data.profileId) {
            await doc.ref.update({ profileId: defaultProfileId });
            migratedCount++;
        }
    }

    if (migratedCount > 0) {
        console.log(`[MIGRATION] Successfully migrated ${migratedCount} projects to profile ${defaultProfileId} (CTO Sellside).`);
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
        status: 'Online with Project Admin 2.0 Support'
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

// PATCH /api/projects/:id - Update an existing project (Secured)
app.patch('/api/projects/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        await projectsCollection.doc(id).update({
            ...updates,
            updatedAt: new Date().toISOString()
        });
        res.json({ id, ...updates, message: 'Project updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/projects/:id - Delete a project (Secured)
app.delete('/api/projects/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        await projectsCollection.doc(id).delete();
        res.json({ id, message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(port, async () => {
    await seedProfiles();
    console.log(`API Service listening on port ${port}`);
});
