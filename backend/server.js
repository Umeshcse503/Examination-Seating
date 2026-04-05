const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const apiRoutes = require('../routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes - MUST be before static middleware
app.use('/api', apiRoutes);

// Static files middleware
app.use(express.static(path.join(__dirname, '..'))); // Serve static files from project root


// Root route redirects to homepage in /html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../html/homepage.html'));
});

// Fallback for direct HTML access if needed (optional)
app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../html', `${req.params.page}.html`));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Final Error Handler: Ensure all server errors come back as JSON
app.use((err, req, res, next) => {
    console.error('Fatal Server Error:', err.stack);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});
