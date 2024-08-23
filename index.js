const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const { createCase } = require('./servicenow');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/update-env', (req, res) => {
  const { SN_INSTANCE, SN_USERNAME, SN_PASSWORD } = req.body;
  process.env.SN_INSTANCE = SN_INSTANCE;
  process.env.SN_USERNAME = SN_USERNAME;
  process.env.SN_PASSWORD = SN_PASSWORD;
  res.json({ message: 'Environment variables updated successfully' });
});

app.post('/create-case', async (req, res) => {
  try {
    const result = await createCase(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});