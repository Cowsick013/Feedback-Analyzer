// Entry point — starts the Express server
const express = require('express');
const cors = require('cors');
const path = require('path');
const analyzeRoute = require('./routes/analyze');

const app = express();

// Allow frontend to call the backend
app.use(cors());
app.use(express.json());

// Serve the frontend folder as static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Mount the analyze route
app.use('/api', analyzeRoute);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Trinethra running at http://localhost:${PORT}`);
});