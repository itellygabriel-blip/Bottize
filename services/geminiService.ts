import { supabase } from './supabaseClient';
import type { ImageAnalysis, ImageData, ProductComponent, ScriptScene, UserContextItem } from '../types';

async function invokeGeminiService(action: string, payload: any) {
  const { data, error } = await supabase.functions.invoke('gemini-service', {
    body: { action, payload },
  });

  if (error) {
    console.error("Supabase function error:", error);
    throw new Error(`Erro ao chamar a função da Supabase: ${error.message}`);
  }
  if (data.error) {
    console.error("Backend service error:", data.error);
    throw new Error(`Erro no serviço de backend: ${data.error}`);
  }
  return data;
}

export async function analyzeImage(imageData: ImageData): Promise<ImageAnalysis> {
  return invokeGeminiService('analyzeImage', { imageData });
}

export async function generatePrompts(analysis: ImageAnalysis, numberOfScenes: number, contextImages?: ImageData[]): Promise<{ painPoint: string, prompt: string }[]> {
  return invokeGeminiService('generatePrompts', { analysis, numberOfScenes, contextImages });
}

export async function createImage(originalImage: ImageData, prompt: string, contextImages?: ImageData[]): Promise<ImageData> {
  return invokeGeminiService('createImage', { originalImage, prompt, contextImages });
}

export async function reviewImage(originalImage: ImageData, generatedImage: ImageData, components?: ProductComponent[], contextImages?: ImageData[]): Promise<{ isSimilar: boolean, reason:string }> {
  return invokeGeminiService('reviewImage', { originalImage, generatedImage, components, contextImages });
}

export async function downloadVideo(url: string): Promise<{ base64: string, mimeType: string }> {
  return invokeGeminiService('downloadVideo', { url });
}

export async function regenerateImage(originalImage: ImageData, previousImage: ImageData, prompt: string, feedback: string, contextImages?: ImageData[]): Promise<ImageData> {
  return invokeGeminiService('regenerateImage', { originalImage, previousImage, prompt, feedback, contextImages });
}

export async function generateSingleScene(analysis: ImageAnalysis, script: ScriptScene[], userContextItems: UserContextItem[]): Promise<ScriptScene> {
  return invokeGeminiService('generateSingleScene', { analysis, script, userContextItems });
}

export async function generateVideo(prompt: string, imageData: ImageData, aspectRatio: '1:1' | '9:16' | '16:9'): Promise<any> {
  return invokeGeminiService('generateVideo', { prompt, imageData, aspectRatio });
}

export async function getVideosOperation(operationName: string): Promise<any> {
  return invokeGeminiService('getVideosOperation', { operationName });
}
