import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { jobTitle, experienceLevel, questionFocus, questionCount } = await req.json();

    const count = questionCount || 3;
    const title = (jobTitle || "Customer Success Manager").trim();
    const level = experienceLevel || "Mid Level";
    const focus = questionFocus || "Mixed";

    if (!title) {
      return NextResponse.json(
        { error: "Job title is required." },
        { status: 400 }
      );
    }

    // Create the prompt that asks the AI to generate the role-specific questions and rubrics.
    const prompt = `You are a professional HR specialist and senior hiring manager.
Generate exactly ${count} highly professional, realistic, and thoughtful interview questions for a ${level} ${title}, focusing on ${focus} scenarios.
For each of the ${count} questions, you MUST provide an ideal response guideline or grading rubric for the interviewer.

CRITICAL FORMATTING INSTRUCTIONS:
1. You MUST generate exactly ${count} distinct question blocks. Do not generate 3 questions if the requested number is ${count}.
2. Separate each question block using '---' on a new line.
3. Do NOT use markdown bold formatting like **Question:** or **Rubric:**. Use the exact plain text labels 'Question:' and 'Rubric:'.
4. Do NOT include any introductions, conclusions, explanations, page headers, or numbering like 'Question 1:'.
5. Make sure the output format is exactly as follows:

Question: [Insert question text here]
Rubric: [Insert 1-2 sentence grading rubric or ideal response guidelines here]
---

Remember: You MUST output exactly ${count} distinct blocks separated by '---'.`;

    // Generate response using our robust Google Gemini helper
    const aiText = await generateText(prompt);

    return NextResponse.json({
      success: true,
      questions: aiText.trim(),
    });
  } catch (error) {
    console.error("Error in /api/questions:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    const statusCode = (error as any)?.statusCode || 500;
    
    let userFriendlyError = errorMessage;
    let httpStatus = statusCode;
    
    // Map internal errors to user-friendly messages and appropriate HTTP status codes
    if (statusCode === 401) {
      userFriendlyError = "Server configuration error: API key is invalid or missing.";
      httpStatus = 500; // Return 500 to client, but log the auth issue
    } else if (statusCode === 400) {
      userFriendlyError = "Invalid request parameters. Please check your inputs.";
      httpStatus = 400;
    } else if (statusCode === 503) {
      userFriendlyError = "The AI service is currently unavailable. Please try again in a few moments.";
      httpStatus = 503;
    } else if (statusCode === 429) {
      userFriendlyError = "Too many requests. Please wait a minute before trying again.";
      httpStatus = 429;
    } else if (statusCode === 504) {
      userFriendlyError = "The AI service is temporarily unresponsive. Please try again shortly.";
      httpStatus = 504;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: userFriendlyError,
      },
      { status: httpStatus }
    );
  }
}
