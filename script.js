import { CONFIG } from './config.js';
import * as apiInteractions from './apiInteractions.js';
import * as audioHandler from './audioHandler.js';
import * as uiManager from './uiManager.js';

let conversationStarted = false;
let userName = '';
let isPaused = false;

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.SAVE_SETTINGS_BUTTON, 'click', saveSettings);
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.START_BUTTON, 'click', startConversation);
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.STOP_BUTTON, 'click', stopRecording);
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.PAUSE_BUTTON, 'click', pauseConversation);
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.RESET_BUTTON, 'click', resetConversation);
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.ADD_RULE_BUTTON, 'click', addRule);
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.VIEW_RULES_BUTTON, 'click', viewNewRules);
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.SAVE_RULES_BUTTON, 'click', saveNewRules);
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.HIDE_RULES_BUTTON, 'click', hideNewRules);

    loadSettings();
    displayConversationHistory();
});

function saveSettings() {
    const apiKey = uiManager.getInputValue(CONFIG.UI_ELEMENTS.API_KEY_INPUT);
    const instanceName = uiManager.getInputValue(CONFIG.UI_ELEMENTS.INSTANCE_NAME_INPUT);
    const instancePassword = uiManager.getInputValue(CONFIG.UI_ELEMENTS.INSTANCE_PASSWORD_INPUT);
    const customerName = uiManager.getInputValue(CONFIG.UI_ELEMENTS.CUSTOMER_NAME_INPUT);

    if (apiKey && instanceName && instancePassword && customerName) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, apiKey);
        localStorage.setItem(CONFIG.STORAGE_KEYS.INSTANCE_NAME, instanceName);
        localStorage.setItem(CONFIG.STORAGE_KEYS.INSTANCE_PASSWORD, instancePassword);
        localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOMER_NAME, customerName);
        uiManager.updateStatus('Settings saved successfully!');
        uiManager.updateUIControls({ [CONFIG.UI_ELEMENTS.START_BUTTON]: true });
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
        uiManager.setInputValue(CONFIG.UI_ELEMENTS.API_KEY_INPUT, savedApiKey);
        uiManager.setInputValue(CONFIG.UI_ELEMENTS.INSTANCE_NAME_INPUT, savedInstanceName);
        uiManager.setInputValue(CONFIG.UI_ELEMENTS.INSTANCE_PASSWORD_INPUT, savedInstancePassword);
        uiManager.setInputValue(CONFIG.UI_ELEMENTS.CUSTOMER_NAME_INPUT, savedCustomerName);
        uiManager.updateUIControls({ [CONFIG.UI_ELEMENTS.START_BUTTON]: true });
    }

    uiManager.updateUIControls({
        [CONFIG.UI_ELEMENTS.STOP_BUTTON]: false,
        [CONFIG.UI_ELEMENTS.PAUSE_BUTTON]: false
    });
}

async function startConversation() {
    try {
        conversationStarted = false;
        userName = '';
        uiManager.updateTranscript('', ''); // Clear transcript
        uiManager.displayConversationHistory([]);

        const initialGreeting = "Hi, I'm Now Assist. To start off, please say your name.";
        uiManager.updateTranscript('NOW ASSIST', initialGreeting);
        addToConversationHistory(initialGreeting, 'NOW ASSIST');
        await respondWithSpeech(initialGreeting);

        uiManager.updateUIControls({
            [CONFIG.UI_ELEMENTS.START_BUTTON]: false,
            [CONFIG.UI_ELEMENTS.STOP_BUTTON]: true,
            [CONFIG.UI_ELEMENTS.PAUSE_BUTTON]: true
        });
        
        audioHandler.startRecording(onAudioDataAvailable);
    } catch (error) {
        console.error('Error in startConversation:', error);
        uiManager.updateStatus('Failed to start conversation. Please check console for details.');
    }
}

function onAudioDataAvailable(audioBlob) {
    handleAudioInput(audioBlob);
}

