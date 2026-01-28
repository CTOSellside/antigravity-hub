const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
    projectId: 'antigravity-cto'
});

const db = admin.firestore();
const backlogCollection = db.collection('backlog');

const backlogPath = path.join(__dirname, 'backlog.md');
const content = fs.readFileSync(backlogPath, 'utf8');

const parseBacklog = (md) => {
    const tasks = [];
    const lines = md.split('\n');
    let currentCategory = 'General';

    lines.forEach(line => {
        if (line.startsWith('### ')) {
            currentCategory = line.replace('### ', '').trim();
        } else if (line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]')) {
            const status = line.includes('[x]') ? 'Done' : 'To Do';
            const title = line.replace(/- \[[x ]\] /, '').split('<!--')[0].trim();
            tasks.push({ title, status, category: currentCategory, createdAt: new Date().toISOString() });
        }
    });
    return tasks;
};

const tasks = parseBacklog(content);

async function seed() {
    console.log(`Seeding ${tasks.length} tasks...`);
    const batch = db.batch();
    tasks.forEach(task => {
        const docRef = backlogCollection.doc();
        batch.set(docRef, task);
    });
    await batch.commit();
    console.log('Seeding complete.');
}

seed().catch(console.error);
