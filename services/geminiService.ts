import { supabase } from './supabaseClient';
import type { ImageAnalysis, ImageData, ProductComponent } from '../types';

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

export async function generatePrompts(analysis: ImageAnalysis, contextImages?: ImageData[]): Promise<{ painPoint: string, prompt: string }[]> {
  return invokeGeminiService('generatePrompts', { analysis, contextImages });
}

export async function createImage(originalImage: ImageData, prompt: string, contextImages?: ImageData[]): Promise<ImageData> {
  return invokeGeminiService('createImage', { originalImage, prompt, contextImages });
}

export async function reviewImage(originalImage: ImageData, generatedImage: ImageData, components?: ProductComponent[], contextImages?: ImageData[]): Promise<{ isSimilar: boolean, reason:string }> {
  return invokeGeminiService('reviewImage', { originalImage, generatedImage, components, contextImages });
}
