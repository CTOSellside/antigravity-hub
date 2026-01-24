const xmlrpc = require('xmlrpc');

const ODOO_CONFIG = {
    url: 'https://www.repuestosmom.cl',
    host: 'www.repuestosmom.cl',
    port: 443,
    db: 'repuestosmom-mom-main-25810633',
    username: 'cio@repuestosmom.cl',
    password: '95512ac750d1fad3accc6b498a6490d9ef24f2f3'
};

console.log('--- Testing Advanced Odoo Search Logic ---');

const common = xmlrpc.createSecureClient({ host: ODOO_CONFIG.host, port: ODOO_CONFIG.port, path: '/xmlrpc/2/common' });

common.methodCall('authenticate', [ODOO_CONFIG.db, ODOO_CONFIG.username, ODOO_CONFIG.password, {}], (error, uid) => {
    if (error) {
        console.error('[ERROR] Authentication failed:', error);
    } else if (uid) {
        console.log(`[SUCCESS] Authenticated! User ID: ${uid}`);

        const models = xmlrpc.createSecureClient({ host: ODOO_CONFIG.host, port: ODOO_CONFIG.port, path: '/xmlrpc/2/object' });

        const testQueries = [
            "Radiador",
            "Radiador Corsa", // Should find items with BOTH words
            "Pastillas Freno",
            "Aceite 10W40"
        ];

        async function runTests() {
            for (const query of testQueries) {
                console.log(`\nTesting query: "${query}"`);

                // Advanced Logic: Split and AND
                const terms = query.split(' ');
                let domain = [['type', 'in', ['product', 'consu']]];

                terms.forEach(term => {
                    domain.push(['name', 'ilike', term]);
                });

                await new Promise((resolve) => {
                    models.methodCall('execute_kw', [
                        ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
                        'product.product', 'search_read',
                        [domain],
                        {
                            fields: ['name', 'qty_available'],
                            limit: 3
                        }
                    ], (err, products) => {
                        if (err) console.error('  [FAIL]', err.message);
                        else {
                            console.log(`  [OK] Found ${products.length} items`);
                            if (products.length > 0) {
                                products.forEach(p => console.log(`    - ${p.name} (Stock: ${p.qty_available})`));
                            } else {
                                console.log('    (No matches found with rigid AND logic)');
                            }
                        }
                        resolve();
                    });
                });
            }
        }
        runTests();

    } else {
        console.error('[FAIL] Authentication returned no UID.');
    }
});
