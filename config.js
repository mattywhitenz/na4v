export const CONFIG = {
    // API Configuration
    API_ENDPOINT: 'https://api.openai.com/v1',
    GPT_MODEL: 'gpt-4',
    WHISPER_MODEL: 'whisper-1',
    TTS_MODEL: 'tts-1',

    // Audio Configuration
    MAX_AUDIO_SIZE: 25 * 1024 * 1024, // 25 MB in bytes
    TTS_VOICE: 'alloy',
    TTS_SPEED: 1,

    // UI Configuration
    UI_ELEMENTS: {
        CONVERSATION_CONTROL: 'conversationControl',
        CONVERSATION_STATUS: 'conversationStatus',
        TRANSCRIPT: 'transcript',
        API_KEY_INPUT: 'apiKey',
        INSTANCE_NAME_INPUT: 'instanceName',
        INSTANCE_PASSWORD_INPUT: 'instancePassword',
        CUSTOMER_NAME_INPUT: 'customerName',
        SAVE_SETTINGS_BUTTON: 'saveSettings',
        NEW_RULE_INPUT: 'newRule',
        ADD_RULE_BUTTON: 'addRule',
        VIEW_RULES_BUTTON: 'viewNewRules',
        RULES_TEXTAREA: 'newRulesTextarea',
        SAVE_RULES_BUTTON: 'saveNewRules',
        HIDE_RULES_BUTTON: 'hideNewRules',
        RULES_EDITOR: 'newRulesEditor',
        START_BUTTON: 'startConversation',
        STOP_RECORDING: 'stopRecording'
    },

    // Local Storage Keys
    STORAGE_KEYS: {
        API_KEY: 'openaiApiKey',
        INSTANCE_NAME: 'instanceName',
        INSTANCE_PASSWORD: 'instancePassword',
        CUSTOMER_NAME: 'customerName',
        CONVERSATION_HISTORY: 'conversationHistory',
        NEW_RULES: 'newRules'
    },

    // Initial Prompts and Rules
    SUPER_PROMPT: `
- You are Now Assist. Assume the message thread below with your prior responses as tagged below
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
    `,
    NEW_RULES: []
};