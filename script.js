let SUPER_PROMPT = `- You are Now Assist. Assume the message thread below with your prior responses as tagged below
- You are engaging with a user. See their name below.
- Please refer to them as necessary.
- If the user asks for their leave balance they have 11.5 days of annual leave, 5 long service leave days, and 42.2 carers leave days. 
If they ask for any of these, ask them after if they'd like to open a leave request.
- If the user wants to open an enquiry about their pay or device or anything like that, ask them a couple of clarifying questions - but only one at a time. 
Then ask them if you'd like to have you open a case for them.
- If the user wants to Reset their Password, ask them to confirm if they want you to reset their password or send instructions. 
If they say yes, then say - 'OK, an SMS has been sent to your mobile with instructions on the next steps'.
- If they user wants to get instructions on resetting their MFA or Multi-Factor Authentication, say ok, and that you'll send instructions 
to their mobile with a step-by-step guide. If they need further guidance, you can also connect them to a live agent.
- Do not respond with your name or quotation marks. Just the text for your response in the next sentence.
- Always respond in English unless you're certain the user has spoken to you in a different language. If they use a different language, respond in that language.
- If the user asks any question outside of the above, say "I can't find anything to help with that. Do you want me to open a case for you? 
Please say "open a case" if you'd like me to go ahead".
- DO NOT EVER TELL THE USER to access any PUBLIC WEBSITE or URL.
`;

let NEW_RULES = [];

function addRule() {
    const newRule = document.getElementById('newRule').value;
    if (newRule) {
        NEW_RULES.push(newRule);
        localStorage.setItem('newRules', JSON.stringify(NEW_RULES));
        updateStatus('New rule added successfully.');
        document.getElementById('newRule').value = '';
        viewNewRules();
    } else {
        updateStatus('Please enter a valid rule.');
    }
}

function viewNewRules() {
    const newRulesTextarea = document.getElementById('newRulesTextarea');
    newRulesTextarea.value = NEW_RULES.join('\n');
    document.getElementById('newRulesEditor').style.display = 'block';
}

function saveNewRules() {
    const newRulesTextarea = document.getElementById('newRulesTextarea');
    NEW_RULES = newRulesTextarea.value.split('\n').filter(rule => rule.trim() !== '');
    localStorage.setItem('newRules', JSON.stringify(NEW_RULES));
    updateStatus('New rules updated successfully.');
}

function hideNewRules() {
    document.getElementById('newRulesEditor').style.display = 'none';
    updateStatus('New rules hidden.');
}

function loadRules() {
    const savedRules = localStorage.getItem('newRules');
    if (savedRules) {
        NEW_RULES = JSON.parse(savedRules);
    }
}

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB in bytes

// Global variables
let mediaRecorder;
let isRecording = false;
let apiKey = '';
let userName = '';
let conversationStarted = false;
let audioChunks = [];
let recordingStream;
let currentAudio;
let instanceName = '';
let instancePassword = '';
let customerName = '';
let isPaused = false;

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('startConversation').addEventListener('click', startConversation);
    document.getElementById('stopRecording').addEventListener('click', stopRecording);
    document.getElementById('pauseConversation').addEventListener('click', pauseConversation);
    document.getElementById('resetConversation').addEventListener('click', resetConversation);
        document.getElementById('addRule').addEventListener('click', addRule);
        document.getElementById('viewNewRules').addEventListener('click', viewNewRules);
        document.getElementById('saveNewRules').addEventListener('click', saveNewRules);
        document.getElementById('hideNewRules').addEventListener('click', hideNewRules);
    });

// Utility functions
function updateStatus(message) {
    document.getElementById('status').innerText = message;
    console.log(message);
}

