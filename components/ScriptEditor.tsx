

import React from 'react';
import { ScriptScene } from '../types';

interface ScriptEditorProps {
    script: ScriptScene[];
    setScript: React.Dispatch<React.SetStateAction<ScriptScene[]>>;
    onConfirm: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ script, setScript, onConfirm }) => {
    
    const handleScriptChange = (id: string, field: 'description' | 'prompt', value: string) => {
        setScript(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const isScriptEmpty = script.length === 0;

    return (
        <div className="max-w-4xl mx-auto bg-stone-800/50 border border-[#696051] rounded-lg p-6 md:p-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-[#A123EB]">Passo 4: Revisar e Editar Roteiro</h2>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    A IA criou um roteiro. Revise cada cena e, se necessário, ajuste a descrição ou o prompt de imagem para garantir que a visão criativa esteja perfeita antes de gerar as imagens.
                </p>
            </div>

            <div className="space-y-6 mb-8">
                {script.sort((a, b) => a.sceneNumber - b.sceneNumber).map(scene => (
                    <div key={scene.id} className="bg-stone-800 p-4 rounded-lg border border-[#696051]">
                        <h3 className="text-lg font-semibold text-white mb-4">Cena {scene.sceneNumber}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor={`desc-${scene.id}`} className="block text-sm font-medium text-gray-300 mb-1">Descrição da Cena (Objetivo)</label>
                                <textarea
                                    id={`desc-${scene.id}`}
                                    value={scene.description}
                                    onChange={(e) => handleScriptChange(scene.id, 'description', e.target.value)}
                                    rows={2}
                                    className="w-full bg-stone-900 border border-[#696051] rounded-md p-2 text-white focus:ring-2 focus:ring-[#A123EB]"
                                />
                            </div>
                             <div>
                                <label htmlFor={`prompt-${scene.id}`} className="block text-sm font-medium text-gray-300 mb-1">Prompt de Geração da Imagem</label>
                                <textarea
                                    id={`prompt-${scene.id}`}
                                    value={scene.prompt}
                                    onChange={(e) => handleScriptChange(scene.id, 'prompt', e.target.value)}
                                    rows={4}
                                    className="w-full bg-stone-900 border border-[#696051] rounded-md p-2 text-white focus:ring-2 focus:ring-[#A123EB]"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 border-t border-[#696051] pt-6">
                 <p className="text-center text-sm text-gray-400 mb-4">Quando estiver satisfeito com o roteiro, clique abaixo para gerar as imagens.</p>
                <div className="flex justify-center">
                    <button
                        onClick={onConfirm}
                        disabled={isScriptEmpty}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 disabled:bg-stone-600 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        Confirmar e Gerar Storyboard (Imagens)
                    </button>
                </div>
            </div>
        </div>
    );
};