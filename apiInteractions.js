import { CONFIG } from './config.js';

export async function processWithGPT4(text, apiKey, conversationHistory, userName, instanceName, customerName) {
    try {
        const intent = await analyzeIntent(conversationHistory, apiKey, userName);

        if (intent === "YES" && !localStorage.getItem(CONFIG.STORAGE_KEYS.CASE_OPENED)) {
            await openCase(conversationHistory);
            localStorage.setItem(CONFIG.STORAGE_KEYS.CASE_OPENED, 'true');
            return "I've opened a case for you based on our conversation. Is there anything else I can help you with?";
        }

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
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error in processWithGPT4:', error);
        throw error;
    }
}

async function analyzeIntent(conversationHistory, apiKey, userName) {
    const lastUserMessage = conversationHistory
        .filter(item => item.role.toLowerCase() === userName.toLowerCase())
        .pop();

    if (!lastUserMessage) {
        return "NO";
    }

    const promptForAnalysis = `You need to look for the phrase "open a case" or "open a ticket", or that the user, ${userName}, in the **last message of the thread** they've sent in context of the previous message from Now Assist - indicating they want a case opened, a ticket, or "follow up from HR". If that intent is in there ONLY IN THE LAST 2 SENTENCES then respond with "YES". If it isn't, respond with "NO". No other text except "YES" or "NO". *****do this only once - if you've opened a case, don't do it again - politely end the call when it seems natural*****
Here's the text to analyse: "${lastUserMessage.text}"`;

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
                    { role: "system", content: promptForAnalysis },
                    { role: "user", content: lastUserMessage.text }
                ],
                max_tokens: 10
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim().toUpperCase();

        return result === "YES" ? "YES" : "NO";
    } catch (error) {
        console.error('Error in analyzeIntent:', error);
        throw error;
    }
}

export async function textToSpeech(text, apiKey) {
    try {
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
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.blob();
    } catch (error) {
        console.error('Error in textToSpeech:', error);
        throw error;
    }
}

export async function transcribeAudio(audioBlob, apiKey) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', CONFIG.WHISPER_MODEL);

        const response = await fetch(`${CONFIG.API_ENDPOINT}/audio/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
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

async function openCase(conversationHistory) {
    console.log("Opening case...");
    // Implement the logic for opening a case here
    // This is a placeholder and should be replaced with actual implementation
}