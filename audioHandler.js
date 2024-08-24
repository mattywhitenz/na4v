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
    audioChunks = [];
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

    const audioURL = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioURL);

    showAudioPlaybackIndicator();

    currentAudio.onended = () => {
      hideAudioPlaybackIndicator();
      URL.revokeObjectURL(audioURL);
      resolve();
    };
    currentAudio.onerror = (error) => {
      hideAudioPlaybackIndicator();
      URL.revokeObjectURL(audioURL);
      reject(error);
    };
    currentAudio.play().catch((error) => {
      hideAudioPlaybackIndicator();
      URL.revokeObjectURL(audioURL);
      reject(error);
    });
  });
}

export function stopAudioPlayback() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        hideAudioPlaybackIndicator();
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
    // Implementation for extracting first name (you may need to adjust this based on your needs)
    return fullName.split(' ')[0];
}

export function cleanupAudioResources() {
  stopRecording();
  stopAudioPlayback();
  clearAudioCache();
}