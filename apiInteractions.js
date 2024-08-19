import { CONFIG } from './config.js';

export async function processWithGPT4(text, apiKey, conversationHistory, userName, instanceName, customerName) {
    try {
        let fullPrompt = CONFIG.SUPER_PROMPT;
        if (CONFIG.NEW_RULES.length > 0) {
            fullPrompt += '\n' + CONFIG.NEW_RULES.map((rule, index) => `${12 + index}. ${rule}`).join('\n');
        }
        fullPrompt += '\n- If the user indicates they want to end the conversation (e.g., by saying "no thanks", "that\'s all", "goodbye", etc.), respond with "CONVERSATION_END" followed by a polite goodbye message.';
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

export async function textToSpeech(text, apiKey) {
    try {
        console.log("Starting textToSpeech function");
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

        const audioBlob = await response.blob();
        console.log("Audio blob created:", audioBlob ? "Present" : "Missing");
        return audioBlob;
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