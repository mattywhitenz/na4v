const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Function to make ServiceNow API requests
async function callServiceNowAPI(endpoint, method, data = null) {
  const url = `https://${process.env.SN_INSTANCE}.service-now.com/api/now/table/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(`${process.env.SN_USERNAME}:${process.env.SN_PASSWORD}`).toString('base64')}`
  };

  const options = {
    method: method,
    headers: headers,
    body: data ? JSON.stringify(data) : null
  };

  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error(`Error calling ServiceNow API: ${error}`);
    throw error;
  }
}

// Example route to create a case
app.post('/create-case', async (req, res) => {
  try {
    // Create user
    const user = await callServiceNowAPI('sys_user', 'POST', {
      first_name: "Test",
      last_name: "User",
      email: "testuser@example.com"
    });

    // Create interaction
    const interaction = await callServiceNowAPI('interaction', 'POST', {
      opened_for: user.result.sys_id,
      short_description: "Test interaction"
    });

    // Create HR case
    const hrCase = await callServiceNowAPI('sn_hr_core_case', 'POST', {
      opened_for: user.result.sys_id,
      short_description: "Test HR case",
      description: "This is a test HR case created via API"
    });

    // Create related interaction record
    const relatedRecord = await callServiceNowAPI('interaction_related_record', 'POST', {
      interaction: interaction.result.sys_id,
      document_id: hrCase.result.sys_id,
      document_table: 'sn_hr_core_case'
    });

    res.json({
      message: "Case created successfully",
      user: user.result,
      interaction: interaction.result,
      hrCase: hrCase.result,
      relatedRecord: relatedRecord.result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});