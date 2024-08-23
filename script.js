import { CONFIG } from './config.js';
import * as apiInteractions from './apiInteractions.js';
import * as audioHandler from './audioHandler.js';
import * as uiManager from './uiManager.js';

let conversationState = 'idle';
let userName = '';
let isAudioPlaying = false;
let isRecording = false;
window.userName = '';

document.addEventListener('DOMContentLoaded', initializeApp);

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
        uiManager.updateUIControls({ [CONFIG.UI_ELEMENTS.CONVERSATION_CONTROL]: true });
    }
    toggleSettings(); // Hide settings after saving
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

    switch (conversationState) {
        case 'idle':
            controlButton.textContent = 'Start New Conversation';
            controlButton.disabled = false;
            statusButton.textContent = '🛏️ Asleep';
            statusButton.disabled = true;
            break;
        case 'assistantTalking':
            controlButton.textContent = 'Reset Conversation';
            controlButton.disabled = false;
            statusButton.textContent = '🗣️ Now Assist Talking...';
            statusButton.disabled = true;
            break;
        case 'userTalking':
            controlButton.textContent = 'Reset Conversation';
            controlButton.disabled = false;
            statusButton.textContent = '🛑 Stop';
            statusButton.disabled = false;
            break;
        case 'processing':
            controlButton.textContent = 'Reset Conversation';
            controlButton.disabled = false;
            statusButton.textContent = '🧠 Thinking...';
            statusButton.disabled = true;
            break;
    }
}

async function handleConversationControl() {
    try {
        if (conversationState === 'idle') {
            await startNewConversation();
        } else {
            await resetConversation();
        }
    } catch (error) {
        console.error('Error in handleConversationControl:', error);
        uiManager.showErrorMessage('general', error.message);
    }
}

async function startNewConversation() {
    if (conversationState !== 'idle') {
        console.log("Conversation already in progress");
        return;
    }
    conversationState = 'assistantTalking';
    isRecording = false;
    updateConversationUI();
    uiManager.clearTranscript();
    userName = '';
    const initialGreeting = "Hi, I'm Now Assist. To start off, please say your name.";

    try {
        uiManager.updateTranscript('🟢', initialGreeting);
        await respondWithSpeech(initialGreeting);
    } catch (error) {
        console.error('Error in startNewConversation:', error);
        uiManager.showErrorMessage('general', error.message);
        await resetConversation();
    }
}

async function resetConversation() {
    console.log("Resetting conversation");

    try {
        if (audioHandler.isCurrentlyRecording()) {
            audioHandler.stopRecording();
        }

        audioHandler.stopAudioPlayback();
        audioHandler.clearAudioCache();
        await apiInteractions.cancelOngoingRequests();

        conversationState = 'idle';
        window.userName = '';
        isAudioPlaying = false;
        isRecording = false;

        uiManager.clearTranscript();
        updateConversationUI();
    } catch (error) {
        console.error('Error during conversation reset:', error);
        uiManager.showErrorMessage('general', error.message);
    }
}

function handleConversationStatus() {
    if (conversationState === 'userTalking') {
        if (audioHandler.isCurrentlyRecording()) {
            audioHandler.stopRecording();
            isRecording = false;
            updateConversationUI();
        }
    }
}

async function respondWithSpeech(text) {
  try {
    console.log("Starting respondWithSpeech function");
    conversationState = 'assistantTalking';
    updateConversationUI();

    const apiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
    console.log("API Key retrieved:", apiKey ? "Present" : "Missing");

    console.log("Calling textToSpeech function");
    const audioBlob = await apiInteractions.textToSpeech(text, apiKey);
    if (!audioBlob) {
      console.log("No audio blob received, likely due to request cancellation.");
      return;
    }

    console.log("Audio blob received:", audioBlob ? "Present" : "Missing");

    console.log("Calling playAudio function");
    isAudioPlaying = true;
    await audioHandler.playAudio(audioBlob);
    isAudioPlaying = false;

    console.log("Audio playback completed");
  } catch (error) {
    console.error('Detailed error in respondWithSpeech:', error);
    uiManager.showErrorMessage('general', error.message);
    await resetConversation();
  } finally {
        if (conversationState === 'assistantTalking') {
            conversationState = 'userTalking';
            updateConversationUI();
            startRecording();
        }
    }
}

