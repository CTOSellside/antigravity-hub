const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 8080;

// Initialize Firebase Admin (ADC)
admin.initializeApp();

app.use(cors());
app.use(express.json());

// Auth Middleware (Reused from Hub)
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

// Mock Inventory Data
const inventory = [
    { id: 1, name: "Pastillas de Freno", stock: 24, price: 15000 },
    { id: 2, name: "Filtro de Aceite", stock: 50, price: 8000 },
    { id: 3, name: "Bujía Premium", stock: 12, price: 4500 }
];

app.get('/api/parts', verifyToken, (req, res) => {
    res.json({
        service: "RepuestosMOM Inventory API",
        user: req.user.email,
        items: inventory
    });
});

app.get('/api', (req, res) => {
    res.json({ message: "RepuestosMOM API is Online" });
});

app.listen(port, () => {
    console.log(`RepuestosMOM listening on port ${port}`);
});