async function handleAudioInput(audioBlob) {
    const apiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
    
    if (!conversationStarted) {
        userName = await audioHandler.handleNameRecording(audioBlob, apiKey);
        addToConversationHistory(`My name is ${userName}`, userName);

        const acknowledgement = `Nice to meet you, ${userName}. How can I assist you today?`;
        uiManager.updateTranscript('NOW ASSIST', acknowledgement);
        addToConversationHistory(acknowledgement, 'NOW ASSIST');
        await respondWithSpeech(acknowledgement);

        conversationStarted = true;
    } else {
        const transcript = await apiInteractions.transcribeAudio(audioBlob, apiKey);
        if (transcript) {
            uiManager.updateTranscript(userName, transcript);
            addToConversationHistory(transcript, userName);
            const gpt4Response = await apiInteractions.processWithGPT4(
                transcript, 
                apiKey, 
                getConversationHistory(),
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

async function respondWithSpeech(text) {
    try {
        uiManager.updateStatus('Generating speech response...');
        const apiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
        const audioBlob = await apiInteractions.textToSpeech(text, apiKey);
        uiManager.updateStatus('Playing response...');
        await audioHandler.playAudio(audioBlob);
        uiManager.updateStatus('Response complete. Starting new recording...');
        if (!isPaused) {
            audioHandler.startRecording(onAudioDataAvailable);
        }
    } catch (error) {
        console.error('Error in respondWithSpeech:', error);
        uiManager.updateStatus('Error occurred during text-to-speech. Please check console for details.');
    }
}

function stopRecording() {
    audioHandler.stopRecording();
    uiManager.updateUIControls({ [CONFIG.UI_ELEMENTS.STOP_BUTTON]: false });
}

function pauseConversation() {
    isPaused = !isPaused;
    if (isPaused) {
        stopRecording();
        uiManager.updateStatus('Conversation paused.');
        uiManager.setInputValue(CONFIG.UI_ELEMENTS.PAUSE_BUTTON, 'Resume Conversation');
    } else {
        audioHandler.startRecording(onAudioDataAvailable);
        uiManager.updateStatus('Conversation resumed.');
        uiManager.setInputValue(CONFIG.UI_ELEMENTS.PAUSE_BUTTON, 'Pause Conversation');
    }
}

function resetConversation() {
    stopRecording();
    conversationStarted = false;
    userName = '';
    isPaused = false;

    localStorage.removeItem(CONFIG.STORAGE_KEYS.CONVERSATION_HISTORY);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CASE_OPENED);
    uiManager.displayConversationHistory([]);
    uiManager.updateTranscript('', '');

    uiManager.updateUIControls({
        [CONFIG.UI_ELEMENTS.START_BUTTON]: true,
        [CONFIG.UI_ELEMENTS.STOP_BUTTON]: false,
        [CONFIG.UI_ELEMENTS.PAUSE_BUTTON]: false
    });

    uiManager.updateStatus('Conversation has been reset. You can start a new conversation.');
}

function addToConversationHistory(text, role) {
    let history = getConversationHistory();
    history.push({ role, text });
    localStorage.setItem(CONFIG.STORAGE_KEYS.CONVERSATION_HISTORY, JSON.stringify(history));
    uiManager.displayConversationHistory(history);
}

function getConversationHistory() {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CONVERSATION_HISTORY)) || [];
}

function addRule() {
    const newRule = uiManager.getInputValue(CONFIG.UI_ELEMENTS.NEW_RULE_INPUT);
    if (newRule) {
        CONFIG.NEW_RULES.push(newRule);
        localStorage.setItem(CONFIG.STORAGE_KEYS.NEW_RULES, JSON.stringify(CONFIG.NEW_RULES));
        uiManager.updateStatus('New rule added successfully.');
        uiManager.setInputValue(CONFIG.UI_ELEMENTS.NEW_RULE_INPUT, '');
        viewNewRules();
    } else {
        uiManager.updateStatus('Please enter a valid rule.');
    }
}

function viewNewRules() {
    uiManager.updateTextareaContent(CONFIG.UI_ELEMENTS.RULES_TEXTAREA, CONFIG.NEW_RULES.join('\n'));
    uiManager.toggleElementVisibility(CONFIG.UI_ELEMENTS.RULES_EDITOR, true);
}

function saveNewRules() {
    const newRulesText = uiManager.getInputValue(CONFIG.UI_ELEMENTS.RULES_TEXTAREA);
    CONFIG.NEW_RULES = newRulesText.split('\n').filter(rule => rule.trim() !== '');
    localStorage.setItem(CONFIG.STORAGE_KEYS.NEW_RULES, JSON.stringify(CONFIG.NEW_RULES));
    uiManager.updateStatus('New rules updated successfully.');
}

function hideNewRules() {
    uiManager.toggleElementVisibility(CONFIG.UI_ELEMENTS.RULES_EDITOR, false);
    uiManager.updateStatus('New rules hidden.');
}

function displayConversationHistory() {
    const history = getConversationHistory();
    uiManager.displayConversationHistory(history);
}