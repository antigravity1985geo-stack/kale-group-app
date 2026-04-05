import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function run() {
  try {
    console.log("Initializing GenAI...");
    const genAI = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || "" 
    });
    
    console.log("Generating content...");
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello world"
    });
    
    console.log("Success!");
    console.log(result.text);
    process.exit(0);
  } catch (err) {
    console.error("GenAI Error:", err);
    process.exit(1);
  }
}
run();
