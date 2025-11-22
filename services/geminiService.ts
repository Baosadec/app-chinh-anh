import { GoogleGenAI } from "@google/genai";
import { GenerationResult } from "../types";

/**
 * Generates a stylized image based on an input image and a prompt.
 * Uses gemini-2.5-flash-image for standard tasks or gemini-3-pro-image-preview for high quality.
 */
export const generateStylizedImage = async (
  base64Data: string,
  mimeType: string,
  prompt: string,
  influence: number = 50,
  characterDescription: string = "",
  sceneActionDescription: string = "",
  quality: 'standard' | 'high' = 'standard'
): Promise<GenerationResult> => {
  try {
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please configure it in your .env file.");
    }

    // CRITICAL: Create a new instance for every request to ensure we use the most up-to-date API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Remove the data URL prefix if present
    const cleanBase64 = base64Data.includes("base64,")
      ? base64Data.split("base64,")[1]
      : base64Data;

    // Construct guidance based on influence level
    let guidance = "";
    if (influence === 0) {
      guidance = "Ignore the input image structure entirely. Composition should be determined solely by the prompt.";
    } else if (influence < 30) {
      guidance = "Use the input image as a loose reference. You may significantly alter the pose and structure.";
    } else if (influence < 70) {
      guidance = "Maintain the general structure and main subject placement of the input image, but adapt details to the style.";
    } else {
      guidance = "Strictly adhere to the exact structure, pose, and composition of the input image. Only change the artistic rendering.";
    }

    // Construct the prompt
    const promptParts = [];
    
    // Inject "Old Style" aesthetic if the prompt doesn't explicitly forbid it, 
    // or if it's the default request. We blend it with the user's prompt.
    const aestheticBase = "Aesthetic: Vintage, sepia-toned, or aged photograph look with high detail and film grain.";
    
    if (characterDescription.trim()) {
      promptParts.push(`Subject Description: ${characterDescription}.`);
    }

    if (sceneActionDescription.trim()) {
      promptParts.push(`Scene & Action: ${sceneActionDescription}.`);
    }

    // Combine user prompt with aesthetic
    promptParts.push(`Style & Atmosphere: ${prompt}. ${aestheticBase}`);

    let finalPrompt = promptParts.join('\n\n');
    finalPrompt = `${finalPrompt}\n\nIMPORTANT INSTRUCTION: ${guidance} (Structural Adherence: ${influence}%)`;

    // Determine model and config based on quality
    const model = quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const config: any = {};
    if (quality === 'high') {
      config.imageConfig = {
        imageSize: '2K' 
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: finalPrompt },
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
        ],
      },
      config
    });

    let imageUrl: string | undefined;
    let textResponse: string | undefined;

    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData) {
            const base64Response = part.inlineData.data;
            const mime = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mime};base64,${base64Response}`;
          } else if (part.text) {
            textResponse = part.text;
          }
        }
      }
    }

    if (!imageUrl) {
      if (textResponse) {
        throw new Error(`Model declined to generate image: ${textResponse}`);
      }
      throw new Error("The model returned an empty response. Please try a different prompt or image.");
    }

    return { imageUrl, text: textResponse };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    let message = error.message || "An unknown error occurred.";
    
    // Priority check for specific API key race condition error.
    if (message.includes("Requested entity was not found")) {
       throw new Error("Requested entity was not found.");
    }

    if (message.includes("403") || message.includes("API key")) {
      message = "Invalid or missing API Key. Please check your .env file.";
    } else if (message.includes("400")) {
      message = "The request was invalid. The image might be too large or the prompt flagged.";
    } else if (message.includes("503") || message.includes("Overloaded")) {
      message = "The service is currently overloaded. Please try again in a moment.";
    } else if (message.includes("SAFETY")) {
      message = "Generation blocked by safety filters. Please adjust your prompt or image.";
    }
    
    throw new Error(message);
  }
};

/**
 * Removes background from the image using Gemini.
 */
export const removeBackground = async (
  base64Data: string,
  mimeType: string
): Promise<GenerationResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure it in your .env file.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = "Remove the background from this image. Keep the main subject exactly as is, but place it on a solid white background.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data.includes("base64,") ? base64Data.split("base64,")[1] : base64Data,
              mimeType: mimeType,
            },
          },
        ],
      }
    });

    let imageUrl: string | undefined;
    if (response.candidates?.[0]?.content?.parts) {
       for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
             imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
       }
    }

    if (!imageUrl) throw new Error("Failed to remove background.");
    return { imageUrl };

  } catch (error: any) {
    if (error.message && error.message.includes("Requested entity was not found")) {
       throw new Error("Requested entity was not found.");
    }
    throw new Error("Background removal failed: " + error.message);
  }
};