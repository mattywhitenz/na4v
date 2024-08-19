import { CONFIG } from './config.js';
import { transcribeAudio } from './apiInteractions.js';

let mediaRecorder;
let audioChunks = [];
let recordingStream;

export async function startRecording(onDataAvailable) {
    try {
        if (!navigator.mediaDevices) {
            throw new Error('Your browser does not support audio recording.');
        }

        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(recordingStream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
            if (onDataAvailable) onDataAvailable(new Blob([event.data], { type: 'audio/webm' }));
        };

        mediaRecorder.onstart = () => {
            console.log('Recording started...');
        };

        mediaRecorder.onstop = () => {
            console.log('Recording stopped.');
        };

        mediaRecorder.start();
    } catch (error) {
        console.error('Error starting recording:', error);
        throw error;
    }
}

export function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recordingStream.getTracks().forEach(track => track.stop());
    }
}

export function playAudio(audioBlob) {
    return new Promise((resolve, reject) => {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
        };
        audio.onerror = (error) => {
            URL.revokeObjectURL(audioUrl);
            reject(error);
        };
        audio.play();
    });
}

export async function handleNameRecording(audioBlob, apiKey) {
    const nameTranscript = await transcribeAudio(audioBlob, apiKey);
    if (nameTranscript) {
        return await extractFirstName(nameTranscript, apiKey);
    } else {
        throw new Error("Couldn't transcribe the name.");
    }
}

async function extractFirstName(fullName, apiKey) {
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
                    { role: "system", content: "Extract only the first name from the given input. If there's no clear first name, return the full input." },
                    { role: "user", content: fullName }
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
        console.error('Error extracting first name:', error);
        return fullName;
    }
}