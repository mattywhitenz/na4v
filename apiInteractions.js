import { CONFIG } from './config.js';

// ServiceNow API Interactions

async function executeServiceNowFetch(endpoint, method, data = null) {
  const instanceName = localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_NAME);
  const instancePassword = localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_PASSWORD);

  if (!instanceName || !instancePassword) {
    throw new Error('Instance name or password is missing');
  }

  const url = `https://${instanceName}.service-now.com/api/now/table/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + btoa(`admin:${instancePassword}`)
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
    console.error(`Error executing fetch for ${endpoint}:`, error);
    throw error;
  }
}

export async function createUser(randomEmail) {
  const userData = {
    first_name: "Jon",
    last_name: "Smith",
    email: randomEmail
  };
  return executeServiceNowFetch('sys_user', 'POST', userData);
}

export async function createInteraction(interactionData) {
  return executeServiceNowFetch('interaction', 'POST', interactionData);
}

export async function createHRCase(caseData) {
  return executeServiceNowFetch('sn_hr_core_case', 'POST', caseData);
}

export async function createRelatedInteractionRecord(relatedRecordData) {
  return executeServiceNowFetch('interaction_related_record', 'POST', relatedRecordData);
}

export async function getHRCaseDetails(caseId) {
  return executeServiceNowFetch(`sn_hr_core_case/${caseId}`, 'GET');
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

    // Get the response as a blob
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

export async function translateToEnglish(transcript, apiKey) {
  const data = {
    model: CONFIG.GPT_MODEL,
    messages: [
      { role: "system", content: "Translate all items into English if not already." },
      { role: "user", content: transcript }
    ],
    max_tokens: 1000
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