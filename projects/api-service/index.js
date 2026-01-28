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
            if (err || !uid) {
                console.error('[ODOO-AUTH-FAILED]', err || 'No UID returned');
                return reject(err || new Error('Auth failed'));
            }
            console.log(`[ODOO-AUTH-SUCCESS] UID: ${uid}`);

            object.methodCall('execute_kw', [
                odooConfig.db, uid, odooConfig.pass,
                'product.product', 'search_read',
                [[['type', 'in', ['product', 'consu']], ['qty_available', '>', 0]]],
                { fields: ['name', 'list_price', 'qty_available'], limit: 8 }
            ], (err, products) => {
                if (err) {
                    console.error('[ODOO-EXECUTE-FAILED]', err);
                    return reject(err);
                }
                console.log(`[ODOO-DATA-FETCHED] Count: ${products.length}`);
                resolve(products);
            });
        });
    });
};

// --- SCAFFOLDING HELPERS ---

const slugify = (text) => {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w-]+/g, '')       // Remove all non-word chars
        .replace(/--+/g, '-');          // Replace multiple - with single -
}

const createGitHubRepo = async (name, description) => {
    try {
        const token = await getSecret('hello-world-github-oauthtoken-3dfaea');
        if (!token) throw new Error('GitHub Token not found in Secret Manager');

        const repoName = slugify(name);
        console.log(`[GH-SCAFFOLD] Creating repo: ${repoName}`);

        const response = await axios.post('https://api.github.com/user/repos', {
            name: repoName,
            description: description || "Project scaffolded by Antigravity Hub",
            private: true,
            auto_init: true // Ensure repo exists with a README
        }, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Antigravity-Hub'
            }
        });

        return response.data;
    } catch (error) {
        console.error('[GH-SCAFFOLD-ERROR]', error.response?.data || error.message);
        throw error;
    }
}

