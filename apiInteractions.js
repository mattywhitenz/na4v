import { CONFIG } from './config.js';

const ADMIN_USERNAME = 'admin';
let currentRequest = null;
const responseCache = new Map();

function getInstancePassword() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_PASSWORD);
}

async function apiCall(url, method, body = null) {
    try {
        const password = getInstancePassword();
        if (!password) {
            throw new Error('Instance password not found in settings');
        }

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa(`${ADMIN_USERNAME}:${password}`)
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error(`Error in API call to ${url}:`, error);
        throw error;
    }
}

export async function processWithGPT4(text, apiKey, conversationHistory, userName, instanceName, customerName) {
    const cacheKey = `${text}-${conversationHistory.length}`;
    if (responseCache.has(cacheKey)) {
        return responseCache.get(cacheKey);
    }

    try {
        let fullPrompt = CONFIG.SUPER_PROMPT;
        if (CONFIG.NEW_RULES.length > 0) {
            fullPrompt += '\n' + CONFIG.NEW_RULES.map((rule, index) => `${12 + index}. ${rule}`).join('\n');
        }
        fullPrompt += '\nMESSAGE THREAD:';

        let messages = [
            { role: "system", content: fullPrompt },
            { role: "system", content: `Instance Name: ${instanceName}\nCustomer Name: ${customerName}` },
            ...conversationHistory.map(item => ({ role: item.role.toLowerCase() === userName.toLowerCase() ? 'user' : 'assistant', content: item.text })),
            { role: "user", content: text }
        ];

        const controller = new AbortController();
        currentRequest = controller;

        const response = await fetch(`${CONFIG.API_ENDPOINT}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.GPT_MODEL,
                messages: messages,
                max_tokens: 4096
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim();

        responseCache.set(cacheKey, result);
        return result;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request was cancelled');
            return null;
        }
        console.error('Error in processWithGPT4:', error);
        throw error;
    } finally {
        currentRequest = null;
    }
}

export async function textToSpeech(text, apiKey) {
    try {
        console.log("Starting textToSpeech function");
        const controller = new AbortController();
        currentRequest = controller;

        const response = await fetch(`${CONFIG.API_ENDPOINT}/audio/speech`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.TTS_MODEL,
                input: text,
                voice: CONFIG.TTS_VOICE,
                response_format: 'mp3',
                speed: CONFIG.TTS_SPEED
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const audioBlob = await response.blob();
        console.log("Audio blob created:", audioBlob ? "Present" : "Missing");
        return audioBlob;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request was aborted by the user or system:', error.message);
            return null;
        }
        console.error('Error in textToSpeech:', error);
        throw error;
    } finally {
        currentRequest = null;
    }
}

export function cancelOngoingRequests() {
    try {
        if (currentRequest && currentRequest.abort) {
            console.log("Aborting current request...");
            currentRequest.abort();
        }
    } catch (error) {
        console.error("Error during request cancellation:", error);
    }
}

export async function transcribeAudio(audioBlob, apiKey) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', CONFIG.WHISPER_MODEL);

        const controller = new AbortController();
        currentRequest = controller;

        const response = await fetch(`${CONFIG.API_ENDPOINT}/audio/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: formData,
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request was cancelled');
            return null;
        }
        console.error('Error in transcribeAudio:', error);
        throw error;
    } finally {
        currentRequest = null;
    }
}

export function clearResponseCache() {
    responseCache.clear();
}

export async function generateRandomEmail(apiKey) {
    try {
        const response = await fetch(`${CONFIG.API_ENDPOINT}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.GPT_MODEL,
                messages: [
                    { role: "system", content: "Generate a random, realistic email address." },
                    { role: "user", content: "Generate a random email address" }
                ],
                max_tokens: 50
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error generating random email:', error);
        throw error;
    }
}

export async function createUser(email, apiKey, instanceName) {
    try {
        const url = `https://${instanceName}.service-now.com/api/now/table/sys_user`;

        const firstName = await generateRandomName(apiKey, 'first');
        const lastName = await generateRandomName(apiKey, 'last');

        return await apiCall(url, 'POST', {
            first_name: firstName,
            last_name: lastName,
            email: email
        });
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

async function generateRandomName(apiKey, type) {
    try {
        const response = await fetch(`${CONFIG.API_ENDPOINT}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.GPT_MODEL,
                messages: [
                    { role: "system", content: `Generate a random, realistic ${type} name.` },
                    { role: "user", content: `Generate a random ${type} name` }
                ],
                max_tokens: 50
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error(`Error generating random ${type} name:`, error);
        throw error;
    }
}

export async function generateShortDescription(transcript, apiKey) {
    return await callGPT4(apiKey, "Create a short description of the case that the user wants to open in this transcript in 4 words.", transcript);
}

export async function translateToEnglish(transcript, apiKey) {
    return await callGPT4(apiKey, "Translate all items into English if not already.", transcript);
}

export async function generateChatSummary(transcript, apiKey) {
    return await callGPT4(apiKey, "Create a short, maximum 2 paragraph summary of this transcript.", transcript);
}

async function callGPT4(apiKey, instruction, content) {
    try {
        const response = await fetch(`${CONFIG.API_ENDPOINT}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.GPT_MODEL,
                messages: [
                    { role: "system", content: instruction },
                    { role: "user", content: content }
                ],
                max_tokens: 150
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error in GPT-4 call:', error);
        throw error;
    }
}

export async function createInteraction(instanceName, interactionData) {
    const url = `https://${instanceName}.service-now.com/api/now/table/interaction`;
    return apiCall(url, 'POST', interactionData);
}

export async function createHRCase(instanceName, caseData) {
    const url = `https://${instanceName}.service-now.com/api/now/table/sn_hr_core_case`;
    return apiCall(url, 'POST', caseData);
}

export async function createRelatedInteractionRecord(instanceName, relatedRecordData) {
    const url = `https://${instanceName}.service-now.com/api/now/table/interaction_related_record`;
    return apiCall(url, 'POST', relatedRecordData);
}

export async function getHRCaseDetails(instanceName, caseId) {
    const url = `https://${instanceName}.service-now.com/api/now/table/sn_hr_core_case/${caseId}`;
    return apiCall(url, 'GET');
}