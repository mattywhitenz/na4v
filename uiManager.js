import { CONFIG } from './config.js';

let fullTranscript = [];

export function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.innerText = message;
    }
    console.log(message);
}

export function updateTranscript(role, text) {
    console.log('Updating transcript:', role, text);
    const transcriptElement = document.getElementById(CONFIG.UI_ELEMENTS.TRANSCRIPT);
    const transcriptContainer = document.getElementById('transcript-container');

    if (transcriptElement && transcriptContainer) {
        const messageElement = document.createElement('p');
        messageElement.className = role.toLowerCase();

        const speakerName = role === '🟢' ? 'Now Assist' : (window.userName || 'User');
        const displayName = speakerName.split(' ')[0];
        messageElement.textContent = `${role} ${displayName}: ${text}`;

        transcriptElement.appendChild(messageElement);
        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;

        // Store full transcript for case creation
        fullTranscript.push({
            role: role === '🟢' ? 'Now Assist' : window.userName,
            text: text
        });
    } else {
        console.error('Transcript element or container not found');
    }
}

export function clearTranscript() {
    const transcriptElement = document.getElementById(CONFIG.UI_ELEMENTS.TRANSCRIPT);
    if (transcriptElement) {
        transcriptElement.innerHTML = '';
    }
    fullTranscript = [];
}

export function updateUIControls(controls) {
    for (const [id, state] of Object.entries(controls)) {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = !state;
        }
    }
}

export function getInputValue(elementId) {
    const input = document.getElementById(elementId);
    return input ? input.value : '';
}

export function setInputValue(elementId, value) {
    const input = document.getElementById(elementId);
    if (input) {
        input.value = value;
    }
}

export function addEventListenerToElement(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(eventType, handler);
    }
}

export function getConversationHistory() {
    return fullTranscript;
}

export function showAudioPlaybackIndicator() {
    const statusElement = document.getElementById('audioStatus');
    if (statusElement) {
        statusElement.style.display = 'block';
        statusElement.innerText = 'Playing audio...';
    }
}

export function hideAudioPlaybackIndicator() {
    const statusElement = document.getElementById('audioStatus');
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

export function showErrorMessage(errorType, details = '') {
    let message = 'An error occurred.';
    switch (errorType) {
        case 'network':
            message = 'Network error: Please check your internet connection.';
            break;
        case 'apiKeyMissing':
            message = 'API key missing: Please enter your OpenAI API key in the settings.';
            break;
        case 'server':
            message = 'Server error: There was a problem connecting to the server. Please try again later.';
            break;
        case 'credentialsMissing':
            message = 'Credentials missing: Please ensure all required fields are filled in the settings.';
            break;
        case 'caseCreationError':
            message = 'Error creating case: There was a problem creating the case. Please try again.';
            break;
        default:
            message += ` Details: ${details}`;
    }
    updateStatus(message);
}