function saveSettings() {
    apiKey = document.getElementById('apiKey').value;
    instanceName = document.getElementById('instanceName').value;
    instancePassword = document.getElementById('instancePassword').value;
    customerName = document.getElementById('customerName').value;

    if (apiKey && instanceName && instancePassword && customerName) {
        localStorage.setItem('openaiApiKey', apiKey);
        localStorage.setItem('instanceName', instanceName);
        localStorage.setItem('instancePassword', instancePassword);
        localStorage.setItem('customerName', customerName);
        updateStatus('Settings saved successfully!');
        document.getElementById('startConversation').disabled = false;
    } else {
        updateStatus('Please enter all required fields.');
    }
}

function addRule() {
    const newRule = document.getElementById('newRule').value;
    if (newRule) {
        SUPER_PROMPT += "\n" + newRule;
        localStorage.setItem('superPrompt', SUPER_PROMPT);
        updateStatus('New rule added to SUPER_PROMPT.');
        document.getElementById('newRule').value = '';
        viewRules();
    } else {
        updateStatus('Please enter a valid rule.');
    }
}

function viewRules() {
    const rulesTextarea = document.getElementById('rulesTextarea');
    rulesTextarea.value = SUPER_PROMPT;
    document.getElementById('rulesEditor').style.display = 'block';
}

function saveRules() {
    const rulesTextarea = document.getElementById('rulesTextarea');
    SUPER_PROMPT = rulesTextarea.value;
    localStorage.setItem('superPrompt', SUPER_PROMPT);
    updateStatus('Rules updated successfully.');
}

function hideRules() {
    document.getElementById('rulesEditor').style.display = 'none';
    updateStatus('Rules hidden.');
}

function loadRules() {
    const savedRules = localStorage.getItem('superPrompt');
    if (savedRules) {
        SUPER_PROMPT = savedRules;
    }
}
async function analyzeIntent(conversationHistory) {
    const lastUserMessage = conversationHistory
        .filter(item => item.role.toLowerCase() === userName.toLowerCase())
        .pop();

    if (!lastUserMessage) {
        return "NO";
    }

    const promptForAnalysis = `You need to look for the phrase "open a case" or "open a ticket", or that the user, ${userName}, in the **last message of the thread** they've sent in context of the previous message from Now Assist - indicating they want a case opened, a ticket, or "follow up from HR". If that intent is in there ONLY IN THE LAST 2 SENTENCES then respond with "YES". If it isn't, respond with "NO". No other text except "YES" or "NO". *****do this only once - if you've opened a case, don't do it again - politely end the call when it seems natural*****
Here's the text to analyse: "${lastUserMessage.text}"`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: promptForAnalysis },
                    { role: "user", content: lastUserMessage.text }
                ],
                max_tokens: 10
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim().toUpperCase();

        return result === "YES" ? "YES" : "NO";
    } catch (error) {
        console.error('Error in analyzeIntent:', error);
        return "NO";
    }
}

function resetConversation() {
    if (isRecording) {
        stopRecording();
    }
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
    }
    mediaRecorder = null;
    isRecording = false;
    userName = '';
    conversationStarted = false;
    audioChunks = [];
    recordingStream = null;
    currentAudio = null;
    isPaused = false;

    localStorage.removeItem('conversationHistory');
    localStorage.removeItem('caseOpened');
    document.getElementById('conversationHistory').innerHTML = '';
    document.getElementById('transcript').innerText = '';

    document.getElementById('startConversation').disabled = false;
    document.getElementById('stopRecording').disabled = true;
    document.getElementById('pauseConversation').disabled = true;

    updateStatus('Conversation has been reset. You can start a new conversation.');
}

