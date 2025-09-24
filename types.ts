
export enum WorkflowState {
    IDLE,
    ANALYZING,
    DEFINING_CONTEXT_AND_COMPONENTS,
    GENERATING_SCRIPT,
    SCRIPT_APPROVAL,
    GENERATING_IMAGES,
    REVIEWING_IMAGES,
    USER_APPROVAL,
    COMPLETED,
    ERROR,
}

export interface ImageData {
    base64: string;
    mimeType: string;
}

export interface ProductComponent {
    id: string;
    name: string;
    description: string;
    scale: string;
}

export type ContextType = 'component' | 'usage_reference' | 'scale_reference' | 'detail_reference';

export interface UserContextItem {
    id: string;
    imageData: ImageData | null; // Can be null if component is detected but image not yet uploaded
    type: ContextType;
    description: string;
    name?: string; // Optional name, especially for components
}


export interface ImageAnalysis {
    productName: string;
    description: string;
    features: string[];
    targetAudience: string;
    painPoints: string[];
    components?: ProductComponent[];
}

export interface ReviewResult {
    score: number;
    reason: string;
}

export type ImageStatus = 
    | 'PENDING' 
    | 'GENERATING' 
    | 'REVIEWING' 
    | 'AI_APPROVED' 
    | 'AI_REJECTED'
    | 'USER_APPROVED'
    | 'USER_REJECTED'
    | 'FAILED';


export interface GeneratedImage {
    id: string;
    sceneId: string;
    prompt: string;
    painPoint: string; // This is now the scene description
    status: ImageStatus;
    imageData: ImageData | null;
    review: ReviewResult | null;
    previousImageData?: ImageData | null;
    generationSource?: 'ai-image' | 'original-image-placeholder';
    feedback?: string;
    regenerationCount?: number;
    errorMessage?: string;
}

export interface ScriptScene {
    id: string;
    sceneNumber: number;
    description: string;
    prompt: string;
}

export interface GeneratedVideo {
    id:string;
    imageId: string;
    status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
    operation?: any;
    downloadUrl?: string;
    blobUrl?: string;
    errorMessage?: string;
}