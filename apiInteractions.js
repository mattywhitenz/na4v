import { CONFIG } from './config.js';

let currentRequest = null;

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

        responseCache.set(cacheKey, result);  // Cache the response
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

// In apiInteractions.js
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
            return null; // Abort was intended, so just return null
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

const responseCache = new Map();

export function clearResponseCache() {
    responseCache.clear();
}