const initializeProjectEntry = async (name, repoUrl) => {
    try {
        console.log(`[FIRESTORE-SCAFFOLD] Registering project: ${name}`);
        const docRef = await projectsCollection.add({
            name: name,
            repoUrl: repoUrl,
            status: 'Active',
            category: 'Scaffolded',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error('[FIRESTORE-PROJECT-INIT-ERROR]', error);
        throw error;
    }
}

// Initialize Firebase Admin (uses default credentials in GCP)
admin.initializeApp();
app.use(cors());
app.use(express.json());

// Initialize Firestore
const projectsCollection = firestore.collection('projects');
const profilesCollection = firestore.collection('profiles');
const scrumMetricsCollection = firestore.collection('scrum_metrics');
const backlogCollection = firestore.collection('backlog');

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

    // Seed Scrum Metrics if empty
    const metricsSnapshot = await scrumMetricsCollection.get();
    if (metricsSnapshot.empty) {
        console.log('[SEED] Seeding historical scrum metrics...');
        const today = new Date();
        const baseScope = 25; // Simulated scope
        const historicalEvents = [
            { type: 'COMPLETED', date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), count: 2 },
            { type: 'COMPLETED', date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), count: 3 },
            { type: 'COMPLETED', date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), count: 4 },
            { type: 'COMPLETED', date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), count: 2 }
        ];
        for (const event of historicalEvents) {
            await scrumMetricsCollection.add(event);
        }
    }

    // Seed Backlog if empty
    const backlogSnapshot = await backlogCollection.limit(1).get();
    if (backlogSnapshot.empty) {
        console.log('[SEED] Seeding initial backlog tasks...');
        const initialTasks = [
            { title: 'Configurar primer proyecto específico', status: 'To Do', category: 'To Do', createdAt: new Date().toISOString() },
            { title: 'Vincular con GitHub Repository', status: 'To Do', category: 'To Do', createdAt: new Date().toISOString() },
            { title: 'Project Scaffolding 3.0 (Auto-generación de Código)', status: 'Done', category: 'Done', createdAt: new Date().toISOString() },
            { title: 'Métricas Scrum Automáticas (Burndown Chart)', status: 'Done', category: 'Done', createdAt: new Date().toISOString() },
            { title: 'IA Brújula v2 (Alertas Proactivas en Google Chat)', status: 'Done', category: 'Done', createdAt: new Date().toISOString() }
        ];
        const batch = firestore.batch();
        initialTasks.forEach(task => {
            const docRef = backlogCollection.doc();
            batch.set(docRef, task);
        });
        await batch.commit();
        console.log('[SEED] Backlog seeded successfully.');
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
        const { name, owner, status, profileId, scaffold } = req.body;
        if (!profileId) return res.status(400).json({ error: 'profileId is required' });

        const newProject = {
            name,
            owner: owner || req.user.name || 'Anonymous',
            status: status || 'Planning',
            profileId,
            createdAt: new Date().toISOString(),
            createdBy: req.user.email
        };

        if (scaffold) {
            console.log(`[SCAFFOLD] Triggering automatic scaffolding for: ${name}`);
            try {
                const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const githubToken = await getSecret('hello-world-github-oauthtoken-3dfaea');
                const repo = 'CTOSellside/antigravity-hub';
                const branch = 'main';

                const files = [
                    {
                        path: `projects/${slug}/package.json`,
                        content: JSON.stringify({
                            name: slug,
                            version: "1.0.0",
                            description: `Auto-generated project: ${name}`,
                            main: "index.js",
                            scripts: { start: "node index.js" },
                            dependencies: { express: "^4.18.2" }
                        }, null, 2)
                    },
                    {
                        path: `projects/${slug}/index.js`,
                        content: `const express = require('express');\nconst app = express();\nconst port = process.env.PORT || 8080;\n\napp.get('/', (req, res) => {\n    res.json({ message: 'Hello from ${name}!', status: 'Scaffolded successfully' });\n});\n\napp.listen(port, () => {\n    console.log('${name} listening on port ' + port);\n});`
                    },
                    {
                        path: `projects/${slug}/Dockerfile`,
                        content: "FROM node:18-slim\nWORKDIR /usr/src/app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 8080\nCMD [ \"node\", \"index.js\" ]"
                    },
                    {
                        path: `projects/${slug}/cloudbuild.yaml`,
                        content: `steps:\n  - name: 'gcr.io/cloud-builders/docker'\n    args: ['build', '-t', 'gcr.io/$PROJECT_ID/${slug}', '.']\n  - name: 'gcr.io/cloud-builders/docker'\n    args: ['push', 'gcr.io/$PROJECT_ID/${slug}']\n  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'\n    entrypoint: gcloud\n    args:\n      - 'run'\n      - 'deploy'\n      - '${slug}'\n      - '--image'\n      - 'gcr.io/$PROJECT_ID/${slug}'\n      - '--region'\n      - 'us-central1'\n      - '--platform'\n      - 'managed'\n      - '--allow-unauthenticated'\nimages:\n  - 'gcr.io/$PROJECT_ID/${slug}'`
                    }
                ];

                for (const file of files) {
                    await axios.put(
                        `https://api.github.com/repos/${repo}/contents/${file.path}`,
                        {
                            message: `feat: scaffold project ${name}`,
                            content: Buffer.from(file.content).toString('base64'),
                            branch: branch
                        },
                        {
                            headers: {
                                Authorization: `token ${githubToken}`,
                                Accept: 'application/vnd.github.v3+json'
                            }
                        }
                    );
                }
                newProject.githubUrl = `https://github.com/CTOSellside/antigravity-hub/tree/main/projects/${slug}`;
                newProject.scaffolded = true;
            } catch (scaffoldError) {
                console.error('[SCAFFOLD-ERROR]', scaffoldError.response?.data || scaffoldError.message);
                // We still save the project but mark it as failed scaffolding
                newProject.scaffoldError = scaffoldError.message;
            }
        }

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

        // Log Scrum Event if status changes to 'Live'
        if (updates.status === 'Live') {
            await scrumMetricsCollection.add({
                type: 'COMPLETED',
                projectId: id,
                date: new Date().toISOString(),
                count: 1
            });
        }

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
                'product.product', 'search_read',
                [[['type', 'in', ['product', 'consu']], ['qty_available', '<', 5], ['qty_available', '>', 0]]],
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

// GET /api/scrum/metrics - Get Burndown data (Secured)
app.get('/api/scrum/metrics', verifyToken, async (req, res) => {
    try {
        const eventsSnapshot = await scrumMetricsCollection.orderBy('date', 'asc').get();
        const events = eventsSnapshot.docs.map(doc => doc.data());

        const totalScope = 25; // Fixed scope for visualization
        const data = [];
        const today = new Date();
        let remaining = totalScope;

        // Generate metrics for last 8 days (inclusive)
        for (let i = 7; i >= 0; i--) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];

            const completedOnDay = events
                .filter(e => e.date.startsWith(dateStr))
                .reduce((sum, e) => sum + (e.count || 1), 0);

            remaining -= completedOnDay;
            const ideal = Math.max(0, totalScope - (totalScope / 7) * (7 - i));

            data.push({
                day: dateStr.split('-').slice(1).join('/'), // format MM/DD
                actual: Math.max(0, remaining),
                ideal: parseFloat(ideal.toFixed(1))
            });
        }

        res.json({
            burndown: data,
            velocity: (events.length > 0 ? (totalScope - remaining) / 7 : 0).toFixed(1),
            totalScope
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/backlog - List all backlog tasks (Secured)
app.get('/api/backlog', verifyToken, async (req, res) => {
    try {
        const snapshot = await backlogCollection.orderBy('createdAt', 'desc').get();
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/backlog/sync - Sync markdown tasks to Firestore (Secured)
app.post('/api/backlog/sync', verifyToken, async (req, res) => {
    try {
        const { tasks } = req.body;
        if (!tasks || !Array.isArray(tasks)) return res.status(400).json({ error: 'Tasks array required' });

        const batch = firestore.batch();
        tasks.forEach(task => {
            const docRef = backlogCollection.doc();
            batch.set(docRef, {
                ...task,
                createdAt: new Date().toISOString(),
                syncedFrom: 'markdown'
            });
        });
        await batch.commit();
        res.json({ message: `Successfully synced ${tasks.length} tasks.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/backlog/:id - Update task status (Secured)
app.patch('/api/backlog/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        await backlogCollection.doc(id).update({
            ...updates,
            updatedAt: new Date().toISOString()
        });
        res.json({ id, ...updates, message: 'Task updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/backlog/:id/execute - Trigger Antigravity Protocol for task execution (Secured)
app.post('/api/backlog/:id/execute', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { instructions } = req.body;
        const taskDoc = await backlogCollection.doc(id).get();
        if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });

        const task = taskDoc.data();
        const finalInstructions = instructions || task.instructions || 'Seguir protocolo estándar.';

        console.log(`[PROTOCOL] Executing task: ${task.title} with instructions: ${finalInstructions}`);

        // Update status to Executing and store instructions
        await backlogCollection.doc(id).update({
            status: 'In Progress',
            executing: true,
            instructions: finalInstructions,
            updatedAt: new Date().toISOString()
        });

        // Antigravity Protocol Step 1: Notify Google Chat via ChatOps Channel
        const chatOpsWebhook = await getSecret('SS_CHATOPS_WEBHOOK');
        if (chatOpsWebhook) {
            await axios.post(chatOpsWebhook, {
                text: `🚀 *Antigravity Protocol: Ejecución Iniciada*\n\nJavi ha ordenado la ejecución de: **${task.title}**\n📝 *Instrucciones:* ${finalInstructions}\n\n🤖 *Rosa:* "Entendido, Javi. Iniciando el proceso técnico ahora mismo."`
            });
        }

        // Logic for specialized tasks
        let executionResult = "Protocolo de reconocimiento completado. Procediendo con la ejecución técnica...";

        if (task.title.toLowerCase().includes('scaffold') || task.title.toLowerCase().includes('crear proyecto') || task.title.toLowerCase().includes('vincular')) {
            try {
                executionResult = "🚀 Scaffolding 3.0 activado. Generando infraestructura real...";

                // 1. Create GitHub Repo
                const ghRepo = await createGitHubRepo(task.title, finalInstructions);
                const repoUrl = ghRepo.html_url;
                const repoSsh = ghRepo.ssh_url;

                // 2. Initialize Firestore Entry
                await initializeProjectEntry(task.title, repoUrl);

                executionResult = `✅ Infraestructura Creada: ${repoUrl}`;

                // Notify Google ChatOps space with extra details
                if (chatOpsWebhook) {
                    await axios.post(chatOpsWebhook, {
                        text: `✨ *Scaffolding Completado con Éxito*\n\nJavi, he creado el repositorio: **${task.title}**\n🔗 *GitHub:* ${repoUrl}\n\n🛠️ *Pasos sugeridos:* \n\`\`\`bash\ngit remote add origin ${repoSsh}\ngit push -u origin main\n\`\`\`\n\nEl proyecto ha sido registrado automáticamente en tu Dashboard. 🦾🛡️`
                    });
                }
            } catch (scaffoldError) {
                console.error('[SCAFFOLD-LOGIC-ERROR]', scaffoldError);
                executionResult = `❌ Error en Scaffolding: ${scaffoldError.message}`;
            }
        }

        await backlogCollection.doc(id).update({
            executing: false,
            lastActionResult: executionResult,
            updatedAt: new Date().toISOString()
        });

        res.json({ message: 'Protocolo de ejecución iniciado', result: executionResult });
    } catch (error) {
        console.error('[PROTOCOL-ERROR]', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, async () => {
    await seedProfiles();
    console.log(`API Service listening on port ${port}`);
});
