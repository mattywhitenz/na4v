const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

console.log("Starting server...");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} request to ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  console.log("Serving index.html");
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/test', (req, res) => {
  console.log("Test route accessed");
  res.json({ message: 'Server is running' });
});

app.post('/api/servicenow-proxy', async (req, res) => {
  const { url, method, headers, body } = req.body;
  try {
    console.log('Proxy request:', { url, method, headers });
    const response = await fetch(url, { method, headers, body: JSON.stringify(body) });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in proxy route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
  console.log('Available routes:');
  console.log('GET /');
  console.log('GET /test');
  console.log('POST /api/servicenow-proxy');
});