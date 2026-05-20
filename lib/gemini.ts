import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Helper function to generate content from Google's Gemini-2.5-Flash model.
 * Includes automatic retry logic with exponential backoff to handle transient 503/429 errors.
 * @param prompt The prompt string to feed to the generative AI model.
 * @returns The response text content from the generative model.
 */
export async function generateText(prompt: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Google Gemini API Key is not configured. Please define GEMINI_API_KEY in your server environment variables.");
  }
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const maxRetries = 3;
  let delay = 1200; // start with a 1.2 second delay

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) {
        throw new Error("Empty response returned from model.");
      }
      return text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Gemini API call failed (Attempt ${attempt}/${maxRetries}):`, errorMessage);
      
      // Classify error type
      const is503 = errorMessage.includes("503") || errorMessage.includes("Service Unavailable");
      const is429 = errorMessage.includes("429") || errorMessage.includes("rate limit");
      const is504 = errorMessage.includes("504") || errorMessage.includes("Gateway Timeout");
      const is401 = errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("API key");
      const is400 = errorMessage.includes("400") || errorMessage.includes("Bad Request");
      const isNetworkError = errorMessage.includes("ERR_INTERNET_DISCONNECTED") || errorMessage.includes("ECONNREFUSED");
      
      // Distinguish quota exhaustion from temporary rate limiting
      const isQuotaExhausted = errorMessage.includes("Quota exceeded") || errorMessage.includes("Free Tier") || errorMessage.includes("quota");
      
      // Only retry for transient service errors, NOT for quota exhaustion
      const isTransientError = 
        is503 || (is429 && !isQuotaExhausted) || is504 || isNetworkError ||
        errorMessage.includes("high demand") || 
        errorMessage.includes("Overloaded") ||
        errorMessage.includes("ResourceExhausted");

      if (isTransientError && attempt < maxRetries) {
        console.log(`Transient error detected. Retrying attempt ${attempt + 1} in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // double the wait time for exponential backoff (1.2s -> 2.4s -> 4.8s)
      } else {
        // Create user-friendly error message based on error type
        let userMessage = "An error occurred while generating questions.";
        
        if (is401) {
          userMessage = "API authentication failed. Please check your Gemini API key configuration.";
        } else if (is400) {
          userMessage = "Invalid request to the AI service. Please check your input and try again.";
        } else if (is503) {
          userMessage = "The AI service is currently experiencing high demand. Please wait a moment and try again.";
        } else if (isQuotaExhausted) {
          userMessage = "Daily API quota exceeded. You've reached the limit for question generation today. Please try again tomorrow or upgrade your API plan.";
        } else if (is429) {
          userMessage = "Rate limited. Please wait a few moments before generating more questions.";
        } else if (is504) {
          userMessage = "The AI service is temporarily unavailable. Please try again in a few seconds.";
        } else if (isNetworkError) {
          userMessage = "Network connection error. Please check your internet connection and try again.";
        }
        
        const enhancedError = new Error(userMessage);
        (enhancedError as any).statusCode = is401 ? 401 : is400 ? 400 : is503 ? 503 : is429 ? 429 : is504 ? 504 : 500;
        (enhancedError as any).originalError = errorMessage;
        throw enhancedError;
      }
    }
  }

  throw new Error("Google Gemini API is currently experiencing unusually high traffic. Please try generating again in a few moments.");
}
