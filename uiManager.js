import { CONFIG } from './config.js';

export function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.innerText = message;
    }
    console.log(message);
}

export function updateTranscript(role, text) {
    const transcriptElement = document.getElementById(CONFIG.UI_ELEMENTS.TRANSCRIPT);
    if (transcriptElement) {
        const messageElement = document.createElement('p');
        messageElement.className = role.toLowerCase();
        messageElement.innerText = `${role}: ${text}`;
        transcriptElement.appendChild(messageElement);
        transcriptElement.scrollTop = transcriptElement.scrollHeight;
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
        element.addEventListener(eventType, handler);
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