function startRecording() {
    if (!audioHandler.isCurrentlyRecording()) {
        audioHandler.startRecording(onAudioDataAvailable);
        isRecording = true;
        conversationState = 'userTalking';
        updateConversationUI();
        console.log("Recording started in startRecording function");
    } else {
        console.log("Already recording, startRecording function skipped");
    }
}

async function onAudioDataAvailable(audioBlob) {
    console.log("onAudioDataAvailable called");
    const apiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
    if (!apiKey) {
        console.error('API key is missing');
        uiManager.showErrorMessage('apiKeyMissing');
        await resetConversation();
        return;
    }

    conversationState = 'processing';
    updateConversationUI();

    try {
        console.log("Current userName:", window.userName);
        if (!window.userName) {
            console.log("Attempting to handle name recording");
            window.userName = await audioHandler.handleNameRecording(audioBlob, apiKey);
            console.log("Extracted userName:", window.userName);
            if (!window.userName) throw new Error('Failed to extract name');
            uiManager.updateTranscript('👤', `My name is ${window.userName}`);
            const acknowledgement = `Nice to meet you, ${window.userName}. How can I assist you today?`;
            uiManager.updateTranscript('🟢', acknowledgement);
            await respondWithSpeech(acknowledgement);
        } else {
            const userInput = await apiInteractions.transcribeAudio(audioBlob, apiKey);
            if (!userInput) throw new Error('Failed to transcribe audio');
            uiManager.updateTranscript('👤', userInput);

            const assistantResponse = await apiInteractions.processWithGPT4(userInput, apiKey, uiManager.getConversationHistory(), window.userName, localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_NAME), localStorage.getItem(CONFIG.STORAGE_KEYS.CUSTOMER_NAME));
            if (!assistantResponse) throw new Error('Failed to get assistant response');

            if (assistantResponse.startsWith("CONVERSATION_END")) {
                uiManager.updateTranscript('🟢', assistantResponse.substring("CONVERSATION_END".length).trim());
                await respondWithSpeech(assistantResponse.substring("CONVERSATION_END".length).trim());
                await resetConversation();
                return;
            }

            // Always trigger the case creation process
            const openCaseMessage = "OK - let me open a case for you now. I'll need a few moments to get that started.";
            uiManager.updateTranscript('🟢', openCaseMessage);
            await respondWithSpeech(openCaseMessage);

            const randomEmail = await apiInteractions.generateRandomEmail(apiKey);
            console.log("Generated random email:", randomEmail);

            // Create user record
            try {
                const instanceName = localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_NAME);
                const newUser = await apiInteractions.createUser(randomEmail);
                console.log("Created new user:", newUser);

                // Get the full transcript
                const fullTranscript = uiManager.getConversationHistory().map(item => `${item.role}: ${item.text}`).join('\n');

                // Generate required data for interaction and HR case
                const shortDescription = await apiInteractions.generateShortDescription(fullTranscript, apiKey);
                const translatedTranscript = await apiInteractions.translateToEnglish(fullTranscript, apiKey);
                const chatSummary = await apiInteractions.generateChatSummary(translatedTranscript, apiKey);

                // Create interaction
                const interactionData = {
                    short_description: shortDescription,
                    chat_summary: chatSummary,
                    opened_for: newUser.result.sys_id,
                    type: 'Phone',
                    opened_by: newUser.result.sys_id,
                    state: 'work_in_progress',
                    assigned_to: 'b238bae2c3b38290071d9bbeb001314f',
                    calling_number: randomEmail,
                    transcript: translatedTranscript
                };

                const createdInteraction = await apiInteractions.createInteraction(interactionData);
                console.log("Created interaction:", createdInteraction);

                // Create HR Case
                const hrCaseData = {
                    short_description: shortDescription,
                    description: chatSummary,
                    opened_for: newUser.result.sys_id,
                    hr_service: '6628cde49f331200d9011976777fcf0b',
                    subject_person: newUser.result.sys_id,
                    state: 'ready',
                    assigned_to: '4990c2c8dbae4b00ae3e9646db961940',
                    contact_type: 'Phone'
                };

                const createdHRCase = await apiInteractions.createHRCase(hrCaseData);
                console.log("Created HR Case:", createdHRCase);

                // Create Related Interaction Record
                const relatedRecordData = {
                    document_table: 'sn_hr_core_case',
                    document_id: createdHRCase.result.sys_id,
                    interaction: createdInteraction.result.sys_id
                };

                const createdRelatedRecord = await apiInteractions.createRelatedInteractionRecord(relatedRecordData);
                console.log("Created Related Interaction Record:", createdRelatedRecord);

                // Get HR Case Details
                const hrCaseDetails = await apiInteractions.getHRCaseDetails(createdHRCase.result.sys_id);
                console.log("Retrieved HR Case Details:", hrCaseDetails);

                const caseOpenedMessage = `I've opened that case for you, ${window.userName} - for your reference, the case number is ${hrCaseDetails.result.number}. I'll send that to you now. What else can I do for you today?`;
                uiManager.updateTranscript('🟢', caseOpenedMessage);
                await respondWithSpeech(caseOpenedMessage);

            } catch (error) {
                console.error('Error in case creation process:', error);
                const errorMessage = "I'm sorry, there was an error opening the case. Please try again later.";
                uiManager.updateTranscript('🟢', errorMessage);
                await respondWithSpeech(errorMessage);
            }

            // Continue with the conversation
            uiManager.updateTranscript('🟢', assistantResponse);
            await respondWithSpeech(assistantResponse);
        }
    } catch (error) {
        console.error('Detailed error in onAudioDataAvailable:', error);
        uiManager.showErrorMessage('general', error.message);
        await resetConversation();
    } finally {
        if (conversationState === 'processing') {
            conversationState = 'userTalking';
            updateConversationUI();
        }
    }
}

