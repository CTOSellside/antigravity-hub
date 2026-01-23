const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('/api', (req, res) => {
    const testSecret = process.env.SS_TEST_SECRET || 'Secret no cargado';
    res.json({
        message: '¡Hola desde la API independiente!',
        secret_test: testSecret,
        status: 'Running on Cloud Run'
    });
});

app.listen(port, () => {
    console.log(`API Service listening on port ${port}`);
});
