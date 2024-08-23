import { CONFIG } from './config.js';

async function callServiceNowAPI(endpoint, method, data = null) {
  const instance = localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_NAME);
  const username = localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_USERNAME);
  const password = localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_PASSWORD);

  if (!instance || !username || !password) {
    throw new Error('ServiceNow credentials are missing. Please check your settings.');
  }

  const url = `https://${instance}.service-now.com/api/now/table/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${btoa(`${username}:${password}`)}`
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

export async function createCase(userDetails = {}) {
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

// OpenAI API Interactions

async function executeOpenAIFetch(endpoint, method, data, apiKey) {
  const url = `${CONFIG.API_ENDPOINT}/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const options = {
    method: method,
    headers: headers,
    body: JSON.stringify(data)
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error executing fetch for OpenAI ${endpoint}:`, error);
    throw error;
  }
}

export async function processWithGPT4(text, apiKey, conversationHistory, userName, instanceName, customerName) {
  let fullPrompt = CONFIG.SUPER_PROMPT;
  fullPrompt += '\nMESSAGE THREAD:';

  let messages = [
    { role: "system", content: fullPrompt },
    { role: "system", content: `Instance Name: ${instanceName}\nCustomer Name: ${customerName}` },
    ...conversationHistory.map(item => ({ role: item.role.toLowerCase() === userName.toLowerCase() ? 'user' : 'assistant', content: item.text })),
    { role: "user", content: text }
  ];

  const data = {
    model: CONFIG.GPT_MODEL,
    messages: messages,
    max_tokens: 4096
  };

  const response = await executeOpenAIFetch('chat/completions', 'POST', data, apiKey);
  return response.choices[0].message.content.trim();
}

export async function textToSpeech(text, apiKey) {
  const url = `${CONFIG.API_ENDPOINT}/audio/speech`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const data = {
    model: CONFIG.TTS_MODEL,
    input: text,
    voice: CONFIG.TTS_VOICE,
    response_format: 'mp3',
    speed: CONFIG.TTS_SPEED
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const audioBlob = await response.blob();
    return audioBlob;
  } catch (error) {
    console.error(`Error executing fetch for OpenAI audio/speech:`, error);
    throw error;
  }
}

export async function transcribeAudio(audioBlob, apiKey) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', CONFIG.WHISPER_MODEL);

  const url = `${CONFIG.API_ENDPOINT}/audio/transcriptions`;
  const headers = {
    'Authorization': `Bearer ${apiKey}`
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: formData
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw error;
  }
}

export async function generateRandomEmail(apiKey) {
  const data = {
    model: CONFIG.GPT_MODEL,
    messages: [
      { role: "system", content: "Generate a random, realistic email address. Produce only the email, no other text or quotation marks at all" },
      { role: "user", content: "Generate a random, realistic email address. Produce only the email, no other text or quotation marks at all" }
    ],
    max_tokens: 50
  };

  const response = await executeOpenAIFetch('chat/completions', 'POST', data, apiKey);
  return response.choices[0].message.content.trim();
}

export async function generateShortDescription(transcript, apiKey) {
  const data = {
    model: CONFIG.GPT_MODEL,
    messages: [
      { role: "system", content: "Create a short description of the case that the user wants to open in this transcript in 4 words." },
      { role: "user", content: transcript }
    ],
    max_tokens: 50
  };

  const response = await executeOpenAIFetch('chat/completions', 'POST', data, apiKey);
  return response.choices[0].message.content.trim();
}

export async function generateChatSummary(transcript, apiKey) {
  const data = {
    model: CONFIG.GPT_MODEL,
    messages: [
      { role: "system", content: "Create a short, maximum 2 paragraph summary of this transcript." },
      { role: "user", content: transcript }
    ],
    max_tokens: 300
  };

  const response = await executeOpenAIFetch('chat/completions', 'POST', data, apiKey);
  return response.choices[0].message.content.trim();
}

export function cancelOngoingRequests() {
  // This function might need to be implemented differently or removed
  // depending on how you want to handle request cancellation in the browser
  console.log("cancelOngoingRequests called, but may need to be implemented differently for browser use");
}