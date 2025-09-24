


import React, { useState, useEffect } from 'react';
import { GeneratedImage, WorkflowState, GeneratedVideo } from '../types';
import { Loader } from './Loader';
import { SparklesIcon, DownloadIcon, StarIcon, CheckCircleIcon, XCircleIcon, CheckBadgeIcon, PlusIcon, ArrowPathIcon, ClapperboardIcon, ExclamationTriangleIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface ImageGenerationGridProps {
    images: GeneratedImage[];
    videos: GeneratedVideo[];
    state: WorkflowState;
    onUserApprove: (id: string) => void;
    onUserReject: (id: string) => void;
    onRegenerate: (id: string, feedback: string) => void;
    onRetryGeneration: (id: string) => void;
    onAddNewScene: () => void;
    isAddingScene: boolean;
    onGenerateVideo: (imageId: string) => void;
}

const StarRating: React.FC<{ score: number }> = ({ score }) => {
    return (
        <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className={`w-5 h-5 ${i < score ? 'text-[#EB9A07]' : 'text-stone-600'}`} />
            ))}
        </div>
    );
};

const ImageCard: React.FC<{ 
    image: GeneratedImage;
    video?: GeneratedVideo;
    onUserApprove: () => void; 
    onUserReject: () => void;
    onRegenerate: (feedback: string) => void;
    onRetry: () => void;
    onGenerateVideo: () => void;
}> = ({ image, video, onUserApprove, onUserReject, onRegenerate, onRetry, onGenerateVideo }) => {
    const [feedback, setFeedback] = useState('');
    const [showVideo, setShowVideo] = useState(true);
    
    const videoIsComplete = video && video.status === 'COMPLETED' && video.blobUrl;

    useEffect(() => {
        setShowVideo(!!videoIsComplete);
    }, [videoIsComplete]);


    const getBorderColor = () => {
        switch (image.status) {
            case 'USER_APPROVED': return 'border-green-500';
            case 'USER_REJECTED': return 'border-red-500';
            case 'AI_APPROVED': return 'border-[#A123EB]';
            case 'AI_REJECTED':
                 if (image.review && image.review.score === 3) return 'border-[#EB9A07]';
                 return 'border-rose-500';
            case 'FAILED': return 'border-red-600';
            default: return 'border-[#696051]';
        }
    };

    const handleDownloadImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!image.imageData) return;
        const link = document.createElement('a');
        link.href = `data:${image.imageData.mimeType};base64,${image.imageData.base64}`;
        const fileExtension = image.imageData.mimeType.split('/')[1] || 'png';
        link.download = `imagem-gerada-${image.id}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleRegenerateClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (feedback.trim()) {
            onRegenerate(feedback);
        }
    };

    const needsReview = image.status === 'AI_APPROVED' || image.status === 'AI_REJECTED';
    const isUserRejected = image.status === 'USER_REJECTED';
    const isUserApproved = image.status === 'USER_APPROVED';
    const isFailed = image.status === 'FAILED';
    const videoIsGenerating = video && video.status === 'GENERATING';
    const videoFailed = video && video.status === 'FAILED';

    return (
        <div className={`bg-stone-800 rounded-lg shadow-md overflow-hidden border-2 ${getBorderColor()} flex flex-col`}>
            <div className="relative w-full aspect-square bg-stone-900 flex items-center justify-center">
                {isFailed ? (
                    <div className="text-center p-4">
                        <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto" />
                        <p className="text-red-400 mt-2 text-sm font-semibold">Falha na Geração</p>
                        <p className="text-gray-400 mt-1 text-xs">{image.errorMessage}</p>
                    </div>
                ) : videoIsComplete ? (
                    <>
                        {showVideo ? (
                            <video src={video.blobUrl} controls className="object-cover w-full h-full" />
                        ) : (
                            image.imageData && <img src={`data:${image.imageData.mimeType};base64,${image.imageData.base64}`} alt={image.prompt} className="object-cover w-full h-full" />
                        )}
                        <button 
                            onClick={() => setShowVideo(false)} 
                            title="Ver imagem base"
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all disabled:opacity-20 disabled:cursor-not-allowed z-10"
                            disabled={!showVideo}
                        >
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={() => setShowVideo(true)} 
                            title="Ver vídeo gerado"
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-all disabled:opacity-20 disabled:cursor-not-allowed z-10"
                            disabled={showVideo}
                        >
                            <ChevronRightIcon className="w-6 h-6" />
                        </button>
                    </>
                ) : image.imageData ? (
                    <img src={`data:${image.imageData.mimeType};base64,${image.imageData.base64}`} alt={image.prompt} className="object-cover w-full h-full" />
                ) : (
                    <div className="text-center p-4">
                        <Loader />
                        <p className="text-gray-400 mt-2 text-sm">{image.status === 'PENDING' ? 'Na fila...' : image.status === 'REVIEWING' ? 'Analisando...' : 'Gerando...'}</p>
                    </div>
                )}
                 {image.status === 'USER_APPROVED' && !videoIsComplete && <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckBadgeIcon className="w-4 h-4"/> Aprovado</div>}
                 {videoIsComplete && <div className="absolute top-2 right-2 bg-[#A123EB] text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><ClapperboardIcon className="w-4 h-4"/> Vídeo Gerado</div>}
                 {image.status === 'USER_REJECTED' && <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><XCircleIcon className="w-4 h-4"/> Rejeitado</div>}
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <div className="mb-4">
                    <p className="text-xs text-[#A123EB] font-semibold flex items-center gap-1.5"><SparklesIcon className="w-4 h-4" /> Cena do Roteiro</p>
                    <p className="text-gray-300 text-sm mt-1">{image.painPoint}</p>
                </div>
                
                <div className="mt-auto pt-4 border-t border-[#696051] space-y-3">
                    {image.review && (
                         <div>
                            <div className="flex items-center justify-between mb-1">
                                <p className={`text-xs font-semibold text-[#A123EB]`}>Análise da IA</p>
                                <StarRating score={image.review.score} />
                            </div>
                             <p className="text-gray-400 text-sm">{image.review.reason}</p>
                        </div>
                    )}
                    {isFailed && (
                        <div className="pt-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onRetry(); }}
                                className="w-full text-sm text-center py-2 px-3 rounded-md bg-[#EB9A07] hover:brightness-110 text-black font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                Tentar Novamente
                            </button>
                        </div>
                    )}
                    {isUserRejected && (
                        <div className="space-y-2 pt-2">
                            <label htmlFor={`feedback-${image.id}`} className="block text-sm font-medium text-gray-300">
                                O que você quer mudar?
                            </label>
                            <textarea
                                id={`feedback-${image.id}`}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Ex: 'O produto está da cor errada', 'a cena precisa de mais luz'"
                                rows={3}
                                className="w-full bg-stone-900 border border-[#696051] rounded-md p-2 text-white focus:ring-2 focus:ring-[#A123EB]"
                            />
                            <button
                                onClick={handleRegenerateClick}
                                disabled={!feedback.trim()}
                                className="w-full text-sm text-center py-2 px-3 rounded-md bg-[#A123EB] hover:brightness-125 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:bg-stone-600 disabled:cursor-not-allowed"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                Gerar Novamente com Feedback
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                         {needsReview && (
                            <>
                                <button onClick={onUserApprove} className="flex-grow text-sm font-bold text-center py-2 px-3 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center justify-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    Aprovar
                                </button>
                                <button onClick={onUserReject} className="flex-grow text-sm font-bold text-center py-2 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2">
                                    <XCircleIcon className="w-5 h-5" />
                                    Rejeitar
                                </button>
                            </>
                         )}
                         {isUserApproved && (
                             <div className="w-full flex flex-col gap-2">
                                {videoIsGenerating ? (
                                    <div className="w-full text-sm text-center py-2 px-3 rounded-md bg-stone-700 text-[#A123EB] flex items-center justify-center gap-2">
                                        <Loader /> Gerando Vídeo...
                                    </div>
                                ) : videoIsComplete ? (
                                    <a href={video.blobUrl} download={`video-${image.id}.mp4`} className="w-full text-sm font-bold text-center py-2 px-3 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center justify-center gap-2">
                                        <DownloadIcon className="w-5 h-5" /> Baixar Vídeo
                                    </a>
                                ) : (
                                    <button onClick={onGenerateVideo} className="w-full text-sm font-bold text-center py-2 px-3 rounded-md bg-[#A123EB] hover:brightness-125 text-white transition-all flex items-center justify-center gap-2">
                                        <ClapperboardIcon className="w-5 h-5" /> Gerar Vídeo
                                    </button>
                                )}
                                {videoFailed && (
                                    <p className="text-xs text-center text-red-400">
                                        Ocorreu um erro ao gerar.
                                        {video.errorMessage && <span className="block mt-1 text-stone-500">{video.errorMessage}</span>}
                                    </p>
                                )}
                                <button onClick={handleDownloadImage} className="w-full text-sm font-bold text-center py-2 px-3 rounded-md bg-stone-600 hover:bg-stone-500 text-white transition-colors flex items-center justify-center gap-2">
                                    <DownloadIcon className="w-5 h-5" /> Baixar Imagem
                                </button>
                            </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AddSceneCard: React.FC<{ onClick: () => void; isLoading: boolean; }> = ({ onClick, isLoading }) => (
    <div 
        onClick={!isLoading ? onClick : undefined}
        className={`bg-stone-800 rounded-lg shadow-md border-2 border-dashed border-[#696051] flex flex-col items-center justify-center text-center p-6 transition-all hover:border-[#A123EB] hover:bg-stone-700/50 ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ minHeight: '400px' }}
    >
        {isLoading ? (
            <>
                <Loader />
                <p className="text-gray-300 mt-4 text-lg">Criando nova cena...</p>
            </>
        ) : (
            <>
                <PlusIcon className="w-16 h-16 text-stone-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-200">Adicionar Nova Cena</h3>
                <p className="text-gray-400 mt-1">A IA irá sugerir uma nova cena para o seu storyboard.</p>
            </>
        )}
    </div>
);

export const ImageGenerationGrid: React.FC<ImageGenerationGridProps> = ({ images, videos, state, onUserApprove, onUserReject, onRegenerate, onAddNewScene, isAddingScene, onGenerateVideo, onRetryGeneration }) => {
    const loadingStates = [
        WorkflowState.GENERATING_SCRIPT,
        WorkflowState.GENERATING_IMAGES,
        WorkflowState.REVIEWING_IMAGES
    ];

    if (images.length === 0 && loadingStates.includes(state)) {
        return (
            <div className="flex flex-col items-center justify-center bg-stone-800/50 p-8 rounded-lg">
                <Loader />
                <p className="text-gray-300 mt-4 text-lg text-center">
                    {state === WorkflowState.GENERATING_SCRIPT && "Criando um roteiro de vídeo inteligente..."}
                    {state === WorkflowState.GENERATING_IMAGES && "Gerando o storyboard visual..."}
                    {state === WorkflowState.REVIEWING_IMAGES && "Realizando controle de qualidade nas imagens..."}
                </p>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
            {images.map((image) => {
                const video = videos.find(v => v.imageId === image.id);
                return (
                    <ImageCard 
                        key={image.id} 
                        image={image}
                        video={video}
                        onUserApprove={() => onUserApprove(image.id)}
                        onUserReject={() => onUserReject(image.id)}
                        onRegenerate={(feedback) => onRegenerate(image.id, feedback)}
                        onRetry={() => onRetryGeneration(image.id)}
                        onGenerateVideo={() => onGenerateVideo(image.id)}
                    />
                );
            })}
            {state === WorkflowState.USER_APPROVAL && (
                <AddSceneCard onClick={onAddNewScene} isLoading={isAddingScene} />
            )}
        </div>
    );
};