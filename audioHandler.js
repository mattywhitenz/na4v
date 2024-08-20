import { CONFIG } from './config.js';
import { transcribeAudio } from './apiInteractions.js';
import { showAudioPlaybackIndicator, hideAudioPlaybackIndicator } from './uiManager.js';

let mediaRecorder;
let audioChunks = [];
let recordingStream;
let isRecording = false;
let currentAudio = null;
const audioCache = new Map();

export async function startRecording(onDataAvailable) {
    if (isRecording) {
        console.log("Already recording, startRecording skipped");
        return;
    }
    try {
        console.log("Starting recording...");
        if (!navigator.mediaDevices || !window.MediaRecorder) {
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
            isRecording = true;
        };

        mediaRecorder.onstop = () => {
            console.log('Recording stopped.');
            isRecording = false;
        };

        mediaRecorder.start();
        console.log("Recording started in audioHandler");
    } catch (error) {
        console.error('Error starting recording:', error);
        throw error;
    }
}

export function stopRecording() {
    console.log("Stopping recording...");
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
    if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
    }
    mediaRecorder = null;
    recordingStream = null;
    isRecording = false;
}

export function isCurrentlyRecording() {
    return isRecording;
}

export function playAudio(audioBlob) {
    return new Promise((resolve, reject) => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
        }

        if (audioCache.has(audioBlob)) {
            currentAudio = new Audio(audioCache.get(audioBlob));
        } else {
            const audioURL = URL.createObjectURL(audioBlob);
            audioCache.set(audioBlob, audioURL);
            currentAudio = new Audio(audioURL);
        }

        showAudioPlaybackIndicator(); // Show indicator when playback starts

        currentAudio.onended = () => {
            URL.revokeObjectURL(currentAudio.src);
            currentAudio = null;
            hideAudioPlaybackIndicator(); // Hide indicator when playback ends
            resolve();
        };
        currentAudio.onerror = (error) => {
            hideAudioPlaybackIndicator(); // Hide indicator on error
            reject(error);
        };
        currentAudio.play().catch((error) => {
            hideAudioPlaybackIndicator(); // Hide indicator if playback fails
            reject(error);
        });
    });
}

export function stopAudioPlayback() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        hideAudioPlaybackIndicator(); // Hide indicator when stopped manually
        currentAudio = null;
    }
}

export function clearAudioCache() {
    audioCache.forEach(url => URL.revokeObjectURL(url));
    audioCache.clear();
}

export async function handleNameRecording(audioBlob, apiKey) {
    console.log("Handling name recording...");
    const nameTranscript = await transcribeAudio(audioBlob, apiKey);
    if (nameTranscript) {
        return await extractFirstName(nameTranscript, apiKey);
    } else {
        throw new Error("Couldn't transcribe the name.");
    }
}

async function extractFirstName(fullName, apiKey) {
    console.log("Extracting first name...");
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
                    { role: "system", content: "Extract only the name from the given input. If there's no clear name, return the full input." },
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
