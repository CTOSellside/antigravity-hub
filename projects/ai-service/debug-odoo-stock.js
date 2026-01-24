const xmlrpc = require('xmlrpc');

const ODOO_CONFIG = {
    url: 'https://www.repuestosmom.cl',
    host: 'www.repuestosmom.cl',
    port: 443,
    db: 'repuestosmom-mom-main-25810633',
    username: 'cio@repuestosmom.cl',
    password: '95512ac750d1fad3accc6b498a6490d9ef24f2f3'
};

console.log('--- Debugging Odoo Stock Data ---');

const common = xmlrpc.createSecureClient({ host: ODOO_CONFIG.host, port: ODOO_CONFIG.port, path: '/xmlrpc/2/common' });

common.methodCall('authenticate', [ODOO_CONFIG.db, ODOO_CONFIG.username, ODOO_CONFIG.password, {}], (error, uid) => {
    if (error) {
        console.error('[ERROR] Authentication failed:', error);
    } else if (uid) {
        console.log(`[SUCCESS] Authenticated! User ID: ${uid}`);

        const models = xmlrpc.createSecureClient({ host: ODOO_CONFIG.host, port: ODOO_CONFIG.port, path: '/xmlrpc/2/object' });

        // 1. Check total count WITHOUT filters
        models.methodCall('execute_kw', [
            ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
            'product.product', 'search_count', // Using product.product (variants) which holds actual stock
            [[]] // No filters
        ], (err, count) => {
            if (err) console.error('[ERROR] Count failed:', err);
            else console.log(`[INFO] Total 'product.product' count (no filter): ${count}`);
        });

        // 2. Fetch Sample Data (Top 5 by ID)
        models.methodCall('execute_kw', [
            ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
            'product.product', 'search_read',
            [[]], // No domain filter
            {
                fields: ['name', 'type', 'qty_available', 'list_price'],
                limit: 5
            }
        ], (err, products) => {
            if (err) console.error('[ERROR] Read failed:', err);
            else {
                console.log('[INFO] Sample 5 Products:', JSON.stringify(products, null, 2));
            }
        });

    } else {
        console.error('[FAIL] Authentication returned no UID.');
    }
});
