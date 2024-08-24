const fetch = require('node-fetch');
require('dotenv').config();

const instance = process.env.SN_INSTANCE;
const username = process.env.SN_USERNAME;
const password = process.env.SN_PASSWORD;

async function callServiceNowAPI(endpoint, method, data = null) {
  const url = `https://${instance}.service-now.com/api/now/table/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  };

  const options = {
    method: method,
    headers: headers,
    body: data ? JSON.stringify(data) : null
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error calling ServiceNow API: ${error}`);
    throw error;
  }
}

async function createCase(userDetails = {}) {
  try {
    // Generate a random email if not provided
    const email = userDetails.email || `user${Math.floor(Math.random() * 10000)}@example.com`;

    // Create user
    console.log("Creating user...");
    const user = await callServiceNowAPI('sys_user', 'POST', {
      first_name: userDetails.firstName || "Test",
      last_name: userDetails.lastName || "User",
      email: email
    });
    console.log("User created:", user.result.sys_id);

    // Create interaction
    console.log("Creating interaction...");
    const interaction = await callServiceNowAPI('interaction', 'POST', {
      opened_for: user.result.sys_id,
      short_description: userDetails.shortDescription || "Voice-triggered interaction"
    });
    console.log("Interaction created:", interaction.result.sys_id);

    // Create HR case
    console.log("Creating HR case...");
    const hrCase = await callServiceNowAPI('sn_hr_core_case', 'POST', {
      opened_for: user.result.sys_id,
      short_description: userDetails.shortDescription || "Voice-triggered HR case",
      description: userDetails.description || "This is an HR case created via voice automation"
    });
    console.log("HR case created:", hrCase.result.sys_id);

    // Create related interaction record
    console.log("Creating related interaction record...");
    const relatedRecord = await callServiceNowAPI('interaction_related_record', 'POST', {
      interaction: interaction.result.sys_id,
      document_id: hrCase.result.sys_id,
      document_table: 'sn_hr_core_case'
    });
    console.log("Related interaction record created:", relatedRecord.result.sys_id);

    return {
      user: user.result,
      interaction: interaction.result,
      hrCase: hrCase.result,
      relatedRecord: relatedRecord.result
    };
  } catch (error) {
    console.error("Error in case creation process:", error);
    throw error;
  }
}

module.exports = { createCase };