function toggleSettings() {
    const settingsElement = document.getElementById('settings');
    const showSettingsButton = document.getElementById('showSettings');
    if (settingsElement.classList.contains('hidden')) {
        settingsElement.classList.remove('hidden');
        showSettingsButton.classList.add('hidden');
    } else {
        settingsElement.classList.add('hidden');
        showSettingsButton.classList.remove('hidden');
    }
}

function toggleRulesEditor() {
    const rulesEditor = document.getElementById('newRulesEditor');
    const rulesTextarea = document.getElementById('newRulesTextarea');

    if (rulesEditor.classList.contains('hidden')) {
        rulesEditor.classList.remove('hidden');
        rulesTextarea.value = localStorage.getItem(CONFIG.STORAGE_KEYS.NEW_RULES) || '';
    } else {
        rulesEditor.classList.add('hidden');
    }
}

function saveNewRules() {
    const rulesTextarea = document.getElementById('newRulesTextarea');
    localStorage.setItem(CONFIG.STORAGE_KEYS.NEW_RULES, rulesTextarea.value);
    CONFIG.NEW_RULES = rulesTextarea.value.split('\n').filter(rule => rule.trim() !== '');
    alert('Rules saved successfully!');
}

// Modify the initializeApp function to include new event listeners
function initializeApp() {
    attachEventListeners();
    loadSettings();
    updateConversationUI();
}

function attachEventListeners() {
    uiManager.addEventListenerToElement('saveSettings', 'click', saveSettings);
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.CONVERSATION_CONTROL, 'click', handleConversationControl);
    uiManager.addEventListenerToElement(CONFIG.UI_ELEMENTS.CONVERSATION_STATUS, 'click', handleConversationStatus);
    uiManager.addEventListenerToElement('showSettings', 'click', toggleSettings);
        uiManager.addEventListenerToElement('viewNewRules', 'click', toggleRulesEditor);
        uiManager.addEventListenerToElement('saveNewRules', 'click', saveNewRules);
        uiManager.addEventListenerToElement('hideNewRules', 'click', toggleRulesEditor);
    }