window.onload = function() {
    const savedApiKey = localStorage.getItem('openaiApiKey');
    const savedInstanceName = localStorage.getItem('instanceName');
    const savedInstancePassword = localStorage.getItem('instancePassword');
    const savedCustomerName = localStorage.getItem('customerName');

    if (savedApiKey && savedInstanceName && savedInstancePassword && savedCustomerName) {
        apiKey = savedApiKey;
        instanceName = savedInstanceName;
        instancePassword = savedInstancePassword;
        customerName = savedCustomerName;

        document.getElementById('apiKey').value = savedApiKey;
        document.getElementById('instanceName').value = savedInstanceName;
        document.getElementById('instancePassword').value = savedInstancePassword;
        document.getElementById('customerName').value = savedCustomerName;

        document.getElementById('startConversation').disabled = false;
    }

    document.getElementById('stopRecording').disabled = true;
    document.getElementById('pauseConversation').disabled = true;
    displayConversationHistory();

    document.getElementById('rulesEditor').style.display = 'none';
    loadRules();
};

async function startConversation() {
    try {
        console.log("Starting conversation...");
        conversationStarted = false;
        userName = '';
        document.getElementById('transcript').innerText = '';
        document.getElementById('conversationHistory').innerHTML = '';

        const initialGreeting = "Hi, I'm Now Assist. To start off, please say your name.";
        console.log("Initial greeting:", initialGreeting);
        document.getElementById('transcript').innerText = `NOW ASSIST: ${initialGreeting}`;
        addToConversationHistory(initialGreeting, 'NOW ASSIST');
        await respondWithSpeech(initialGreeting);

        document.getElementById('startConversation').disabled = true;
        document.getElementById('stopRecording').disabled = false;
        document.getElementById('pauseConversation').disabled = false;
        console.log("Conversation started successfully");
    } catch (error) {
        console.error('Error in startConversation:', error);
        updateStatus('Failed to start conversation. Please check console for details.');
    }
}

async function startRecording() {
    try {
        if (!navigator.mediaDevices) {
            updateStatus('Your browser does not support audio recording.');
            return;
        }

        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(recordingStream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstart = () => {
            isRecording = true;
            updateStatus('Recording started...');
        };

        mediaRecorder.onstop = async () => {
            isRecording = false;
            updateStatus('Recording stopped. Processing audio...');

            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

            if (audioBlob.size > MAX_AUDIO_SIZE) {
                updateStatus('Audio file too large. Maximum size is 25 MB.');
                return;
            }

            if (!conversationStarted) {
                await handleNameRecording(audioBlob);
            } else {
                await handleConversationRecording(audioBlob);
            }
        };

        mediaRecorder.start();
    } catch (error) {
        console.error('Error starting recording:', error);
        updateStatus('Failed to start recording. Please check console for details.');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recordingStream.getTracks().forEach(track => track.stop());
    }
}

function pauseConversation() {
    isPaused = !isPaused;
    if (isPaused) {
        if (isRecording) {
            stopRecording();
        }
        if (currentAudio) {
            currentAudio.pause();
        }
        updateStatus('Conversation paused.');
        document.getElementById('pauseConversation').textContent = 'Resume Conversation';
    } else {
        startRecording();
        if (currentAudio) {
            currentAudio.play();
        }
        updateStatus('Conversation resumed.');
        document.getElementById('pauseConversation').textContent = 'Pause Conversation';
    }
}

async function handleNameRecording(audioBlob) {
    const nameTranscript = await transcribeAudio(audioBlob, true);
    if (nameTranscript) {
        userName = await extractFirstName(nameTranscript);
        addToConversationHistory(`My name is ${userName}`, userName);

        const acknowledgement = `Nice to meet you, ${userName}. How can I assist you today?`;
        document.getElementById('transcript').innerText += `\nNOW ASSIST: ${acknowledgement}`;
        addToConversationHistory(acknowledgement, 'NOW ASSIST');
        await respondWithSpeech(acknowledgement);

        conversationStarted = true;
    } else {
        userName = "User";
        addToConversationHistory("The user's name couldn't be transcribed.", 'SYSTEM');
        updateStatus("Couldn't get your name. Let's continue with the conversation.");
    }
}

async function extractFirstName(fullName) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "Extract only the first name from the given input. If there's no clear first name, return the full input." },
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

