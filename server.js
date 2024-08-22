const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

console.log("Starting server...");

app.use(express.json());

app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.post('/api/servicenow-proxy', async (req, res) => {
  const { url, method, headers, body } = req.body;
  console.log('Proxy request:', { url, method, headers, body });

  try {
    const response = await fetch(url, { method, headers, body: JSON.stringify(body) });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in proxy route:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/test-proxy', async (req, res) => {
  const testBody = {
    url: "https://mattywashywashy.service-now.com/api/now/table/sys_user",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Basic YWRtaW46MU1hcnlsMHZlIQ=="
    },
    body: {
      first_name: "Test",
      last_name: "User",
      email: "test.user@example.com"
    }
  };

  try {
    const response = await fetch(`http://localhost:${port}/api/servicenow-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBody)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in test-proxy route:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`);
  res.status(404).send('Not Found');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});