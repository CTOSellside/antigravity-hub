const express = require('express');
const axios = require('axios');
const cors = require('cors');
const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');
const xmlrpc = require('xmlrpc');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const app = express();
const port = process.env.PORT || 8080;

// Initialize clients
const secretClient = new SecretManagerServiceClient();
const firestore = new Firestore();

async function getSecret(name) {
    try {
        const [version] = await secretClient.accessSecretVersion({
            name: `projects/antigravity-cto/secrets/${name}/versions/latest`,
        });
        return version.payload.data.toString().trim();
    } catch (err) {
        console.error(`[SECRET-ERROR] Error accessing secret ${name}:`, err);
        return null;
    }
}

// Odoo Configuration & Helper
let odooConfig = null;
const initOdoo = async () => {
    console.log('[INIT] Loading Odoo secrets...');
    const url = await getSecret('SS_ODOO_URL');
    if (!url) return null;

    odooConfig = {
        url,
        db: await getSecret('SS_ODOO_DB'),
        user: await getSecret('SS_ODOO_USER'),
        pass: await getSecret('SS_ODOO_PASSWORD'),
        host: new URL(url).hostname
    };
    return odooConfig;
};

const getOdooData = async () => {
    if (!odooConfig) await initOdoo();
    if (!odooConfig) return [];

    const common = xmlrpc.createSecureClient({ host: odooConfig.host, port: 443, path: '/xmlrpc/2/common' });
    const object = xmlrpc.createSecureClient({ host: odooConfig.host, port: 443, path: '/xmlrpc/2/object' });

    return new Promise((resolve, reject) => {
        common.methodCall('authenticate', [odooConfig.db, odooConfig.user, odooConfig.pass, {}], (err, uid) => {
            if (err || !uid) return reject(err || new Error('Auth failed'));

            object.methodCall('execute_kw', [
                odooConfig.db, uid, odooConfig.pass,
                'product.template', 'search_read',
                [[['type', '=', 'product'], ['qty_available', '>', 0]]],
                { fields: ['name', 'list_price', 'qty_available'], limit: 6, order: 'qty_available desc' }
            ], (err, products) => {
                if (err) return reject(err);
                resolve(products);
            });
        });
    });
};

// Initialize Firebase Admin (uses default credentials in GCP)
admin.initializeApp();
app.use(cors());
app.use(express.json());

// Initialize Firestore
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


// GET /api/inventory - Proxy to Odoo for stock highlights (Secured)
app.get('/api/inventory', verifyToken, async (req, res) => {
    try {
        const products = await getOdooData();
        res.json(products);
    } catch (error) {
        console.error('[INVENTORY-API-ERROR]', error);
        res.status(500).json({ error: 'Failed to fetch inventory from Odoo' });
    }
});

// GET /api/cron/check-stock - Proactive alert for low stock (Internal/Secured)
app.get('/api/cron/check-stock', async (req, res) => {
    try {
        console.log('[CRON] Starting proactive stock check...');
        const webhookUrl = await getSecret('SS_GOOGLE_CHAT_WEBHOOK');
        if (!webhookUrl) throw new Error('Webhook URL not found');

        // Reuse initOdoo logic but fetch more products if needed
        if (!odooConfig) await initOdoo();

        const common = xmlrpc.createSecureClient({ host: odooConfig.host, port: 443, path: '/xmlrpc/2/common' });
        const object = xmlrpc.createSecureClient({ host: odooConfig.host, port: 443, path: '/xmlrpc/2/object' });

        common.methodCall('authenticate', [odooConfig.db, odooConfig.user, odooConfig.pass, {}], async (err, uid) => {
            if (err || !uid) return res.status(500).json({ error: 'Odoo auth failed' });

            object.methodCall('execute_kw', [
                odooConfig.db, uid, odooConfig.pass,
                'product.template', 'search_read',
                [[['type', '=', 'product'], ['qty_available', '<', 5], ['qty_available', '>', 0]]],
                { fields: ['name', 'qty_available'], limit: 10 }
            ], async (err, lowStockProducts) => {
                if (err) return res.status(500).json({ error: 'Odoo search failed' });

                if (lowStockProducts.length > 0) {
                    console.log(`[CRON] Found ${lowStockProducts.length} low stock items. Sending alert...`);

                    const productList = lowStockProducts.map(p => `• *${p.name}*: ${p.qty_available} unidades`).join('\n');
                    const message = {
                        text: `⚠️ *Alerta de Stock Bajo (IA Brújula)*\n\nJavi, he detectado que los siguientes repuestos críticos están por agotarse:\n\n${productList}\n\n👉 Revisa Odoo para gestionar reposiciones.`
                    };

                    await axios.post(webhookUrl, message);
                    res.json({ message: 'Alerts sent successfully', count: lowStockProducts.length });
                } else {
                    console.log('[CRON] No low stock items discovered. Skipping alert.');
                    res.json({ message: 'No alerts needed' });
                }
            });
        });
    } catch (error) {
        console.error('[CRON-ERROR]', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, async () => {
    await seedProfiles();
    console.log(`API Service listening on port ${port}`);
});