async function handleConversationRecording(audioBlob) {
    const transcript = await transcribeAudio(audioBlob);
    if (transcript) {
        const gpt4Response = await processWithGPT4(transcript);
        if (gpt4Response) {
            await respondWithSpeech(gpt4Response);
        }
    }
}

async function transcribeAudio(audioBlob, isName = false) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', 'whisper-1');

        updateStatus('Transcribing audio...');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: formData
        });

        const data = await response.json();
        console.log('Transcription API Response:', data);

        if (data && data.text) {
            const userText = data.text;
            if (!isName) {
                document.getElementById('transcript').innerText += `\n${userName}: ${userText}`;
                addToConversationHistory(userText, userName);
            }
            updateStatus('Transcription complete.');
            return userText;
        } else {
            console.error('Transcription failed:', data);
            updateStatus('Transcription failed. Please check console for details.');
            return null;
        }
    } catch (error) {
        console.error('Error during transcription:', error);
        updateStatus('Error occurred during transcription. Please check console for details.');
        return null;
    }
}

async function processWithGPT4(text) {
    try {
        let conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];

        const intent = await analyzeIntent(conversationHistory);

        if (intent === "YES" && !localStorage.getItem('caseOpened')) {
            await openCase(conversationHistory);
            localStorage.setItem('caseOpened', 'true');
            return "I've opened a case for you based on our conversation. Is there anything else I can help you with?";
        }

        let fullPrompt = SUPER_PROMPT;
        if (NEW_RULES.length > 0) {
            fullPrompt += '\n' + NEW_RULES.map((rule, index) => `${12 + index}. ${rule}`).join('\n');
        }
        fullPrompt += '\nMESSAGE THREAD:';

        let messages = [
            { role: "system", content: fullPrompt },
            { role: "system", content: `Instance Name: ${instanceName}\nCustomer Name: ${customerName}` },
            ...conversationHistory.map(item => ({ role: item.role.toLowerCase() === userName.toLowerCase() ? 'user' : 'assistant', content: item.text })),
            { role: "user", content: text }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: messages,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const assistantResponse = data.choices[0].message.content.trim();

        document.getElementById('transcript').innerText += `\nNOW ASSIST: ${assistantResponse}`;
        addToConversationHistory(assistantResponse, 'NOW ASSIST');

        return assistantResponse;
    } catch (error) {
        console.error('Error in processWithGPT4:', error);
        updateStatus('Error occurred while processing with GPT-4. Please check console for details.');
        return null;
    }
    }

async function respondWithSpeech(text) {
    try {
        updateStatus('Generating speech response...');
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: 'alloy',
                response_format: 'mp3',
                speed: 1
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(audioUrl);

        updateStatus('Playing response...');
        currentAudio.play();

        return new Promise(resolve => {
            currentAudio.onended = () => {
                updateStatus('Response complete. Starting new recording...');
                if (!isPaused) {
                    startRecording();
                }
                resolve();
            };
        });
    } catch (error) {
        console.error('Error in respondWithSpeech:', error);
        updateStatus('Error occurred during text-to-speech. Please check console for details.');
    }
}

function addToConversationHistory(text, role) {
    let history = JSON.parse(localStorage.getItem('conversationHistory')) || [];
    history.push({ role, text });
    localStorage.setItem('conversationHistory', JSON.stringify(history));
    displayConversationHistory();
}

function displayConversationHistory() {
    const history = JSON.parse(localStorage.getItem('conversationHistory')) || [];
    const historyDiv = document.getElementById('conversationHistory');
    historyDiv.innerHTML = '';
    history.forEach((item, index) => {
        const p = document.createElement('p');
        p.innerText = `${index + 1}. ${item.role}: ${item.text}`;
        historyDiv.appendChild(p);
    });
}

async function openCase(conversationHistory) {
    console.log("Opening case...");
    // Implement the 5 steps for opening a case here
    updateStatus('Case opened successfully.');
}