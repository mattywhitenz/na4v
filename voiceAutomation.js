import { createCase } from './apiInteractions.js';
import { getConversationHistory } from './uiManager.js';
import { generateRandomEmail, generateShortDescription, generateChatSummary } from './apiInteractions.js';

export async function handleVoiceInput(text, apiKey) {
  if (text.toLowerCase().includes('open a case')) {
    try {
      console.log("Voice command detected: Opening a case");

      const conversationHistory = getConversationHistory();
      const transcript = conversationHistory.map(item => `${item.role}: ${item.text}`).join('\n');

      const email = await generateRandomEmail(apiKey);
      const shortDescription = await generateShortDescription(transcript, apiKey);
      const description = await generateChatSummary(transcript, apiKey);

      const userDetails = {
        firstName: "Voice",
        lastName: "User",
        email: email,
        shortDescription: shortDescription,
        description: description
      };

      const result = await createCase(userDetails);

      console.log("Case created successfully");
      console.log("HR Case Number:", result.hrCase.number);

      return `Case opened successfully. Your case number is ${result.hrCase.number}.`;
    } catch (error) {
      console.error("Error creating case:", error);
      return "I'm sorry, there was an error creating your case. Please try again later.";
    }
  } else {
    return "I'm sorry, I didn't understand. If you'd like to open a case, please say 'open a case'.";
  }
}