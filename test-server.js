const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

console.log("Starting server...");

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} request to ${req.url}`);
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/test', (req, res) => {
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

// Catch-all route for debugging
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`);
  res.status(404).send('Not Found');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});