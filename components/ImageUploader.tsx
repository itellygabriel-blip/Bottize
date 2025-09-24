import React, { useState, useCallback } from 'react';
import { UploadIcon } from './Icons';

interface ImageUploaderProps {
    onImageUpload: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            if(files[0].type.startsWith('image/')){
                onImageUpload(files[0]);
            }
        }
    }, [onImageUpload]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
             if(files[0].type.startsWith('image/')){
                onImageUpload(files[0]);
            }
        }
    };

    return (
        <div 
            className={`max-w-xl mx-auto p-8 border-2 border-dashed rounded-xl transition-all duration-300 ${isDragging ? 'border-[#A123EB] bg-stone-800' : 'border-[#696051] bg-stone-800/50'}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center text-center cursor-pointer">
                <UploadIcon className="w-16 h-16 text-stone-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-200">Arraste e solte a imagem do seu produto aqui</h3>
                <p className="text-gray-400 mt-1">ou clique para procurar</p>
                <p className="text-sm text-gray-500 mt-4">Formatos aceitos: PNG, JPG, WEBP</p>
            </label>
        </div>
    );
};