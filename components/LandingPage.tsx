

import React from 'react';
import { FilmIcon, CameraIcon } from './Icons';

type AppMode = 'full' | 'photos';

interface LandingPageProps {
  onSelectMode: (mode: AppMode) => void;
}

const options = [
  {
    mode: 'full' as AppMode,
    title: 'Fluxo Completo de Vídeo',
    description: 'Comece com uma foto de produto e gere um roteiro, storyboard e clipes de vídeo curtos.',
    icon: <FilmIcon className="w-12 h-12 mb-4 text-[#A123EB]" />,
    hoverBorder: 'hover:border-[#A123EB]'
  },
  {
    mode: 'photos' as AppMode,
    title: 'Gerador de Imagens',
    description: 'Use a IA para criar imagens de produtos de alta qualidade para marketing e listagens.',
    icon: <CameraIcon className="w-12 h-12 mb-4 text-[#EB9A07]" />,
    hoverBorder: 'hover:border-[#EB9A07]'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectMode }) => {
  return (
    <div className="bg-stone-900 text-gray-200 min-h-screen flex flex-col items-center justify-center p-4">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#A123EB] to-[#EB9A07]">
          Estúdio de Automação de Conteúdo
        </h1>
        <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
          Escolha seu ponto de partida para criar vídeos e imagens incríveis com o poder da IA.
        </p>
      </header>
      <main className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {options.map((opt) => (
          <div
            key={opt.mode}
            onClick={() => onSelectMode(opt.mode)}
            className={`bg-stone-800 rounded-xl border border-[#696051] p-8 text-center flex flex-col items-center transform transition-all duration-300 hover:scale-105 ${opt.hoverBorder} hover:shadow-2xl hover:shadow-black/20 cursor-pointer`}
          >
            {opt.icon}
            <h2 className="text-2xl font-bold text-white mb-2">{opt.title}</h2>
            <p className="text-gray-400 flex-grow">{opt.description}</p>
          </div>
        ))}
      </main>
       <footer className="text-center mt-16 text-gray-500 text-sm">
          Desenvolvido com a API Google Gemini
      </footer>
    </div>
  );
};