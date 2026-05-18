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
      console.warn(`Gemini API call failed (Attempt ${attempt}/${maxRetries}):`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTransientError = 
        errorMessage.includes("503") || 
        errorMessage.includes("429") || 
        errorMessage.includes("high demand") || 
        errorMessage.includes("Overloaded") ||
        errorMessage.includes("ResourceExhausted") ||
        errorMessage.includes("Service Unavailable");

      if (isTransientError && attempt < maxRetries) {
        console.log(`Transient Gemini API demand spike. Retrying attempt ${attempt + 1} in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // double the wait time for exponential backoff (1.2s -> 2.4s -> 4.8s)
      } else {
        // If it's a non-transient error (e.g. 400 Bad Request, invalid key) or we exhausted all retries, throw it
        throw error;
      }
    }
  }

  throw new Error("Google Gemini API is currently experiencing unusually high traffic. Please try generating again in a few moments.");
}
