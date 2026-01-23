const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send('<h1>¡Hola Mundo desde Antigravity!</h1><p>Rosa está gestionando este proyecto con éxito.</p>');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
