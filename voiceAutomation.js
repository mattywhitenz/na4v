const { createCase } = require('./servicenow');

// This function would be called when voice input is processed
async function handleVoiceInput(voiceInput) {
  // Check if the voice input is asking to open a case
  if (voiceInput.toLowerCase().includes('open a case')) {
    try {
      console.log("Voice command detected: Opening a case");

      // Here you would typically extract more details from the voice input
      // For this example, we're using placeholder data
      const userDetails = {
        firstName: "Voice",
        lastName: "User",
        email: `voice_user_${Date.now()}@example.com`,
        shortDescription: "Case opened via voice command",
        description: "This case was automatically opened in response to a voice command."
      };

      const result = await createCase(userDetails);

      console.log("Case created successfully");
      console.log("HR Case Number:", result.hrCase.number);

      // Here you would typically send this information back to the voice interface
      return `Case opened successfully. Your case number is ${result.hrCase.number}.`;
    } catch (error) {
      console.error("Error creating case:", error);
      return "I'm sorry, there was an error creating your case. Please try again later.";
    }
  } else {
    return "I'm sorry, I didn't understand. If you'd like to open a case, please say 'open a case'.";
  }
}

// Example usage (you would replace this with your actual voice input mechanism)
async function simulateVoiceCommand(command) {
  const response = await handleVoiceInput(command);
  console.log("Assistant response:", response);
}

// Simulate a voice command
simulateVoiceCommand("open a case for me please");