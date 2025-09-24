import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { StepIndicator } from './components/StepIndicator';
import { ImageGenerationGrid } from './components/ImageGenerationGrid';
// Fix: Removed unused import for AnalysisDisplay as it was causing an error.
import { WorkflowState, ImageAnalysis, GeneratedImage, ImageData, ProductComponent, ScriptScene, UserContextItem, GeneratedVideo } from './types';
import { analyzeImage, generatePrompts, createImage, reviewImage, regenerateImage, generateSingleScene, generateVideo, getVideosOperation, downloadVideo } from './services/geminiService';
import { ContextAndComponentEditor } from './components/ContextAndComponentEditor';
import { ScriptEditor } from './components/ScriptEditor';
import { LandingPage } from './components/LandingPage';
import { Loader } from './components/Loader';

type AppMode = 'landing' | 'full' | 'photos';

const App: React.FC = () => {
    const [appMode, setAppMode] = useState<AppMode>('landing');
    const [workflowState, setWorkflowState] = useState<WorkflowState>(WorkflowState.IDLE);
    const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
    const [userContextItems, setUserContextItems] = useState<UserContextItem[]>([]);
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('9:16');
    const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
    const [script, setScript] = useState<ScriptScene[]>([]);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [videos, setVideos] = useState<GeneratedVideo[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isAddingScene, setIsAddingScene] = useState(false);

    const resetState = () => {
        setWorkflowState(WorkflowState.IDLE);
        setOriginalImage(null);
        setUserContextItems([]);
        setAspectRatio('9:16');
        setAnalysis(null);
        setScript([]);
        setGeneratedImages([]);
        setVideos([]);
        setError(null);
        setIsAddingScene(false);
        setAppMode('landing');
    };

    const handleImageUpload = useCallback(async (file: File) => {
        setError(null);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            const originalImageData: ImageData = { base64: base64String.split(',')[1], mimeType: file.type, };
            setOriginalImage(originalImageData);
            
            try {
                setWorkflowState(WorkflowState.ANALYZING);
                const analysisResult = await analyzeImage(originalImageData);
                setAnalysis(analysisResult);
                setWorkflowState(WorkflowState.DEFINING_CONTEXT_AND_COMPONENTS);
            } catch (err) {
                console.error("Analysis failed:", err);
                setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante a análise.");
                setWorkflowState(WorkflowState.ERROR);
            }
        };
        reader.readAsDataURL(file);
    }, []);
    
    const generateAndReviewImages = useCallback(async (scenes: ScriptScene[]) => {
        if (!originalImage || !analysis) return;

        const initialImages: GeneratedImage[] = scenes.map((scene, index) => ({
            id: `img-${index}-${Date.now()}`,
            sceneId: scene.id,
            prompt: scene.prompt,
            painPoint: scene.description,
            status: 'PENDING',
            imageData: null,
            review: null,
            generationSource: 'ai-image',
        }));
        setGeneratedImages(initialImages);
        const contextImages = userContextItems.map(item => item.imageData);

        setWorkflowState(WorkflowState.GENERATING_IMAGES);

        const imageCreationPromises = initialImages.map(async (image) => {
            try {
                const generatedImageData = await createImage(originalImage, image.prompt, contextImages);
                setGeneratedImages(prev => prev.map(i => i.id === image.id ? { ...i, imageData: generatedImageData, status: 'REVIEWING' } : i));
                return { ...image, imageData: generatedImageData, status: 'REVIEWING' as const };
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Falha na geração da imagem.";
                console.error(`Failed to generate image ${image.id}:`, err);
                setGeneratedImages(prev => prev.map(i => i.id === image.id ? { ...i, status: 'FAILED', errorMessage } : i));
                return { ...image, status: 'FAILED' as const, errorMessage };
            }
        });

        const createdImageResults = await Promise.all(imageCreationPromises);
        const successfulImages = createdImageResults.filter(
            (result): result is GeneratedImage & { imageData: ImageData; status: "REVIEWING" } => result.status === 'REVIEWING' && result.imageData !== null
        );

        if (successfulImages.length > 0) {
            setWorkflowState(WorkflowState.REVIEWING_IMAGES);
            const reviewPromises = successfulImages.map(async (image) => {
                try {
                    const reviewResult = await reviewImage(originalImage, image.imageData, analysis.components, contextImages);
                    const finalStatus = reviewResult.score >= 3 ? 'AI_APPROVED' : 'AI_REJECTED';
                    setGeneratedImages(prev => prev.map(i => i.id === image.id ? { ...i, status: finalStatus, review: reviewResult } : i));
                } catch (reviewErr) {
                     console.error(`Failed to review image ${image.id}:`, reviewErr);
                     const errorMessage = reviewErr instanceof Error ? reviewErr.message : "Falha na revisão da imagem.";
                     setGeneratedImages(prev => prev.map(i => i.id === image.id ? { ...i, status: 'FAILED', errorMessage } : i));
                }
            });
            await Promise.all(reviewPromises);
        }
        
        setWorkflowState(WorkflowState.USER_APPROVAL);

    }, [originalImage, analysis, userContextItems]);

    const handleSetupConfirmation = useCallback(async (contextItems: UserContextItem[], sceneCount: number, selectedAspectRatio: '1:1' | '9:16' | '16:9') => {
        if (!analysis || !originalImage) return;
        setUserContextItems(contextItems);
        setAspectRatio(selectedAspectRatio);
        setError(null);
        try {
            const contextImages = contextItems.map(item => item.imageData);
            if (appMode === 'full') {
                setWorkflowState(WorkflowState.GENERATING_SCRIPT);
                const scriptScenes = await generatePrompts(analysis, sceneCount, contextImages);
                setScript(scriptScenes);
                setWorkflowState(WorkflowState.SCRIPT_APPROVAL);
            } else if (appMode === 'photos') {
                const photoPrompts = await generatePrompts(analysis, sceneCount, contextImages);
                setScript(photoPrompts);
                await generateAndReviewImages(photoPrompts);
            }
        } catch (err) {
            console.error("Setup or generation failed:", err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
            setWorkflowState(WorkflowState.ERROR);
        }
    }, [analysis, originalImage, appMode, generateAndReviewImages]);

    const handleConfirmScriptAndGenerateImages = useCallback(async () => {
        if (script.length === 0) return;
        setError(null);
        try {
            await generateAndReviewImages(script);
        } catch (err) {
            console.error("Image generation workflow failed:", err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
            setWorkflowState(WorkflowState.ERROR);
        }
    }, [script, generateAndReviewImages]);
    
    const handleGenerateVideo = useCallback(async (imageId: string) => {
        const image = generatedImages.find(img => img.id === imageId);
        if (!image || !image.imageData) {
            console.error("Não é possível gerar vídeo sem dados de imagem");
            setVideos(prev => prev.map(v => v.imageId === imageId ? { ...v, status: 'FAILED', errorMessage: "Dados de imagem ausentes." } : v));
            return;
        }
    
        const videoId = `vid-${image.id}`;
        
        setVideos(prev => {
            const existingVideo = prev.find(v => v.imageId === imageId);
            if (existingVideo) {
                return prev.map(v => v.imageId === imageId ? { ...v, status: 'GENERATING', errorMessage: undefined, operation: undefined } : v);
            }
            return [...prev, { id: videoId, imageId: image.id, status: 'GENERATING' }];
        });
    
        try {
            const finalAspectRatio = aspectRatio === '1:1' ? '9:16' : aspectRatio;
            const operation = await generateVideo(image.prompt, image.imageData, finalAspectRatio);
    
            setVideos(prev => prev.map(v =>
                v.imageId === imageId
                ? { ...v, status: 'GENERATING', operation: operation }
                : v
            ));
        } catch (err) {
            console.error("A geração de vídeo falhou ao iniciar:", err);
            const errorMessage = err instanceof Error ? err.message : "Falha ao iniciar a geração do vídeo.";
            setVideos(prev => prev.map(v =>
                v.imageId === imageId
                ? { ...v, status: 'FAILED', errorMessage: errorMessage }
                : v
            ));
        }
    }, [generatedImages, aspectRatio, setVideos, generateVideo]);
    
    useEffect(() => {
        const videosToPoll = videos.filter(v => v.status === 'GENERATING' && v.operation && !v.operation.done);
    
        if (videosToPoll.length === 0) return;
    
        const intervalId = setInterval(async () => {
            for (const video of videosToPoll) {
                try {
                    if (video.operation && video.operation.name) {
            const updatedOperation = await getVideosOperation(video.operation.name);
    
                    if (updatedOperation.done) {
                        if (updatedOperation.response) {
                            const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
                            if (downloadLink) {
                                const { base64, mimeType } = await downloadVideo(downloadLink);
                                const byteCharacters = atob(base64);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const blob = new Blob([byteArray], {type: mimeType});
                                const blobUrl = URL.createObjectURL(blob);
                                setVideos(prev => prev.map(v => v.id === video.id ? {
                                    ...v, status: 'COMPLETED', operation: updatedOperation,
                                    downloadUrl: downloadLink, blobUrl: blobUrl, errorMessage: undefined
                                } : v));
                            } else {
                                throw new Error("Operação concluída, mas nenhum link de vídeo foi encontrado.");
                            }
                        } else {
                            const error = updatedOperation.error || { message: "Erro desconhecido durante a geração." };
                            throw new Error(`A geração falhou: ${error.message}`);
                        }
                    } else {
                        setVideos(prev => prev.map(v => v.id === video.id ? { ...v, operation: updatedOperation } : v));
                    }
                } catch (err) {
                    console.error(`Falha ao verificar o status do vídeo para ${video.id}:`, err);
                    const errorMessage = err instanceof Error ? err.message : "Falha ao verificar o status da geração.";
                    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: 'FAILED', errorMessage: errorMessage } : v));
                }
            }
        }, 10000); // Poll every 10 seconds
    
        return () => clearInterval(intervalId);
    }, [videos, setVideos, getVideosOperation, downloadVideo]);

    const handleUserApproveImage = (id: string) => setGeneratedImages(prev => prev.map(img => img.id === id ? { ...img, status: 'USER_APPROVED' } : img));
    const handleUserRejectImage = (id: string) => setGeneratedImages(prev => prev.map(img => img.id === id ? { ...img, status: 'USER_REJECTED' } : img));

    const handleRegenerateImage = useCallback(async (id: string, feedback: string) => {
        if (!originalImage || !analysis) return;
        const imageToRegen = generatedImages.find(img => img.id === id);
        if (!imageToRegen) return;

        try {
            setGeneratedImages(prev => prev.map(i => i.id === id ? { ...i, status: 'GENERATING', feedback: feedback, previousImageData: i.imageData, imageData: null, review: null, regenerationCount: (i.regenerationCount || 0) + 1 } : i));
            
            if (!imageToRegen.imageData) {
                 throw new Error("A imagem anterior é necessária para a regeneração.");
            }

            const contextImages = userContextItems.map(item => item.imageData);
            const newImageData = await regenerateImage(originalImage, imageToRegen.imageData, imageToRegen.prompt, feedback, contextImages);
            setGeneratedImages(prev => prev.map(i => i.id === id ? { ...i, imageData: newImageData, status: 'REVIEWING' } : i));
            const reviewResult = await reviewImage(originalImage, newImageData, analysis.components, contextImages);
            const finalStatus = reviewResult.score >= 3 ? 'AI_APPROVED' : 'AI_REJECTED';
            setGeneratedImages(prev => prev.map(i => i.id === id ? { ...i, status: finalStatus, review: reviewResult } : i));
        } catch (err) {
            console.error("Image regeneration failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido na regeneração.";
            setGeneratedImages(prev => prev.map(i => i.id === id ? { ...i, status: 'FAILED', errorMessage, imageData: imageToRegen.previousImageData || null } : i));
        }
    }, [originalImage, analysis, generatedImages, userContextItems, regenerateImage, reviewImage]);

    const handleRetryImageGeneration = useCallback(async (id: string) => {
        if (!originalImage || !analysis) return;
        const imageToRetry = generatedImages.find(img => img.id === id);
        if (!imageToRetry) return;

        try {
            setGeneratedImages(prev => prev.map(i => i.id === id ? { ...i, status: 'GENERATING', errorMessage: undefined } : i));
            
            const contextImages = userContextItems.map(item => item.imageData);
            const newImageData = await createImage(originalImage, imageToRetry.prompt, contextImages);
            
            setGeneratedImages(prev => prev.map(i => i.id === id ? { ...i, imageData: newImageData, status: 'REVIEWING' } : i));
            
            const reviewResult = await reviewImage(originalImage, newImageData, analysis.components, contextImages);
            const finalStatus = reviewResult.score >= 3 ? 'AI_APPROVED' : 'AI_REJECTED';
            
            setGeneratedImages(prev => prev.map(i => i.id === id ? { ...i, status: finalStatus, review: reviewResult } : i));
        } catch (err) {
            console.error("Image retry failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido na nova tentativa.";
            setGeneratedImages(prev => prev.map(i => i.id === id ? { ...i, status: 'FAILED', errorMessage } : i));
        }
    }, [originalImage, analysis, userContextItems, generatedImages]);

    const handleAddNewScene = useCallback(async () => {
        if (!analysis || !originalImage) return;
        setIsAddingScene(true);
        try {
            const newScene = await generateSingleScene(analysis, script, userContextItems);
            setScript(prev => [...prev, newScene]);
            // Now generate the image for this new scene
            const newImage: GeneratedImage = {
                id: `img-new-${Date.now()}`,
                sceneId: newScene.id,
                prompt: newScene.prompt,
                painPoint: newScene.description,
                status: 'GENERATING',
                imageData: null,
                review: null,
            };
            setGeneratedImages(prev => [...prev, newImage]);
            
            const contextImages = userContextItems.map(item => item.imageData);
            const generatedImageData = await createImage(originalImage, newImage.prompt, contextImages);
            setGeneratedImages(prev => prev.map(i => i.id === newImage.id ? { ...i, imageData: generatedImageData, status: 'REVIEWING' } : i));

            const reviewResult = await reviewImage(originalImage, generatedImageData, analysis.components, contextImages);
            const finalStatus = reviewResult.score >= 3 ? 'AI_APPROVED' : 'AI_REJECTED';
            setGeneratedImages(prev => prev.map(i => i.id === newImage.id ? { ...i, status: finalStatus, review: reviewResult } : i));

        } catch (err) {
            console.error("Failed to add new scene and image:", err);
             setError(err instanceof Error ? err.message : "Falha ao adicionar nova cena.");
        } finally {
            setIsAddingScene(false);
        }
    }, [analysis, originalImage, script, userContextItems, generateSingleScene, createImage, reviewImage]);

    const handleBack = useCallback(() => {
        setError(null);
        if (workflowState === WorkflowState.ERROR) {
            if (generatedImages.length > 0) {
                setWorkflowState(WorkflowState.USER_APPROVAL);
            } else if (script.length > 0 && appMode === 'full') {
                setWorkflowState(WorkflowState.SCRIPT_APPROVAL);
            } else if (analysis) {
                setWorkflowState(WorkflowState.DEFINING_CONTEXT_AND_COMPONENTS);
            } else {
                setWorkflowState(WorkflowState.IDLE);
                setOriginalImage(null);
                setAnalysis(null);
            }
            return;
        }
        
        switch (workflowState) {
            case WorkflowState.DEFINING_CONTEXT_AND_COMPONENTS:
            case WorkflowState.ANALYZING:
                setWorkflowState(WorkflowState.IDLE);
                setOriginalImage(null);
                setAnalysis(null);
                break;
            case WorkflowState.GENERATING_SCRIPT:
            case WorkflowState.SCRIPT_APPROVAL:
                setWorkflowState(WorkflowState.DEFINING_CONTEXT_AND_COMPONENTS);
                setScript([]);
                break;
            case WorkflowState.GENERATING_IMAGES:
            case WorkflowState.REVIEWING_IMAGES:
            case WorkflowState.USER_APPROVAL:
                setGeneratedImages([]);
                setVideos([]);
                if (appMode === 'full') {
                    setWorkflowState(WorkflowState.SCRIPT_APPROVAL);
                } else { // photos mode
                    setScript([]);
                    setWorkflowState(WorkflowState.DEFINING_CONTEXT_AND_COMPONENTS);
                }
                break;
        }
    }, [workflowState, appMode, analysis, script, generatedImages]);

    const renderContent = () => {
        if (appMode === 'landing') {
            return <LandingPage onSelectMode={(mode) => {
                setAppMode(mode);
                setWorkflowState(WorkflowState.IDLE); 
            }} />;
        }

        if (workflowState === WorkflowState.IDLE && !originalImage) {
            return <ImageUploader onImageUpload={handleImageUpload} />;
        }
        
        if (workflowState === WorkflowState.ANALYZING) {
            return (
                <div className="flex flex-col items-center justify-center bg-stone-800/50 p-8 rounded-lg">
                    <Loader />
                    <p className="text-gray-300 mt-4 text-lg">Analisando a imagem do produto...</p>
                </div>
            );
        }

        if (workflowState === WorkflowState.DEFINING_CONTEXT_AND_COMPONENTS && analysis) {
            return <ContextAndComponentEditor onConfirm={handleSetupConfirmation} initialComponents={analysis.components || []} flowType={appMode}/>;
        }

        if (workflowState === WorkflowState.SCRIPT_APPROVAL && script.length > 0) {
            return <ScriptEditor script={script} setScript={setScript} onConfirm={handleConfirmScriptAndGenerateImages} />;
        }
        
        if ((workflowState >= WorkflowState.GENERATING_SCRIPT && workflowState <= WorkflowState.COMPLETED) || workflowState === WorkflowState.ERROR) {
             return <ImageGenerationGrid 
                        images={generatedImages}
                        videos={videos} 
                        state={workflowState}
                        onUserApprove={handleUserApproveImage}
                        onUserReject={handleUserRejectImage}
                        onRegenerate={handleRegenerateImage}
                        onRetryGeneration={handleRetryImageGeneration}
                        onAddNewScene={handleAddNewScene}
                        isAddingScene={isAddingScene}
                        onGenerateVideo={handleGenerateVideo}
                    />;
        }

        return <div className="flex justify-center items-center p-16"><Loader /></div>;
    };

    return (
        <div className="bg-stone-900 text-gray-200 min-h-screen font-sans">
            <main className="container mx-auto p-4 md:p-8">
                {appMode !== 'landing' && (
                    <>
                        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                            <div className="w-full md:w-32 self-start md:self-center">
                                {workflowState > WorkflowState.IDLE && workflowState < WorkflowState.COMPLETED && (
                                    <button onClick={handleBack} className="flex items-center gap-1 text-sm text-[#A123EB] hover:brightness-125 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                                        Voltar
                                    </button>
                                )}
                            </div>
                            <div className="text-center">
                                <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#A123EB] to-[#EB9A07]">
                                    Estúdio de Automação de Conteúdo
                                </h1>
                                <p className="mt-2 text-gray-400 text-sm md:text-base">Gere vídeos e imagens de produtos de alta qualidade com IA.</p>
                            </div>
                            <div className="w-full md:w-32 flex justify-end self-start md:self-center">
                                <button onClick={resetState} className="text-sm text-[#A123EB] hover:brightness-125 transition-all">Começar Novamente</button>
                            </div>
                        </header>
                
                        {workflowState > WorkflowState.IDLE && workflowState < WorkflowState.COMPLETED &&
                            <StepIndicator currentStep={workflowState + 1} />
                        }

                        {error && (
                            <div className="my-4 p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg shadow-lg">
                                <h3 className="font-bold">Ocorreu um Erro</h3>
                                <p className="mt-1 text-sm">{error}</p>
                            </div>
                        )}
                    </>
                )}
                <div className="mt-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default App;