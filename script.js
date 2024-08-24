import { CONFIG } from './config.js';
import * as apiInteractions from './apiInteractions.js';
import * as audioHandler from './audioHandler.js';
import * as uiManager from './uiManager.js';
import { appState } from './state.js';

document.addEventListener('DOMContentLoaded', initializeApp);

async function saveSettings() {
  const apiKey = uiManager.getInputValue('apiKey');
  const instanceName = uiManager.getInputValue('instanceName');
  const instanceUsername = uiManager.getInputValue('instanceUsername');
  const instancePassword = uiManager.getInputValue('instancePassword');
  const customerName = uiManager.getInputValue('customerName');

  if (apiKey && instanceName && instanceUsername && instancePassword && customerName) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, apiKey);
    localStorage.setItem(CONFIG.STORAGE_KEYS.INSTANCE_NAME, instanceName);
    localStorage.setItem(CONFIG.STORAGE_KEYS.INSTANCE_USERNAME, instanceUsername);
    localStorage.setItem(CONFIG.STORAGE_KEYS.INSTANCE_PASSWORD, instancePassword);
    localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOMER_NAME, customerName);

    try {
      const response = await fetch('/update-env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          SN_INSTANCE: instanceName,
          SN_USERNAME: instanceUsername,
          SN_PASSWORD: instancePassword
        })
      });
      const data = await response.json();
      console.log(data.message);
    } catch (error) {
      console.error('Error updating environment variables:', error);
    }

    uiManager.updateUIControls({ [CONFIG.UI_ELEMENTS.CONVERSATION_CONTROL]: true });
  }
  toggleSettings();
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

  switch (appState.conversationState) {
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
    if (appState.conversationState === 'idle') {
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
  if (appState.conversationState !== 'idle') {
    console.log("Conversation already in progress");
    return;
  }
  appState.setConversationState('assistantTalking');
  appState.setIsRecording(false);
  updateConversationUI();
  uiManager.clearTranscript();
  appState.setUserName('');
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
    audioHandler.cleanupAudioResources();
    await apiInteractions.cancelOngoingRequests();

    appState.reset();
    updateConversationUI();
    uiManager.clearTranscript();
  } catch (error) {
    console.error('Error during conversation reset:', error);
    uiManager.showErrorMessage('general', error.message);
  }
}

async function handleConversationStatus() {
  if (appState.conversationState === 'userTalking') {
    if (audioHandler.isCurrentlyRecording()) {
      await audioHandler.stopRecording();
      appState.setIsRecording(false);
      updateConversationUI();
    }
  }
}

async function respondWithSpeech(text) {
  try {
    console.log("Starting respondWithSpeech function");
    appState.setConversationState('assistantTalking');
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
    appState.setIsAudioPlaying(true);
    await audioHandler.playAudio(audioBlob);
    appState.setIsAudioPlaying(false);

    console.log("Audio playback completed");
  } catch (error) {
    console.error('Detailed error in respondWithSpeech:', error);
    uiManager.showErrorMessage('general', error.message);
    await resetConversation();
  } finally {
    if (appState.conversationState === 'assistantTalking') {
      appState.setConversationState('userTalking');
      updateConversationUI();
      await startRecording();
    }
  }
}

async function startRecording() {
  if (!audioHandler.isCurrentlyRecording()) {
    try {
      await audioHandler.startRecording(onAudioDataAvailable);
      appState.setIsRecording(true);
      appState.setConversationState('userTalking');
      updateConversationUI();
      console.log("Recording started in startRecording function");
    } catch (error) {
      console.error('Error starting recording:', error);
      uiManager.showErrorMessage('general', error.message);
    }
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

  appState.setConversationState('processing');
  updateConversationUI();

  try {
    console.log("Current userName:", appState.userName);
    if (!appState.userName) {
      console.log("Attempting to handle name recording");
      const extractedName = await audioHandler.handleNameRecording(audioBlob, apiKey);
      console.log("Extracted userName:", extractedName);
      if (!extractedName) throw new Error('Failed to extract name');
      appState.setUserName(extractedName);
      uiManager.updateTranscript('👤', `My name is ${appState.userName}`);
      const acknowledgement = `Nice to meet you, ${appState.userName}. How can I assist you today?`;
      uiManager.updateTranscript('🟢', acknowledgement);
      await respondWithSpeech(acknowledgement);
    } else {
      const userInput = await apiInteractions.transcribeAudio(audioBlob, apiKey);
      if (!userInput) throw new Error('Failed to transcribe audio');
      uiManager.updateTranscript('👤', userInput);

      const assistantResponse = await apiInteractions.processWithGPT4(userInput, apiKey, uiManager.getConversationHistory(), appState.userName, localStorage.getItem(CONFIG.STORAGE_KEYS.INSTANCE_NAME), localStorage.getItem(CONFIG.STORAGE_KEYS.CUSTOMER_NAME));
      if (!assistantResponse) throw new Error('Failed to get assistant response');

      if (assistantResponse.startsWith("CONVERSATION_END")) {
        uiManager.updateTranscript('🟢', assistantResponse.substring("CONVERSATION_END".length).trim());
        await respondWithSpeech(assistantResponse.substring("CONVERSATION_END".length).trim());
        await resetConversation();
        return;
      }

      if (userInput.toLowerCase().includes('open a case') || assistantResponse.toLowerCase().includes('open a case')) {
        const openCaseMessage = "OK - let me open a case for you now. I'll need a few moments to get that started.";
        uiManager.updateTranscript('🟢', openCaseMessage);
        await respondWithSpeech(openCaseMessage);

        const fullTranscript = uiManager.getConversationHistory().map(item => `${item.role}: ${item.text}`).join('\n');
        const shortDescription = await apiInteractions.generateShortDescription(fullTranscript, apiKey);
        const caseSummary = await apiInteractions.generateChatSummary(fullTranscript, apiKey);

        const [firstName, ...lastNameParts] = appState.userName.split(' ');
        const lastName = lastNameParts.join(' ');

        const userDetails = {
          firstName: firstName,
          lastName: lastName || 'Unknown',
          shortDescription: shortDescription,
          description: caseSummary
        };

        await createCase(userDetails);
      }

      uiManager.updateTranscript('🟢', assistantResponse);
      await respondWithSpeech(assistantResponse);
    }
  } catch (error) {
    console.error('Detailed error in onAudioDataAvailable:', error);
    uiManager.showErrorMessage('general', error.message);
    await resetConversation();
  } finally {
    if (appState.conversationState === 'processing') {
      appState.setConversationState('userTalking');
      updateConversationUI();
    }
  }
}

async function createCase(userDetails) {
  try {
    const response = await fetch('/create-case', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userDetails)
    });

    if (!response.ok) {
      throw new Error('Failed to create case');
    }

    const result = await response.json();
    console.log('Case created:', result);

    const caseCreatedMessage = `I've created a case for you. Your case number is ${result.hrCase.number}. Is there anything else I can help you with?`;
    uiManager.updateTranscript('🟢', caseCreatedMessage);
    await respondWithSpeech(caseCreatedMessage);

  } catch (error) {
    console.error('Error creating case:', error);
    uiManager.showErrorMessage('caseCreationError', error.message);
    const errorMessage = "I'm sorry, there was an error creating your case. Please try again later or contact support.";
    uiManager.updateTranscript('🟢', errorMessage);
    await respondWithSpeech(errorMessage);
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