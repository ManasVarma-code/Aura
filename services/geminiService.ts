
import { GoogleGenAI, Type } from "@google/genai";
import { FestivalData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  async generateRelationshipNote(input: string, context: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Context: ${context}. Expand this short note into a beautiful, poetic, and warm romantic message while maintaining the original sentiment: "${input}"`,
        config: {
          systemInstruction: "You are Aura, a supportive AI for couples. Your tone is warm, romantic, modern, and caring. Use 1-2 heart emojis.",
        },
      });
      return response.text || "Could not generate note at this time.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Something went wrong. Please try again.";
    }
  },

  async getChatSuggestions(recentMessages: string[], tone: string): Promise<string[]> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Recent conversation: ${recentMessages.join("\n")}. Tone identified: ${tone}. Provide 3 short, warm, contextual response suggestions for a partner.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch {
      return ["Thinking of you ❤️", "Can't wait to see you!", "You're the best!"];
    }
  },

  async getIndianFestivals(year: number): Promise<FestivalData[]> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `List the major Indian festivals for the year ${year}. Use accurate lunar/solar calculations for dates.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "YYYY-MM-DD" },
                title: { type: Type.STRING },
                type: { type: Type.STRING },
                emotion: { type: Type.STRING },
                short_description: { type: Type.STRING },
                couple_suggestion: { type: Type.STRING },
                visual_tone: { type: Type.STRING },
                notification_style: { type: Type.STRING }
              },
              required: ["date", "title", "type", "emotion", "short_description", "couple_suggestion"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch {
      return [];
    }
  },

  async getPlanDate(preferences: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Plan a perfect date based on: ${preferences}. Include theme, vibe, detailed steps, and special add-on ideas. Keep it romantic and pastel-toned in spirit.`,
      config: {
        systemInstruction: "You are Aura's Date Planner. You suggest romantic, creative, and bonding-focused activities for couples.",
      }
    });
    return response.text || "Could not generate date plan.";
  }
};
