const fs = require('fs');
const path = require('path');

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
            tasks.push({ title, status, category: currentCategory });
        }
    });
    return tasks;
};

const tasks = parseBacklog(content);
console.log(JSON.stringify(tasks, null, 2));
