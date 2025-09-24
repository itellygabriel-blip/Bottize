import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { ImageAnalysis, ImageData, ProductComponent, ReviewResult, ScriptScene, UserContextItem } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        productName: { type: Type.STRING, description: "O nome específico do produto em Português." },
        description: { type: Type.STRING, description: "Um breve resumo em Português do que é o produto e sua função principal." },
        features: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista de características chave, como material, textura e especificações técnicas." },
        targetAudience: { type: Type.STRING, description: "O público-alvo potencial para este produto." },
        painPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista de problemas ou 'dores' que este produto resolve para o usuário." },
        components: {
            type: Type.ARRAY, items: {
                type: Type.OBJECT, properties: {
                    name: { type: Type.STRING, description: "O nome da peça ou componente individual." },
                    description: { type: Type.STRING, description: "Uma breve descrição da função ou aparência deste componente." },
                    scale: { type: Type.STRING, description: "Descrição do tamanho do componente em relação ao seu uso (ex: 'cabe na mão', 'usável na lapela', 'tamanho de mesa')." }
                }, required: ["name", "description", "scale"]
            }, description: "Uma lista de componentes distintos e individuais que compõem o produto. Apenas para produtos com várias partes."
        }
    },
    required: ["productName", "description", "features", "targetAudience", "painPoints"]
};

const scriptSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING, description: "Um identificador único para a cena, ex: 'cena-1'." },
            sceneNumber: { type: Type.INTEGER, description: "O número sequencial da cena (1, 2, 3...)." },
            description: { type: Type.STRING, description: "Uma descrição curta e voltada para o usuário sobre o objetivo da cena, ligada a uma dor ou benefício." },
            prompt: { type: Type.STRING, description: "Um prompt detalhado e criativo em Português para o modelo de geração de imagem. Deve descrever uma cena completa, estilo de vida ou caso de uso para o produto. Não inclua texto na imagem. A cena deve ser visualmente rica e envolvente." }
        },
        required: ["id", "sceneNumber", "description", "prompt"]
    }
};

const singleScriptSceneSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "Um identificador único para a cena, ex: 'cena-1'." },
        sceneNumber: { type: Type.INTEGER, description: "O número sequencial da cena (1, 2, 3...)." },
        description: { type: Type.STRING, description: "Uma descrição curta e voltada para o usuário sobre o objetivo da cena, ligada a uma dor ou benefício." },
        prompt: { type: Type.STRING, description: "Um prompt detalhado e criativo em Português para o modelo de geração de imagem. Deve descrever uma cena completa, estilo de vida ou caso de uso para o produto. Não inclua texto na imagem. A cena deve ser visualmente rica e envolvente." }
    },
    required: ["id", "sceneNumber", "description", "prompt"]
};

const reviewSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.INTEGER, description: "Uma pontuação de fidelidade de 1 (muito ruim) a 5 (réplica perfeita) comparando o produto na imagem gerada com o original." },
        reason: { type: Type.STRING, description: "Uma breve justificativa, passo a passo, para a pontuação, observando aspectos positivos e quaisquer discrepâncias." }
    },
    required: ["score", "reason"]
};

