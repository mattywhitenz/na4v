import { CONFIG } from './config.js';

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
        messageElement.textContent = `${speakerName}: ${text}`;

        transcriptElement.appendChild(messageElement);

        // Scroll to the bottom of the container
        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    } else {
        console.error('Transcript element or container not found');
    }
}

export function clearTranscript() {
    const transcriptElement = document.getElementById(CONFIG.UI_ELEMENTS.TRANSCRIPT);
    if (transcriptElement) {
        transcriptElement.innerHTML = '';
    }
}

export function updateUIControls(controls) {
    for (const [id, state] of Object.entries(controls)) {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = !state;
        }
    }
}

export function toggleElementVisibility(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

export function updateTextareaContent(elementId, content) {
    const textarea = document.getElementById(elementId);
    if (textarea) {
        textarea.value = content;
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
        element.addEventListener(eventType, async (event) => {
            try {
                await handler(event);
            } catch (error) {
                console.error(`Error in event handler for ${elementId}:`, error);
            }
        });
    }
}

export function getConversationHistory() {
    const transcriptElement = document.getElementById(CONFIG.UI_ELEMENTS.TRANSCRIPT);
    if (transcriptElement) {
        return Array.from(transcriptElement.children).map(child => ({
            role: child.className,
            text: child.innerText.split(': ')[1]
        }));
    }
    return [];
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

export function showLoadingIndicator() {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.innerHTML = `<div class="loading-spinner"></div> Processing...`;
    }
}

export function hideLoadingIndicator() {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.innerHTML = '';  // Clear the loading message
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
        default:
            message += ` Details: ${details}`;
    }
    updateStatus(message);
}
