import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenAI, Modality, Type } from 'npm:@google/genai';

// A API Key será injetada como uma variável de ambiente segura.
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Trata a requisição preflight de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();
    let responseData;
    
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

    const promptsSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: "Um identificador único para a cena, ex: 'cena-1'." },
                sceneNumber: { type: Type.INTEGER, description: "O número sequencial da cena (1, 2, 3...)" },
                description: { type: Type.STRING, description: "Uma descrição curta e voltada para o usuário sobre o objetivo da cena, ligada a uma dor ou benefício." },
                prompt: { type: Type.STRING, description: "Um prompt detalhado e criativo em Português para o modelo de geração de imagem. Deve descrever uma cena completa, estilo de vida ou caso de uso para o produto. Não inclua texto na imagem. A cena deve ser visualmente rica e envolvente." }
            },
            required: ["id", "sceneNumber", "description", "prompt"]
        }
    };

    const reviewSchema = {
        type: Type.OBJECT,
        properties: {
            score: { type: Type.INTEGER, description: "Uma pontuação de fidelidade de 1 (muito ruim) a 5 (réplica perfeita) comparando o produto na imagem gerada com o original." },
            reason: { type: Type.STRING, description: "Uma breve justificativa, passo a passo, para a pontuação, observando aspectos positivos e quaisquer discrepâncias." }
        },
        required: ["score", "reason"]
    };


    switch (action) {
      case 'analyzeImage': {
        const { imageData } = payload;
        const prompt = `Analise esta imagem de produto. Identifique o que é, seu propósito, características principais (material, textura), público-alvo potencial e os problemas (pontos de dor) que ele resolve. Forneça a saída no formato JSON solicitado, em Português.`;
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: { parts: [{ inlineData: { data: imageData.base64, mimeType: imageData.mimeType } }, { text: prompt }] },
            config: { responseMimeType: 'application/json', responseSchema: analysisSchema }
        });
        responseData = JSON.parse(response.text);
        break;
      }
      case 'generatePrompts': {
        const { analysis, contextImages, numberOfScenes } = payload;
        
        const contextPrompts = (contextImages || []).map(item => {
            return `- Tipo: ${getContextTypeName(item.type)}
  - Nome/Título: ${item.name || 'N/A'}
  - Descrição Fornecida pelo Usuário: ${item.description}`;
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

        const parts = [{ text: prompt }];
        for (const item of contextImages || []) {
            if (item.imageData) {
                const contextHeader = `Contexto Visual para '${item.name || getContextTypeName(item.type)}':`;
                parts.push({ text: contextHeader });
                parts.push({ inlineData: { data: item.imageData.base64, mimeType: item.imageData.mimeType } });
            }
        }
        const contents = { parts };

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents,
            config: { responseMimeType: 'application/json', responseSchema: promptsSchema }
        });
        responseData = JSON.parse(response.text);
        break;
      }
      case 'createImage': {
        const { originalImage, prompt, contextImages } = payload;
        const fullPrompt = `
Sua tarefa é editar a primeira imagem fornecida (a imagem do produto).
Pegue o produto principal da primeira imagem e coloque-o em uma cena completamente nova, conforme descrito abaixo.

**Descrição da Cena:** ${prompt}

**REGRAS IMPORTANTES:**
1.  **Fidelidade do Produto:** O produto na imagem final deve ser 100% idêntico ao produto na primeira imagem (a imagem original). Não altere sua forma, cor, textura ou quaisquer detalhes.
2.  **Use o Contexto:** As imagens subsequentes são referências visuais para escala, proporção e detalhes. Use-as para garantir que o produto seja retratado com precisão na nova cena.
3.  **Não Copie Fundos de Referência:** NÃO copie as cenas ou fundos das imagens de referência. Crie uma cena nova e original com base na **Descrição da Cena**.
`;
        const parts = [
            { inlineData: { data: originalImage.base64, mimeType: originalImage.mimeType } },
            { text: fullPrompt },
            ...(contextImages || []).flatMap(img => [{ text: "Context Image for scale reference:" }, { inlineData: { data: img.base64, mimeType: img.mimeType } }])
        ];
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] }
        });
        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (!imagePart || !imagePart.inlineData) throw new Error("Image generation failed.");
        responseData = { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
        break;
      }
      case 'reviewImage': {
        const { originalImage, generatedImage, components, contextImages } = payload;
        const validContextImages = (contextImages || []).filter((img) => img !== null);
        const componentsChecklist = (components && components.length > 0) ? `CRÍTICO: Use esta lista de verificação para validar os componentes do produto, focando nas proporções e escala corretas.\n${components.map(c => `- '${c.name}' (${c.description}) está presente e representado com precisão na escala correta de '${c.scale}'?`).join('\n')}` : "";
        const contextInstruction = (validContextImages.length > 0) ? `O usuário forneceu imagens de contexto mostrando o tamanho real do produto. Use-as como referência principal para julgar se o produto na imagem gerada (Imagem 2) está proporcionalmente correto.` : "";
        const prompt = `Sua tarefa é atuar como um assistente de Controle de Qualidade meticuloso. Compare o produto principal nestas duas imagens. A Imagem 1 é o original. A Imagem 2 é a recém-gerada. Primeiro, pense passo a passo: 1. A Imagem 2 representa fielmente o produto da Imagem 1 (forma, cor, etc)? 2. O produto está em uma escala realista? ${contextInstruction} 3. ${componentsChecklist} 4. IGNORE o fundo, foque APENAS na fidelidade do produto. Após sua análise, forneça uma pontuação final (1-5) e um breve resumo do seu raciocínio. Forneça a saída no formato JSON solicitado.`;
        const parts = [
            { text: "Imagem 1: Produto Original" }, { inlineData: { data: originalImage.base64, mimeType: originalImage.mimeType } },
            { text: "Imagem 2: Imagem Gerada" }, { inlineData: { data: generatedImage.base64, mimeType: generatedImage.mimeType } },
            ...validContextImages.flatMap(img => [{ text: "Imagem de contexto para referência de escala:" }, { inlineData: { data: img.base64, mimeType: img.mimeType } }]),
            { text: prompt },
        ];
        const response = await ai.models.generateContent({ model: 'gemini-1.5-flash', contents: { parts }, config: { responseMimeType: 'application/json', responseSchema: reviewSchema } });
        responseData = JSON.parse(response.text);
        break;
      }

      case 'generateVideo': {
        const { prompt, imageData, aspectRatio } = payload;
        const model = 'veo-2.0-generate-001'; // Modelo especificado

        // Lógica de prompt dinâmico do código original
        const finalPrompt = imageData
            ? `Anime esta imagem de acordo com a seguinte instrução, criando um videoclipe de 3 a 5 segundos: "${prompt}"`
            : `Crie um videoclipe de 3 a 5 segundos no estilo User-Generated Content (UGC) para uma cena de produto, baseado nesta instrução: "${prompt}"`;

        // Monta o payload para a API, como no código original
        const requestPayload = {
            model,
            prompt: finalPrompt,
            image: imageData ? { 
                imageBytes: imageData.base64, 
                mimeType: imageData.mimeType 
            } : undefined,
            config: { 
                numberOfVideos: 1,
                aspectRatio: aspectRatio
            }
        };
        
        // A função correta a ser chamada, de acordo com o original
        const operation = await ai.models.generateVideos(requestPayload);
        responseData = operation;
        break;
      }

      case 'getVideosOperation': {
        const { operation } = payload;
        // A função correta para obter o status da operação de vídeo
        const updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
        responseData = updatedOperation;
        break;
      }
      case 'generateSingleScene': {
        const { analysis, script, userContextItems } = payload;
        const contextImages = userContextItems.map(item => item.imageData);
        const contextPrompts = (contextImages || []).map(item => {
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
            Sua tarefa é atuar como um diretor de criação e criar UMA ÚNICA cena nova para um roteiro de vídeo existente.
            A nova cena deve ser uma continuação lógica do roteiro existente e seguir as mesmas regras.
            O idioma de toda a sua saída deve ser Português do Brasil.

            REGRAS DE CRIAÇÃO DA CENA:
            1.  **Foco na Dor/Solução:** A cena deve resolver um 'ponto de dor' (pain point) do cliente ou destacar um benefício chave que ainda não foi abordado no roteiro.
            2.  **Mostrar, não Contar:** A cena deve mostrar as funcionalidades do produto que resolvem aquela dor.
            3.  **Prompt de Imagem Detalhado:** Forneça um prompt detalhado e criativo para uma IA de geração de imagem. O prompt deve descrever um cenário completo e visualmente atraente.
            4.  **Requisitos do Prompt:** O prompt de imagem deve ser para uma imagem com proporção 1:1, ter um fundo ambiental e NÃO deve conter NENHUM texto.
            5.  **Fidelidade do Produto:** A principal prioridade é garantir 100% de fidelidade à aparência do produto original e suas peças.
            6.  **Segurança do Conteúdo:** O prompt de imagem gerado deve ser adequado para todos os públicos e não deve conter palavras ou conceitos que possam ser considerados sensíveis, violentos, ou que violem as políticas de IA responsável. Evite linguagem que possa ser interpretada de forma negativa.

            ${contextInstruction}

            Análise do Produto:
            ${JSON.stringify(analysis, null, 2)}

            Roteiro Existente:
            ${JSON.stringify(script, null, 2)}

            Agora, gere a nova cena como um objeto JSON seguindo o esquema especificado.
        `;

        const singleSceneSchema = {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: "Um identificador único para a cena, ex: 'cena-4'." },
                sceneNumber: { type: Type.INTEGER, description: "O número sequencial da cena (ex: 4)" },
                description: { type: Type.STRING, description: "Uma descrição curta e voltada para o usuário sobre o objetivo da cena, ligada a uma dor ou benefício." },
                prompt: { type: Type.STRING, description: "Um prompt detalhado e criativo em Português para o modelo de geração de imagem." }
            },
            required: ["id", "sceneNumber", "description", "prompt"]
        };

        const parts = [{ text: prompt }];
        for (const item of contextImages || []) {
            if (item.imageData) {
                const contextHeader = `Contexto Visual para '${item.name || getContextTypeName(item.type)}':`;
                parts.push({ text: contextHeader });
                parts.push({ inlineData: { data: item.imageData.base64, mimeType: item.imageData.mimeType } });
            }
        }
        const contents = { parts };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: { responseMimeType: 'application/json', responseSchema: singleSceneSchema }
        });
        responseData = JSON.parse(response.text);
        break;
      }
      case 'regenerateImage': {
        const { originalImage, previousImage, prompt, feedback, contextImages } = payload;
        const fullPrompt = `
Sua tarefa é REGENERAR uma imagem. A imagem anterior não foi satisfatória.
Use o feedback fornecido para corrigir a imagem.

**Feedback do Usuário:** ${feedback}

**Descrição da Cena Original:** ${prompt}

**REGRAS IMPORTANTES:**
1.  **Fidelidade do Produto:** O produto na imagem final deve ser 100% idêntico ao produto na primeira imagem (a imagem original). Não altere sua forma, cor, textura ou quaisquer detalhes.
2.  **Use o Contexto:** As imagens de contexto são referências visuais para escala, proporção e detalhes. Use-as para garantir que o produto seja retratado com precisão na nova cena.
3.  **Não Copie Fundos de Referência:** NÃO copie as cenas ou fundos das imagens de referência. Crie uma cena nova e original com base na **Descrição da Cena Original** e no **Feedback do Usuário**.
`;
        const parts = [
            { inlineData: { data: originalImage.base64, mimeType: originalImage.mimeType } },
            { text: "Imagem anterior para referência:" },
            { inlineData: { data: previousImage.base64, mimeType: previousImage.mimeType } },
            { text: fullPrompt },
            ...(contextImages || []).flatMap(img => [{ text: "Context Image for scale reference:" }, { inlineData: { data: img.base64, mimeType: img.mimeType } }])
        ];
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] }
        });
        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (!imagePart || !imagePart.inlineData) throw new Error("Image regeneration failed.");
        responseData = { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
        break;
      }
      case 'downloadVideo': {
        const { url } = payload;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download video: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        const base64 = btoa(binary);
        responseData = { base64, mimeType: response.headers.get('content-type') };
        break;
      }
      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getContextTypeName(type: string): string {
    switch (type) {
        case 'component': return 'Peça/Componente';
        case 'usage_reference': return 'Referência de Uso';
        case 'scale_reference': return 'Referência de Escala';
        case 'detail_reference': return 'Referência de Detalhe/Parte Traseira';
        default: return 'Contexto';
    }
}