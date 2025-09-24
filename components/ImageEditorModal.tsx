
import React, { useState, useRef, MouseEvent } from 'react';
import { ImageData } from '../types';
import { Loader } from './Loader';
import { XCircleIcon } from './Icons';

interface ImageEditorModalProps {
    image: ImageData;
    isOpen: boolean;
    isEditing: boolean;
    onClose: () => void;
    onEditSubmit: (editPrompt: string) => void;
}

const quickEdits = [
    { label: "Desfocar Fundo", prompt: "Desfoque o fundo para destacar o produto, mantendo o produto principal em foco total." },
    { label: "Aumentar Brilho", prompt: "Aumente o brilho e o contraste da imagem para torná-la mais vibrante, sem alterar os objetos." },
    { label: "Mais Saturação", prompt: "Aumente a saturação das cores para um visual mais vivo." },
];

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ image, isOpen, isEditing, onClose, onEditSubmit }) => {
    const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
    const [prompt, setPrompt] = useState('');
    const imageRef = useRef<HTMLImageElement>(null);

    const handleImageClick = (e: MouseEvent<HTMLImageElement>) => {
        if (imageRef.current) {
            const rect = imageRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setClickPos({ x, y });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            const positionalPrompt = clickPos 
                ? `Na posição (${Math.round(clickPos.x)}%, ${Math.round(clickPos.y)}% do canto superior esquerdo), ${prompt}. Mantenha o resto da imagem exatamente como está.` 
                : prompt;
            onEditSubmit(positionalPrompt);
        }
    };

    const handleClose = () => {
        setClickPos(null);
        setPrompt('');
        onClose();
    };

    const handleQuickEdit = (quickPrompt: string) => {
        setPrompt(quickPrompt);
        setClickPos(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity" onClick={handleClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-4 relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute -top-3 -right-3 text-white bg-gray-900 rounded-full">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                         <img 
                            ref={imageRef}
                            src={`data:${image.mimeType};base64,${image.base64}`} 
                            alt="Alvo de edição" 
                            className="rounded-lg w-full h-auto cursor-crosshair"
                            onClick={handleImageClick}
                        />
                        {clickPos && (
                             <div 
                                className="absolute rounded-full w-5 h-5 bg-purple-500 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 pointer-events-none ring-4 ring-purple-500/50 animate-pulse"
                                style={{ left: `${clickPos.x}%`, top: `${clickPos.y}%` }}
                             ></div>
                        )}
                         {isEditing && (
                            <div className="absolute inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center rounded-lg">
                                <Loader />
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-2">Editar Imagem</h3>
                        <p className="text-gray-400 mb-4">Clique em um ponto na imagem e descreva a alteração que deseja fazer, ou use uma edição rápida.</p>
                        <form onSubmit={handleSubmit}>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={clickPos ? "ex: 'adicione uma borboleta pequena aqui'" : "ex: 'deixe o fundo mais claro'"}
                                className="w-full h-28 p-3 bg-gray-900 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                disabled={isEditing}
                            ></textarea>
                            <div className="mt-3">
                                <p className="text-sm text-gray-400 mb-2">Sugestões de Edição Rápida:</p>
                                <div className="flex flex-wrap gap-2">
                                    {quickEdits.map(edit => (
                                        <button 
                                            key={edit.label}
                                            type="button"
                                            onClick={() => handleQuickEdit(edit.prompt)}
                                            className="px-3 py-1 bg-gray-700 text-gray-200 text-sm rounded-full hover:bg-gray-600 transition-colors"
                                            disabled={isEditing}
                                        >
                                            {edit.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed"
                                disabled={!prompt.trim() || isEditing}
                            >
                                {isEditing ? 'Aplicando Edição...' : 'Aplicar Edição'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
