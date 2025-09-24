
import React, { useState, useCallback, useEffect } from 'react';
import { ImageData, UserContextItem, ProductComponent, ContextType } from '../types';
import { UploadIcon, TrashIcon, PlusIcon } from './Icons';

interface ContextAndComponentEditorProps {
    onConfirm: (items: UserContextItem[], sceneCount: number, aspectRatio: '1:1' | '9:16' | '16:9') => void;
    initialComponents: ProductComponent[];
    flowType: 'full' | 'photos';
}

const contextTypeOptions: { value: ContextType; label: string; placeholder: string }[] = [
    { value: 'component', label: 'Peça / Componente', placeholder: 'Ex: Este é o microfone de lapela, ele captura o áudio.' },
    { value: 'usage_reference', label: 'Referência de Uso', placeholder: 'Ex: Mostra como o produto é usado para gravar um podcast.' },
    { value: 'scale_reference', label: 'Referência de Escala', placeholder: 'Ex: Imagem para mostrar o tamanho real do produto na mão.' },
    { value: 'detail_reference', label: 'Referência de Detalhe', placeholder: 'Ex: Foco na parte traseira do produto, mostrando as conexões.' }
];

const aspectRatioOptions: { value: '1:1' | '9:16' | '16:9'; label: string; }[] = [
    { value: '1:1', label: '1:1 (Quadrado)' },
    { value: '9:16', label: '9:16 (Vertical)' },
    { value: '16:9', label: '16:9 (Horizontal)' },
];

