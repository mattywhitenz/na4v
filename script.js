import { CONFIG } from './config.js';
import * as apiInteractions from './apiInteractions.js';
import * as audioHandler from './audioHandler.js';
import * as uiManager from './uiManager.js';

let conversationState = 'idle';
let userName = '';
let currentAudioContext = null;

document.addEventListener('DOMContentLoaded', () => {
    uiManager.addEventListenerToElement('saveSettings', 'click', saveSettings);
    uiManager.addEventListenerToElement('addRule', 'click', addRule);
    uiManager.addEventListenerToElement('viewNewRules', 'click', viewNewRules);
    uiManager.addEventListenerToElement('saveNewRules', 'click', saveNewRules);
    uiManager.addEventListenerToElement('hideNewRules', 'click', hideNewRules);

    const conversationControlButton = document.getElementById(CONFIG.UI_ELEMENTS.CONVERSATION_CONTROL);
    conversationControlButton.addEventListener('click', () => {
        if (conversationState === 'idle') {
            startNewConversation();
        } else {
            resetConversation();
        }
    });

    const conversationStatusButton = document.getElementById(CONFIG.UI_ELEMENTS.CONVERSATION_STATUS);
    conversationStatusButton.addEventListener('click', handleConversationStatus);

    loadSettings();
    updateConversationUI();
});

function saveSettings() {
    const apiKey = uiManager.getInputValue('apiKey');
    const instanceName = uiManager.getInputValue('instanceName');
    const instancePassword = uiManager.getInputValue('instancePassword');
    const customerName = uiManager.getInputValue('customerName');

    if (apiKey && instanceName && instancePassword && customerName) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, apiKey);
        localStorage.setItem(CONFIG.STORAGE_KEYS.INSTANCE_NAME, instanceName);
        localStorage.setItem(CONFIG.STORAGE_KEYS.INSTANCE_PASSWORD, instancePassword);
        localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOMER_NAME, customerName);
        uiManager.updateStatus('Settings saved successfully!');
        uiManager.updateUIControls({ [CONFIG.UI_ELEMENTS.CONVERSATION_CONTROL]: true });
    } else {
        uiManager.updateStatus('Please enter all required fields.');
    }
}

function loadSettings() {
    const savedApiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
    const savedInstanceName = localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_NAME);
    const savedInstancePassword = localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_PASSWORD);
    const savedCustomerName = localStorage.getItem(CONFIG.STORAGE_KEYS.CUSTOMER_NAME);

    if (savedApiKey && savedInstanceName && savedInstancePassword && savedCustomerName) {
        uiManager.setInputValue('apiKey', savedApiKey);
        uiManager.setInputValue('instanceName', savedInstanceName);
        uiManager.setInputValue('instancePassword', savedInstancePassword);
        uiManager.setInputValue('customerName', savedCustomerName);
        uiManager.updateUIControls({ [CONFIG.UI_ELEMENTS.CONVERSATION_CONTROL]: true });
    }
}

function updateConversationUI() {
    const controlButton = document.getElementById(CONFIG.UI_ELEMENTS.CONVERSATION_CONTROL);
    const statusButton = document.getElementById(CONFIG.UI_ELEMENTS.CONVERSATION_STATUS);

    switch(conversationState) {
        case 'idle':
            controlButton.textContent = 'Start New Conversation';
            statusButton.textContent = '🛏️ Asleep';
            statusButton.disabled = true;
            break;
        case 'assistantTalking':
            controlButton.textContent = 'Reset Conversation';
            statusButton.textContent = '🗣️ Now Assist Talking';
            statusButton.disabled = true;
            break;
        case 'userTalking':
            controlButton.textContent = 'Reset Conversation';
            statusButton.textContent = '🔴 Talk... hit me when done';
            statusButton.disabled = false;
            break;
        case 'processing':
            controlButton.textContent = 'Reset Conversation';
            statusButton.textContent = '💭 Now Assist is thinking';
            statusButton.disabled = true;
            break;
    }
}

