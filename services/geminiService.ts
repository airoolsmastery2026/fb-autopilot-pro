import { GoogleGenAI, Modality } from '@google/genai';
import type {
  GenerateContentResponse,
  GetVideosOperationResponse,
  VideosOperation,
} from '@google/genai';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn(
    'API_KEY environment variable not set. Gemini API calls will fail.',
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateText = async (prompt: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Error generating text with Gemini:', error);
    return 'Error: Could not generate content. Please check your API key and network connection.';
  }
};

export const generateImage = async (
  prompt: string,
): Promise<string | null> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    return null;
  } catch (error) {
    console.error('Error generating image with Gemini:', error);
    return null;
  }
};

interface ImagePayload {
  imageBytes: string;
  mimeType: string;
}

export const generateVideo = async (
  prompt: string,
  image: ImagePayload | null = null,
): Promise<string> => {
  try {
    const payload: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
      },
    };

    if (image) {
      payload.image = {
        imageBytes: image.imageBytes,
        mimeType: image.mimeType,
      };
    }

    let operation: VideosOperation | GetVideosOperationResponse =
      await ai.models.generateVideos(payload);

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({
        operation: operation as VideosOperation,
      });
    }

    const downloadLink = (operation as GetVideosOperationResponse).response
      ?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      throw new Error(
        'Video generation succeeded but no download link was provided.',
      );
    }

    const response = await fetch(`${downloadLink}&key=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
  } catch (error) {
    console.error('Error generating video with Gemini:', error);
    throw error;
  }
};
