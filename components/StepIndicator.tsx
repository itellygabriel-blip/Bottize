

import React from 'react';

const steps = [
    "Envio", 
    "Análise", 
    "Contexto",
    "Roteiro", 
    "Aprovação",
    "Geração", 
    "Revisão", 
    "Finalizar",
];

interface StepIndicatorProps {
    currentStep: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
    const adjustedCurrentStep = Math.min(currentStep, steps.length);

    return (
        <div className="w-full max-w-6xl mx-auto mb-12 overflow-x-auto pb-4">
            <div className="flex items-start justify-between min-w-max gap-2 sm:gap-0">
                {steps.map((step, index) => {
                    const isCompleted = adjustedCurrentStep > index + 1;
                    const isActive = adjustedCurrentStep === index + 1;

                    return (
                        <React.Fragment key={step}>
                            <div className="flex flex-col items-center text-center px-1 w-20">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${isCompleted ? 'bg-[#A123EB] border-[#a123eb90]' : isActive ? 'bg-[#a123ebdd] border-[#a123eb] animate-pulse' : 'bg-stone-700 border-[#696051]'}`}>
                                    {isCompleted ? (
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    ) : (
                                        <span className={`font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>{index + 1}</span>
                                    )}
                                </div>
                                <p className={`mt-2 text-xs md:text-sm font-medium leading-tight ${isCompleted || isActive ? 'text-white' : 'text-gray-500'}`}>{step}</p>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-1 mt-5 rounded ${isCompleted ? 'bg-[#A123EB]' : 'bg-[#696051]'}`}></div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};