export const ContextAndComponentEditor: React.FC<ContextAndComponentEditorProps> = ({ onConfirm, initialComponents, flowType }) => {
    const [contextItems, setContextItems] = useState<UserContextItem[]>([]);
    const [sceneCount, setSceneCount] = useState(3);
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('9:16');

    useEffect(() => {
        const itemsFromAnalysis = initialComponents.map((comp, index): UserContextItem => ({
            id: `comp-${index}-${Date.now()}`,
            imageData: null,
            type: 'component',
            description: comp.description,
            name: comp.name
        }));
        setContextItems(itemsFromAnalysis);
    }, [initialComponents]);

    const fileToImageData = (file: File): Promise<ImageData> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve({
                    base64: base64String.split(',')[1],
                    mimeType: file.type,
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };
    
    const handleItemChange = (id: string, field: 'type' | 'description' | 'name', value: string) => {
        setContextItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };
    
    const handleItemImageUpload = async (id: string, file: File) => {
        const imageData = await fileToImageData(file);
        setContextItems(prev => prev.map(item => item.id === id ? { ...item, imageData } : item));
    };

    const handleAddNewItem = () => {
        const newItem: UserContextItem = {
            id: `item-new-${Date.now()}`,
            imageData: null,
            type: 'usage_reference',
            description: '',
            name: ''
        };
        setContextItems(prev => [...prev, newItem]);
    };

    const handleDeleteItem = (id: string) => {
        setContextItems(prev => prev.filter(item => item.id !== id));
    };

    const isFullFlow = flowType === 'full';

    return (
        <div className="max-w-4xl mx-auto bg-stone-800/50 border border-[#696051] rounded-lg p-6 md:p-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-[#A123EB]">Passo 3: Definir Peças e Contexto</h2>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    {isFullFlow
                        ? "Configure o roteiro e forneça contexto para a IA. Descreva as peças do seu produto e adicione imagens de referência para garantir que a geração seja precisa."
                        : "Forneça contexto e detalhes para a IA criar as melhores imagens do seu produto. Adicione fotos de referência para peças, escala ou uso."
                    }
                </p>
            </div>

            <div className="mb-8 p-6 bg-stone-800 rounded-lg border border-[#696051] space-y-8">
                <div>
                    <label htmlFor="sceneCount" className="block text-lg font-medium text-white mb-3">
                        {isFullFlow ? 'Quantidade de Cenas para o Vídeo' : 'Quantidade de Imagens a Gerar'}
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            id="sceneCount" type="range" min="1" max="6" value={sceneCount}
                            onChange={(e) => setSceneCount(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer"
                            style={{ accentColor: '#A123EB' }}
                        />
                        <span className="text-2xl font-bold text-[#A123EB] w-12 text-center">{sceneCount}</span>
                    </div>
                </div>
                 <div>
                    <label className="block text-lg font-medium text-white mb-3">Proporção da Imagem/Vídeo</label>
                    <fieldset className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <legend className="sr-only">Escolha a proporção</legend>
                        {aspectRatioOptions.map(option => (
                             <div key={option.value} className="relative">
                                <input
                                    type="radio"
                                    id={`ratio-${option.value}`}
                                    name="aspectRatio"
                                    value={option.value}
                                    checked={aspectRatio === option.value}
                                    onChange={(e) => setAspectRatio(e.target.value as '1:1' | '9:16' | '16:9')}
                                    className="peer sr-only"
                                    disabled={isFullFlow && option.value === '1:1'}
                                />
                                <label
                                     htmlFor={`ratio-${option.value}`}
                                     className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors border-[#696051] text-gray-300 peer-checked:border-[#A123EB] peer-checked:bg-[#a123eb20] ${(isFullFlow && option.value === '1:1') ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                >
                                    {option.label}
                                </label>
                            </div>
                        ))}
                    </fieldset>
                     {isFullFlow && <p className="text-xs text-gray-500 mt-2">A proporção 1:1 não é suportada para geração de vídeo. Por favor, selecione uma opção vertical ou horizontal.</p>}
                </div>
            </div>

            <div className="space-y-6 mb-6">
                {contextItems.map((item) => (
                    <div key={item.id} className="bg-stone-800 p-4 rounded-lg border border-[#696051] grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative">
                        <div className="md:col-span-1">
                            <input 
                                type="file" id={`upload-${item.id}`} className="hidden" accept="image/*"
                                onChange={(e) => e.target.files && handleItemImageUpload(item.id, e.target.files[0])}
                            />
                            <label htmlFor={`upload-${item.id}`} className="w-full aspect-square bg-stone-900 rounded-md flex items-center justify-center cursor-pointer border-2 border-dashed border-stone-600 hover:border-[#A123EB] transition-colors">
                                {item.imageData ? (
                                    <img src={`data:${item.imageData.mimeType};base64,${item.imageData.base64}`} alt={item.name || "Contexto"} className="w-full h-full object-cover rounded-md" />
                                ) : (
                                    <div className="text-center text-gray-500 p-2">
                                        <UploadIcon className="w-10 h-10 mx-auto mb-2" />
                                        <span className="text-sm">Clique para enviar a imagem da peça/referência</span>
                                    </div>
                                )}
                            </label>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                             {item.type === 'component' && (
                                <div>
                                    <label htmlFor={`name-${item.id}`} className="block text-sm font-medium text-gray-300 mb-1">Nome da Peça</label>
                                    <input type="text" id={`name-${item.id}`} value={item.name}
                                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                        className="w-full bg-stone-900 border border-[#696051] rounded-md p-2 text-white focus:ring-2 focus:ring-[#A123EB]" />
                                </div>
                            )}
                            <div>
                                <label htmlFor={`type-${item.id}`} className="block text-sm font-medium text-gray-300 mb-1">Tipo de Contexto</label>
                                <select id={`type-${item.id}`} value={item.type}
                                    onChange={(e) => handleItemChange(item.id, 'type', e.target.value as ContextType)}
                                    className="w-full bg-stone-900 border border-[#696051] rounded-md p-2 text-white focus:ring-2 focus:ring-[#A123EB]">
                                    {contextTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`desc-${item.id}`} className="block text-sm font-medium text-gray-300 mb-1">Descrição (Finalidade)</label>
                                <textarea id={`desc-${item.id}`} value={item.description}
                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                    rows={2} placeholder={contextTypeOptions.find(o => o.value === item.type)?.placeholder}
                                    className="w-full bg-stone-900 border border-[#696051] rounded-md p-2 text-white focus:ring-2 focus:ring-[#A123EB]" />
                            </div>
                        </div>
                         <button onClick={() => handleDeleteItem(item.id)}
                            className="absolute top-2 right-2 text-gray-500 hover:text-red-400 transition-colors"
                            aria-label="Deletar item">
                            <TrashIcon className="w-6 h-6" />
                        </button>
                    </div>
                ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
                 <button onClick={handleAddNewItem} className="flex items-center justify-center gap-2 bg-stone-700 hover:bg-stone-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                    <PlusIcon className="w-5 h-5" /> Adicionar Imagem de Contexto
                </button>
                 <button onClick={() => onConfirm(contextItems, sceneCount, aspectRatio)}
                    className="flex-grow bg-[#A123EB] hover:brightness-125 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
                    {isFullFlow ? 'Confirmar e Gerar Roteiro' : 'Confirmar e Gerar Imagens'}
                </button>
            </div>
        </div>
    );
};