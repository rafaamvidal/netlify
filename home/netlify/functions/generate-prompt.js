const { GoogleGenerativeAI } = require("@google/generative-ai");

// O "Cérebro" da ferramenta, agora no backend
const systemPromptTemplate = `
# 📄 Instrução Avançada para Geração de Prompt de Thumbnail

### 🧠 Objetivo:
Atuar como um diretor de arte e traduzir as descrições do utilizador num prompt visual **extremamente detalhado e objetivo** para uma IA de imagens.

### 🔤 Instrução:
A sua tarefa é pegar as descrições de personagens e cenário fornecidas pelo utilizador e montá-las no **TEMPLATE DE PROMPT FINAL**. O seu trabalho é enriquecer essas descrições, adicionar detalhes cinematográficos e formatar tudo corretamente.

### Regras Essenciais:
-   **Prioridade Máxima às Descrições do Utilizador:** As descrições nos campos "PERSONAGEM PRINCIPAL", "PERSONAGEM SECUNDÁRIO" e "CENÁRIO" são a verdade absoluta. Use o campo "Tema/Roteiro" apenas para entender o contexto geral e a emoção, não para inventar elementos visuais que contradigam o que o utilizador pediu.
-   **Enriqueça, Não Invente:** Adicione detalhes que reforcem o que foi pedido. Se o utilizador disse "mulher triste", você pode descrever como "uma jovem mulher com lágrimas silenciosas a escorrer pelo rosto, olhar perdido e ombros curvados".
-   **Saída Única:** A sua resposta final deve ser **APENAS e SOMENTE** o prompt preenchido, seguindo a estrutura do template.

### Etapas de Criação:
1.  **Prompt do Protagonista:** Pegue a descrição do "PERSONAGEM PRINCIPAL", enriqueça-a com detalhes e adicione as informações de **posição** e **tamanho**.
2.  **Prompt do Cenário:** Pegue a descrição do "CENÁRIO E DEMAIS ELEMENTOS", detalhe-a e descreva a atmosfera.
3.  **Prompt do Secundário (Se houver):** Pegue a descrição do "PERSONAGEM SECUNDÁRIO" e a incorpore na cena, geralmente em contraste com o principal.
4.  **Adicione Efeitos:** Incremente o prompt com detalhes visuais e de iluminação (lens flare, raios de sol, gradiente de cor, etc.) para criar uma atmosfera mais rica.

---
### TEMPLATE DE PROMPT FINAL (Siga esta estrutura):
ultra realistic youtube thumbnail, {{descrição enriquecida do personagem principal, baseada na entrada do utilizador, incluindo a posição e o tamanho}}.
In the background, {{descrição enriquecida do cenário e demais elementos, baseada na entrada do utilizador}}.
{{descrição do personagem secundário, se fornecido, e a sua interação/contraste com o principal}}.
{{descrição de detalhes visuais e efeitos de iluminação para criar uma atmosfera dramática}}.
8k, photorealistic, cinematic lighting, epic composition, 16:9 aspect ratio.
---
`;


exports.handler = async function (event) {
  // Cabeçalhos CORS para permitir a comunicação
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Responde imediatamente a pedidos 'OPTIONS'
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed', headers };
  }

  try {
    const { 
        apiKey,
        context,
        principalElement,
        secondaryElement,
        backgroundElements,
        position,
        size
    } = JSON.parse(event.body);

    if (!apiKey) {
      return { statusCode: 400, body: JSON.stringify({ error: 'A chave de API do Gemini é obrigatória.' }), headers };
    }
     if (!context) {
      return { statusCode: 400, body: JSON.stringify({ error: 'O campo de Roteiro, Descrição ou Tema é obrigatório.' }), headers };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // **INÍCIO DA CORREÇÃO**
    // Passamos a instrução do sistema diretamente na inicialização do modelo.
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        systemInstruction: systemPromptTemplate 
    });
    // **FIM DA CORREÇÃO**

    const userContent = `
        Tema/Roteiro (para contexto):
        ---
        ${context}
        ---
        **DESCRIÇÃO DO PERSONAGEM PRINCIPAL (Prioridade Máxima):**
        ---
        ${principalElement}
        ---
        **DESCRIÇÃO DO PERSONAGEM SECUNDÁRIO (Se houver):**
        ---
        ${secondaryElement || 'Nenhum'}
        ---
        **DESCRIÇÃO DO CENÁRIO E DEMAIS ELEMENTOS:**
        ---
        ${backgroundElements || 'Nenhum'}
        ---
        Posição do Protagonista: ${position}
        ---
        Tamanho do Protagonista: ${size}%
        ---
    `;

    // Agora passamos apenas o conteúdo do utilizador para a função.
    const result = await model.generateContent(userContent);
    const response = await result.response;
    const generatedPrompt = response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ generatedPrompt: generatedPrompt }),
    };

  } catch (error) {
    console.error("Erro na Netlify Function:", error);
    
    let errorMessage = "Ocorreu um erro ao comunicar com a IA do Gemini.";
    if (error.message && error.message.includes('API key not valid')) {
        errorMessage = "A sua chave de API do Gemini é inválida.";
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};