async function startNewConversation() {
    if (conversationState !== 'idle') {
        console.log("Conversation already in progress");
        return;
    }
    conversationState = 'assistantTalking';
    updateConversationUI();
    uiManager.clearTranscript();
    userName = '';
    const initialGreeting = "Hi, I'm Now Assist. To start off, please say your name.";
    uiManager.updateTranscript('NOW ASSIST', initialGreeting);
    try {
        await respondWithSpeech(initialGreeting);
    } catch (error) {
        console.error('Error in startNewConversation:', error);
        uiManager.updateStatus('Failed to start conversation. Please try again.');
        conversationState = 'idle';
        updateConversationUI();
    }
}

function resetConversation() {
    console.log("Resetting conversation");
    audioHandler.stopRecording();
    if (currentAudioContext) {
        currentAudioContext.close();
        currentAudioContext = null;
    }
    conversationState = 'idle';
    userName = '';
    uiManager.clearTranscript();
    updateConversationUI();
    uiManager.updateStatus('Conversation has been reset. You can start a new conversation.');
}

function handleConversationStatus() {
    if (conversationState === 'userTalking') {
        stopUserRecording();
    }
}

async function respondWithSpeech(text) {
    try {
        console.log("Starting respondWithSpeech function");
        uiManager.updateTranscript('NOW ASSIST', text);
        uiManager.updateStatus('Generating speech response...');
        const apiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
        console.log("API Key retrieved:", apiKey ? "Present" : "Missing");

        console.log("Calling textToSpeech function");
        const audioBlob = await apiInteractions.textToSpeech(text, apiKey);
        console.log("Audio blob received:", audioBlob ? "Present" : "Missing");

        uiManager.updateStatus('Playing response...');

        console.log("Calling playAudio function");
        await audioHandler.playAudio(audioBlob);

        console.log("Audio playback completed");
        uiManager.updateStatus('Response complete. You can speak now.');
        conversationState = 'userTalking';
        updateConversationUI();
        startRecording();
    } catch (error) {
        console.error('Detailed error in respondWithSpeech:', error);
        uiManager.updateStatus('Error occurred during speech synthesis. Please check console for details.');
        conversationState = 'idle';
        updateConversationUI();
    }
}

function startRecording() {
    audioHandler.startRecording(onAudioDataAvailable);
}

async function stopUserRecording() {
    audioHandler.stopRecording();
    conversationState = 'processing';
    updateConversationUI();
    uiManager.updateStatus('Processing your input...');
}

async function onAudioDataAvailable(audioBlob) {
    const apiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);

    if (!userName) {
        userName = await audioHandler.handleNameRecording(audioBlob, apiKey);
        uiManager.updateTranscript(userName, `My name is ${userName}`);
        const acknowledgement = `Nice to meet you, ${userName}. How can I assist you today?`;
        await respondWithSpeech(acknowledgement);
    } else {
        const transcript = await apiInteractions.transcribeAudio(audioBlob, apiKey);
        if (transcript) {
            uiManager.updateTranscript(userName, transcript);
            const gpt4Response = await apiInteractions.processWithGPT4(
                transcript, 
                apiKey, 
                uiManager.getConversationHistory(),
                userName,
                localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_NAME),
                localStorage.getItem(CONFIG.STORAGE_KEYS.CUSTOMER_NAME)
            );
            if (gpt4Response) {
                await respondWithSpeech(gpt4Response);
            }
        }
    }
}

function addRule() {
    const newRule = uiManager.getInputValue('newRule');
    if (newRule) {
        CONFIG.NEW_RULES.push(newRule);
        localStorage.setItem(CONFIG.STORAGE_KEYS.NEW_RULES, JSON.stringify(CONFIG.NEW_RULES));
        uiManager.updateStatus('New rule added successfully.');
        uiManager.setInputValue('newRule', '');
        viewNewRules();
    } else {
        uiManager.updateStatus('Please enter a valid rule.');
    }
}

function viewNewRules() {
    uiManager.updateTextareaContent('newRulesTextarea', CONFIG.NEW_RULES.join('\n'));
    uiManager.toggleElementVisibility('newRulesEditor', true);
}

function saveNewRules() {
    const newRulesText = uiManager.getInputValue('newRulesTextarea');
    CONFIG.NEW_RULES = newRulesText.split('\n').filter(rule => rule.trim() !== '');
    localStorage.setItem(CONFIG.STORAGE_KEYS.NEW_RULES, JSON.stringify(CONFIG.NEW_RULES));
    uiManager.updateStatus('New rules updated successfully.');
}

function hideNewRules() {
    uiManager.toggleElementVisibility('newRulesEditor', false);
}