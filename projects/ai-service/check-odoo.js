const xmlrpc = require('xmlrpc');

const url = 'https://www.repuestosmom.cl';
const db = 'repuestosmom-mom-main-25810633';
const username = 'cio@repuestosmom.cl';
const password = '95512ac750d1fad3accc6b498a6490d9ef24f2f3';

console.log('--- Testing Odoo Connection ---');
console.log(`URL: ${url}`);
console.log(`DB: ${db}`);
console.log(`User: ${username}`);

const common = xmlrpc.createSecureClient({ host: 'www.repuestosmom.cl', port: 443, path: '/xmlrpc/2/common' });

common.methodCall('authenticate', [db, username, password, {}], (error, uid) => {
    if (error) {
        console.error('[ERROR] Authentication failed:', error);
    } else if (uid) {
        console.log(`[SUCCESS] Authenticated! User ID: ${uid}`);

        // Try to read one product to confirm data access
        const models = xmlrpc.createSecureClient({ host: 'www.repuestosmom.cl', port: 443, path: '/xmlrpc/2/object' });
        models.methodCall('execute_kw', [
            db, uid, password,
            'product.template', 'search_count',
            [[['type', '=', 'product']]]
        ], (err, count) => {
            if (err) console.error('[ERROR] Data fetch failed:', err);
            else console.log(`[SUCCESS] Connection verified. Found ${count} products in inventory.`);
        });

    } else {
        console.error('[FAIL] Authentication returned no UID (Check credentials).');
    }
});
