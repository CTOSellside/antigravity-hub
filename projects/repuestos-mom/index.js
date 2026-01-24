const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const odoo = require('./src/odoo-client');
const app = express();
const port = process.env.PORT || 8080;

// Initialize Firebase Admin (ADC)
admin.initializeApp();

app.use(cors());
app.use(express.json());

// Auth Middleware
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (e) {
        res.status(403).json({ error: 'Invalid Token' });
    }
};

// Initialize Odoo once
let odooInitialized = false;

app.get('/api/parts', verifyToken, async (req, res) => {
    try {
        if (!odooInitialized) {
            await odoo.init();
            odooInitialized = true;
        }
        const products = await odoo.getProducts();
        res.json({
            service: "RepuestosMOM Inventory API",
            user: req.user.email,
            source: "Odoo ERP Real-time",
            items: products
        });
    } catch (error) {
        console.error('Odoo Error:', error);
        res.status(500).json({ error: 'Error fetching data from Odoo', details: error.message });
    }
});

app.get('/api', (req, res) => {
    res.json({ message: "RepuestosMOM API is Online (Secure & Odoo-ready)" });
});

app.listen(port, () => {
    console.log(`RepuestosMOM listening on port ${port}`);
});
