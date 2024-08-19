import { CONFIG } from './config.js';

export function updateStatus(message) {
    const statusElement = document.getElementById(CONFIG.UI_ELEMENTS.STATUS);
    if (statusElement) {
        statusElement.innerText = message;
    }
    console.log(message);
}

export function displayConversationHistory(history) {
    const historyDiv = document.getElementById(CONFIG.UI_ELEMENTS.CONVERSATION_HISTORY);
    if (historyDiv) {
        historyDiv.innerHTML = '';
        history.forEach((item, index) => {
            const p = document.createElement('p');
            p.innerText = `${index + 1}. ${item.role}: ${item.text}`;
            historyDiv.appendChild(p);
        });
    }
}

export function updateTranscript(role, text) {
    const transcriptElement = document.getElementById(CONFIG.UI_ELEMENTS.TRANSCRIPT);
    if (transcriptElement) {
        transcriptElement.innerText += `\n${role}: ${text}`;
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