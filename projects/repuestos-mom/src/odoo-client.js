const xmlrpc = require('xmlrpc');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

async function getSecret(name) {
    const [version] = await client.accessSecretVersion({
        name: `projects/antigravity-cto/secrets/${name}/versions/latest`,
    });
    return version.payload.data.toString().trim();
}

class OdooClient {
    async init() {
        this.url = await getSecret('SS_ODOO_URL');
        this.db = await getSecret('SS_ODOO_DB');
        this.username = await getSecret('SS_ODOO_USER');
        this.password = await getSecret('SS_ODOO_PASSWORD');

        const urlParts = new URL(this.url);
        this.common = xmlrpc.createSecureClient({
            host: urlParts.hostname,
            port: 443,
            path: '/xmlrpc/2/common'
        });
        this.object = xmlrpc.createSecureClient({
            host: urlParts.hostname,
            port: 443,
            path: '/xmlrpc/2/object'
        });
    }

    async authenticate() {
        return new Promise((resolve, reject) => {
            this.common.methodCall('authenticate', [this.db, this.username, this.password, {}], (error, value) => {
                if (error) return reject(error);
                this.uid = value;
                resolve(value);
            });
        });
    }

    async getProducts() {
        if (!this.uid) await this.authenticate();

        return new Promise((resolve, reject) => {
            this.object.methodCall('execute_kw', [
                this.db, this.uid, this.password,
                'product.template', 'search_read',
                [[['type', '=', 'product']]], // Only real products
                { fields: ['name', 'list_price', 'qty_available'], limit: 10 }
            ], (error, value) => {
                if (error) return reject(error);
                resolve(value);
            });
        });
    }
}

module.exports = new OdooClient();