export async function analyzeImage(imageData: ImageData): Promise<ImageAnalysis> {
    const prompt = `Analise esta imagem de produto. Identifique o que é, seu propósito, características principais (material, textura), público-alvo potencial e os problemas (pontos de dor) que ele resolve. Se o produto consistir em várias partes distintas (como um kit), identifique cada componente individual, sua função e sua escala no mundo real (ex: 'portátil', 'pequeno o suficiente para a gola de uma camisa'). Forneça a saída no formato JSON solicitado, em Português.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { data: imageData.base64, mimeType: imageData.mimeType } }, { text: prompt }] },
        config: { responseMimeType: 'application/json', responseSchema: analysisSchema }
    });
    try { return JSON.parse(response.text) as ImageAnalysis; }
    catch (e) { console.error("Failed to parse analysis JSON:", response.text); throw new Error("A análise da IA retornou um formato inválido."); }
}

function getContextTypeName(type: string): string {
    switch (type) {
        case 'component': return 'Peça/Componente';
        case 'usage_reference': return 'Referência de Uso';
        case 'scale_reference': return 'Referência de Escala';
        case 'detail_reference': return 'Referência de Detalhe/Parte Traseira';
        default: return 'Contexto';
    }
}

export async function generateScript(analysis: ImageAnalysis, numberOfScenes: number, contextItems: UserContextItem[]): Promise<ScriptScene[]> {
    
    const contextPrompts = contextItems.map(item => {
        return `- Tipo: ${getContextTypeName(item.type)}\n  - Nome/Título: ${item.name || 'N/A'}\n  - Descrição Fornecida pelo Usuário: ${item.description}`;
    }).join('\n');

    const contextInstruction = `
INSTRUÇÃO CRÍTICA SOBRE CONTEXTO: O usuário forneceu as seguintes imagens de contexto com descrições.
Use estas imagens APENAS como referência visual para os detalhes específicos descritos (peças, escala, uso, detalhes).
NÃO copie o fundo, o estilo ou a cena inteira dessas imagens de referência. Sua tarefa é criar CENAS NOVAS E ORIGINAIS que incorporem o produto com fidelidade, usando o contexto apenas para acertar os detalhes.

Contexto Fornecido:
${contextPrompts || "Nenhum contexto visual adicional fornecido."}
`;

    const prompt = `
        Sua tarefa é atuar como um diretor de criação para um anúncio em vídeo no estilo User-Generated Content (UGC) para um produto.
        Baseado na análise do produto e no contexto fornecido pelo usuário, crie um roteiro de ${numberOfScenes} cenas.
        O idioma de toda a sua saída deve ser Português do Brasil.

        REGRAS DE CRIAÇÃO DO ROTEIRO:
        1.  **Foco na Dor/Solução:** Cada cena deve resolver um 'ponto de dor' (pain point) do cliente ou destacar um benefício chave.
        2.  **Mostrar, não Contar:** As cenas devem mostrar as funcionalidades do produto que resolvem aquela dor.
        3.  **Variedade de Cenas:** O roteiro DEVE incluir uma mistura dos seguintes tipos de cena:
            - Pelo menos uma cena de ÊNFASE/ZOOM em uma parte específica e importante do produto.
            - Cenas mostrando PEÇAS/COMPONENTES individuais em uso, se o produto tiver várias partes.
            - Se o produto exigir MONTAGEM, inclua uma cena do produto sendo montado.
            - Cenas de ESTILO DE VIDA/USO que mostrem o produto em um ambiente realista.
        4.  **Prompts de Imagem Detalhados:** Para cada cena, forneça um prompt detalhado e criativo para uma IA de geração de imagem. O prompt deve descrever um cenário completo e visualmente atraente.
        5.  **Requisitos do Prompt:** Todos os prompts de imagem devem ser para imagens com proporção 1:1, ter um fundo ambiental e NÃO devem conter NENHUM texto.
        6.  **Fidelidade do Produto:** A principal prioridade é garantir 100% de fidelidade à aparência do produto original e suas peças.
        7.  **Segurança do Conteúdo:** O prompt de imagem gerado deve ser adequado para todos os públicos e não deve conter palavras ou conceitos que possam ser considerados sensíveis, violentos, ou que violem as políticas de IA responsável. Evite linguagem que possa ser interpretada de forma negativa.

        ${contextInstruction}

        Análise do Produto:
        ${JSON.stringify(analysis, null, 2)}

        Agora, gere o roteiro como um array JSON seguindo o esquema especificado.
    `;

    const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [{ text: prompt }];
    for (const item of contextItems) {
        if (item.imageData) {
            const contextHeader = `Contexto Visual para '${item.name || getContextTypeName(item.type)}':`;
            parts.push({ text: contextHeader });
            parts.push({ inlineData: { data: item.imageData.base64, mimeType: item.imageData.mimeType } });
        }
    }
    const contents = { parts };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { responseMimeType: 'application/json', responseSchema: scriptSchema }
    });
    try { return JSON.parse(response.text) as ScriptScene[]; }
    catch (e) { console.error("Failed to parse script JSON:", response.text); throw new Error("A geração de roteiro da IA retornou um formato inválido."); }
}

export async function generatePhotoPrompts(analysis: ImageAnalysis, numberOfPhotos: number, contextItems: UserContextItem[]): Promise<ScriptScene[]> {
    const contextPrompts = contextItems.map(item => {
        return `- Tipo: ${getContextTypeName(item.type)}\n  - Nome/Título: ${item.name || 'N/A'}\n  - Descrição Fornecida pelo Usuário: ${item.description}`;
    }).join('\n');

    const contextInstruction = `
INSTRUÇÃO CRÍTICA SOBRE CONTEXTO: O usuário forneceu imagens de contexto. Use-as APENAS como referência visual para detalhes (peças, escala, uso).
NÃO copie o fundo ou a cena. Sua tarefa é criar FOTOS NOVAS E ORIGINAIS.

Contexto Fornecido:
${contextPrompts || "Nenhum contexto visual adicional fornecido."}
`;
    
    const prompt = `
        Sua tarefa é atuar como um diretor de fotografia para uma sessão de fotos de um produto.
        Baseado na análise do produto e no contexto, crie uma lista de ${numberOfPhotos} ideias de fotos.
        O idioma de toda a sua saída deve ser Português do Brasil.

        REGRAS DE CRIAÇÃO DOS PROMPTS:
        1.  **Variedade de Fotos:** A lista DEVE incluir uma mistura de tipos de fotos:
            - Close-ups de detalhes do produto.
            - Fotos de estilo de vida mostrando o produto em uso.
            - Fotos em ambiente neutro (estúdio) se aplicável.
            - Fotos que destacam características ou componentes específicos.
        2.  **Prompts de Imagem Detalhados:** Para cada ideia, forneça um prompt detalhado e criativo para uma IA de geração de imagem. A "descrição" deve explicar o objetivo da foto.
        3.  **Requisitos do Prompt:** Todos os prompts de imagem devem ser para imagens com proporção 1:1, ter um fundo apropriado e NÃO devem conter NENHUM texto.
        4.  **Fidelidade do Produto:** A prioridade máxima é garantir 100% de fidelidade à aparência do produto original.
        5.  **Segurança do Conteúdo:** O prompt deve ser seguro para todos os públicos.

        ${contextInstruction}

        Análise do Produto:
        ${JSON.stringify(analysis, null, 2)}

        Agora, gere a lista de prompts de fotos como um array JSON seguindo o esquema especificado.
    `;
    
    const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [{ text: prompt }];
    for (const item of contextItems) {
        if (item.imageData) {
            const contextHeader = `Contexto Visual para '${item.name || getContextTypeName(item.type)}':`;
            parts.push({ text: contextHeader });
            parts.push({ inlineData: { data: item.imageData.base64, mimeType: item.imageData.mimeType } });
        }
    }
    const contents = { parts };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { responseMimeType: 'application/json', responseSchema: scriptSchema }
    });
    try { return JSON.parse(response.text) as ScriptScene[]; }
    catch (e) { console.error("Failed to parse photo prompts JSON:", response.text); throw new Error("A geração de prompts de foto da IA retornou um formato inválido."); }
}


export async function createImage(originalImage: ImageData, prompt: string, contextImages?: (ImageData | null)[]): Promise<ImageData> {
    const validContextImages = (contextImages || []).filter((img): img is ImageData => img !== null);

    // Reformulated prompt to be more direct for an image editing model.
    const fullPrompt = `
Sua tarefa é editar a primeira imagem fornecida (a imagem do produto).
Pegue o produto principal da primeira imagem e coloque-o em uma cena completamente nova, conforme descrito abaixo.

**Descrição da Cena:** ${prompt}

**REGRAS IMPORTANTES:**
1.  **Fidelidade do Produto:** O produto na imagem final deve ser 100% idêntico ao produto na primeira imagem (a imagem original). Não altere sua forma, cor, textura ou quaisquer detalhes.
2.  **Use o Contexto:** As imagens subsequentes são referências visuais para escala, proporção e detalhes. Use-as para garantir que o produto seja retratado com precisão na nova cena.
3.  **Não Copie Fundos de Referência:** NÃO copie as cenas ou fundos das imagens de referência. Crie uma cena nova e original com base na **Descrição da Cena**.
`;

    const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [
        { inlineData: { data: originalImage.base64, mimeType: originalImage.mimeType } },
        { text: fullPrompt },
        ...validContextImages.map(img => ({ inlineData: { data: img.base64, mimeType: img.mimeType } }))
    ];
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
    if (imagePart && imagePart.inlineData) {
        return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
    }
    console.error("Image Generation Response Failed:", JSON.stringify(response, null, 2));
    throw new Error("A geração de imagem falhou. A IA não retornou uma imagem.");
}

export async function regenerateImage(originalImage: ImageData, previousImage: ImageData, prompt: string, feedback: string, contextImages?: (ImageData|null)[]): Promise<ImageData> {
    const fullPrompt = `Você é um editor de imagens especialista. A primeira imagem fornecida é uma tentativa anterior que precisa de correções. Sua tarefa é gerar uma NOVA imagem que incorpore o feedback do usuário.

- **Feedback do Usuário:** Aplique as seguintes correções: "${feedback}".
- **Prompt Original (Objetivo da Cena):** Lembre-se do objetivo original da cena: "${prompt}".

INSTRUÇÃO DE CONTEXTO: As imagens subsequentes são para referência. A primeira delas é a imagem do produto original (use-a para manter 100% de fidelidade do produto), e as outras são contexto adicional de escala ou uso. 
Preserve a composição geral da cena o máximo possível, aplicando apenas as alterações solicitadas pelo feedback.`;
    
    const validContextImages = (contextImages || []).filter((img): img is ImageData => img !== null);
    const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [
        // A imagem a ser editada vem primeiro
        { inlineData: { data: previousImage.base64, mimeType: previousImage.mimeType } },
        // O prompt vem em segundo, explicando o que fazer e o papel das imagens seguintes
        { text: fullPrompt },
        // A imagem original do produto para referência de fidelidade
        { inlineData: { data: originalImage.base64, mimeType: originalImage.mimeType } },
        // Imagens de contexto adicionais
        ...validContextImages.map(img => ({ inlineData: { data: img.base64, mimeType: img.mimeType } }))
    ];
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
    if (imagePart && imagePart.inlineData) {
        return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
    }
    console.error("Image Regeneration Response Failed:", JSON.stringify(response, null, 2));
    throw new Error("A regeneração da imagem falhou. A IA não retornou uma imagem.");
}


export async function reviewImage(originalImage: ImageData, generatedImage: ImageData, components?: ProductComponent[], contextImages?: (ImageData | null)[]): Promise<ReviewResult> {
    const validContextImages = (contextImages || []).filter((img): img is ImageData => img !== null);
    const componentsChecklist = (components && components.length > 0) ? `CRÍTICO: Use esta lista de verificação para validar os componentes do produto, focando nas proporções e escala corretas.\n${components.map(c => `- '${c.name}' (${c.description}) está presente e representado com precisão na escala correta de '${c.scale}'?`).join('\n')}` : "";
    const contextInstruction = (validContextImages.length > 0) ? `O usuário forneceu imagens de contexto mostrando o tamanho real do produto. Use-as como referência principal para julgar se o produto na imagem gerada (Imagem 2) está proporcionalmente correto.` : "";
    const prompt = `Sua tarefa é atuar como um assistente de Controle de Qualidade meticuloso. Compare o produto principal nestas duas imagens. A Imagem 1 é o original. A Imagem 2 é a recém-gerada. Primeiro, pense passo a passo: 1. A Imagem 2 representa fielmente o produto da Imagem 1 (forma, cor, etc)? 2. O produto está em uma escala realista? ${contextInstruction} 3. ${componentsChecklist} 4. IGNORE o fundo, foque APENAS na fidelidade do produto. Após sua análise, forneça uma pontuação final (1-5) e um breve resumo do seu raciocínio. Forneça a saída no formato JSON solicitado.`;
    const parts = [
        { text: "Imagem 1: Produto Original" }, { inlineData: { data: originalImage.base64, mimeType: originalImage.mimeType } },
        { text: "Imagem 2: Imagem Gerada" }, { inlineData: { data: generatedImage.base64, mimeType: generatedImage.mimeType } },
        ...validContextImages.flatMap(img => [{ text: "Imagem de contexto para referência de escala:" }, { inlineData: { data: img.base64, mimeType: img.mimeType } }]),
        { text: prompt },
    ];
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts }, config: { responseMimeType: 'application/json', responseSchema: reviewSchema } });
    try { return JSON.parse(response.text) as ReviewResult; }
    catch (e) { console.error("Failed to parse review JSON:", response.text); throw new Error("A revisão da IA retornou um formato inválido."); }
}

export async function generateSingleScene(analysis: ImageAnalysis, existingScenes: ScriptScene[], contextItems: UserContextItem[]): Promise<ScriptScene> {
    const existingScenesDescriptions = existingScenes.map(s => `- Cena ${s.sceneNumber}: ${s.description}`).join('\n');
    
    const contextPrompts = contextItems.map(item => {
        return `- Tipo: ${getContextTypeName(item.type)}\n  - Nome/Título: ${item.name || 'N/A'}\n  - Descrição Fornecida pelo Usuário: ${item.description}`;
    }).join('\n');

    const contextInstruction = `
INSTRUÇÃO DE CONTEXTO: Use as imagens e descrições de contexto fornecidas pelo usuário como referência visual para detalhes específicos. NÃO copie o fundo ou o estilo dessas imagens. Crie uma CENA NOVA E ORIGINAL.

Contexto Fornecido:
${contextPrompts || "Nenhum contexto visual adicional fornecido."}
`;
    
    const prompt = `
        Sua tarefa é atuar como um diretor de criação e gerar UMA ÚNICA cena nova para um anúncio em vídeo no estilo UGC.
        A cena deve ser criativa, única e diferente de todas as cenas existentes listadas abaixo.
        Baseie a nova cena na análise do produto e no contexto, focando em um ponto de dor não abordado ou em um benefício/característica única.
        O idioma de toda a sua saída deve ser Português do Brasil.
        
        REGRAS:
        1.  **Originalidade:** A nova cena DEVE ser conceitualmente diferente das cenas existentes.
        2.  **Foco:** A cena deve focar em um ponto de dor ou benefício do produto.
        3.  **Prompt de Imagem:** Crie um prompt detalhado para uma IA de geração de imagem. O prompt deve descrever um cenário completo e visualmente atraente. Não deve conter texto.
        4.  **Número da Cena:** Atribua o próximo número de cena sequencial (neste caso, ${existingScenes.length + 1}).
        5.  **Segurança:** O prompt deve ser seguro para todos os públicos.

        ${contextInstruction}

        Análise do Produto:
        ${JSON.stringify(analysis, null, 2)}
        
        Cenas Existentes (NÃO REPITA ESSES CONCEITOS):
        ${existingScenesDescriptions}
        
        Agora, gere a nova cena única como um único objeto JSON, seguindo o esquema especificado.
    `;

    const parts: ({ text: string } | { inlineData: { data: string; mimeType:string; } })[] = [{ text: prompt }];
    for (const item of contextItems) {
        if (item.imageData) {
            const contextHeader = `Contexto Visual para '${item.name || getContextTypeName(item.type)}':`;
            parts.push({ text: contextHeader });
            parts.push({ inlineData: { data: item.imageData.base64, mimeType: item.imageData.mimeType } });
        }
    }
    const contents = { parts };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { responseMimeType: 'application/json', responseSchema: singleScriptSceneSchema }
    });
    try { 
        return JSON.parse(response.text) as ScriptScene; 
    }
    catch (e) { 
        console.error("Failed to parse single scene JSON:", response.text); 
        throw new Error("A geração de cena da IA retornou um formato inválido."); 
    }
}

export async function generateVideo(prompt: string, image: ImageData | undefined, aspectRatio: '1:1' | '9:16' | '16:9'): Promise<any> {
    const model = 'veo-2.0-generate-001';
    
    const finalPrompt = image
        ? `Anime esta imagem de acordo com a seguinte instrução, criando um videoclipe de 3 a 5 segundos: "${prompt}"`
        : `Crie um videoclipe de 3 a 5 segundos no estilo User-Generated Content (UGC) para uma cena de produto, baseado nesta instrução: "${prompt}"`;

    const requestPayload: {
        model: string;
        prompt: string;
        image?: { imageBytes: string; mimeType: string; };
        config: {
            numberOfVideos: number;
            aspectRatio: '1:1' | '9:16' | '16:9';
        };
    } = {
        model,
        prompt: finalPrompt,
        config: { 
            numberOfVideos: 1,
            aspectRatio: aspectRatio
        }
    };

    if (image) {
        requestPayload.image = { imageBytes: image.base64, mimeType: image.mimeType };
    }

    const operation = await ai.models.generateVideos(requestPayload);
    return operation;
}


export async function getVideosOperation(operation: any): Promise<any> {
    const updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
    return updatedOperation;
}