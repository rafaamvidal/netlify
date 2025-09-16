const { GoogleGenerativeAI } = require("@google/generative-ai");

const nicheKnowledgeBase = `
# 📊 Tabela Comparativa de Estruturas por Nicho

| 🏷️ Nicho | 📂 Categorias Típicas | 🔑 Fórmulas Estruturais |
|---|---|---|
| 🏥 **Saúde & Bem-Estar** | Performance, Perda de Peso, Anti-Aging, Alertas, Soluções Naturais, Doenças Crônicas | \`[PROBLEMA] + [URGÊNCIA] + [SOLUÇÃO] + [TEMPO]\`<br>\`IF YOUR [PARTE] [SINTOMA] — [AÇÃO] [RESULTADO]\` |
| 💰 **Finanças** | Enriquecimento, Investimentos, Cripto, Empreendedorismo, Economia, Aposentadoria | \`[QUANTIA] IN [TEMPO] WITH [MÉTODO]\`<br>\`FROM [ESTADO INICIAL] TO [RESULTADO FINANCEIRO]\` |
| 🎭 **Histórias** | Drama Familiar, Vingança, Traição, Justiça, Superação, Reconhecimento | \`[PERSONAGEM] [INJUSTIÇA] [LOCAL] — [REVIRAVOLTA]\`<br>\`MY [PARENTE] [AÇÃO] — SO I [VINGANÇA]\` |
| 🏠 **Lifestyle** | Decoração, Culinária, Organização, DIY, Minimalismo, Produtividade | \`[TRANSFORMAÇÃO] IN [TEMPO] WITH [MÉTODO SIMPLES]\`<br>\`[PROBLEMA COMUM] — [SOLUÇÃO CRIATIVA]\` |
| 📱 **Tecnologia** | Smartphones, Apps, Gadgets, Tutoriais, Reviews, Hacks | \`[DEVICE] [PROBLEMA] — [SOLUÇÃO TÉCNICA]\`<br>\`[APP/HACK] THAT [BENEFÍCIO ESPECÍFICO]\` |
| 🎮 **Gaming** | Reviews, Gameplay, Dicas, Builds, Notícias, Hardware | \`[JOGO] [CONQUISTA IMPRESSIONANTE]\`<br>\`[ESTRATÉGIA] THAT [RESULTADO NO JOGO]\` |
| 🙏 **Espiritualidade** | Orações, Pedidos Urgentes, Milagres, Proteção, Cura, Libertação | \`ORAÇÃO [PROPÓSITO] — [RESULTADO EM TEMPO]\`<br>\`[SANTO/ENTIDADE] [PEDIDO URGENTE] [PRAZO]\` |
| 👼 **Anjos** | Mensagens, Números, Sinais, Proteção, Abundância, Amor | \`OS ANJOS [URGÊNCIA] [MENSAGEM ESPECÍFICA]\`<br>\`[NÚMERO] [SIGNIFICADO ANGELICAL] [AÇÃO NECESSÁRIA]\` |
`;

// Esta função agora lida tanto com a geração inicial como com o refinamento.
exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }), headers };
  }

  try {
    const { 
        provider, apiKey, language,
        // Para geração inicial
        niche, subniche, theme, script, structure, emotion, angle,
        // Para refinamento
        titleToRefine, instructions 
    } = JSON.parse(event.body);

    if (!apiKey || !language) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados insuficientes.' }), headers };
    }
    
    // --- LÓGICA DE PROMPT ---
    let finalPrompt;

    if (titleToRefine) { // Modo de Refinamento
        finalPrompt = `
            Você é um copywriter especialista em títulos para o YouTube.
            Sua tarefa é refinar o seguinte título com base nas instruções do usuário.

            **Título Original:** "${titleToRefine}"

            **Instruções de Melhoria:** "${instructions}"

            **Idioma de Saída:** ${language}

            Gere **apenas uma** versão melhorada do título, aplicando as instruções de forma criativa.
            Retorne APENAS o texto do título refinado.
        `;
    } else { // Modo de Geração
         finalPrompt = `
            Você é um especialista em estratégia de conteúdo para YouTube e copywriter de classe mundial. Sua tarefa é gerar 5 títulos de vídeo altamente atrativos e virais, usando a tabela de conhecimento abaixo como sua principal referência.

            **BASE DE CONHECIMENTO:**
            ${nicheKnowledgeBase}

            **REGRAS OBRIGATÓRIAS:**
            1.  **Use a Tabela:** Identifique o Nicho e Subnicho do usuário na tabela e use as "Fórmulas Estruturais" correspondentes como base principal para criar os títulos.
            2.  **Adapte ao Tema:** Adapte as fórmulas ao "Tema do Vídeo" específico fornecido pelo usuário.
            3.  **Foco na Transformação/Conflito:** Mostre o antes e o depois, a virada, ou o conflito central.
            4.  **Use Palavras de Poder Emocional:** Substitua termos genéricos por palavras que evocam emoções fortes.
            5.  **Crie uma Pergunta Implícita:** O título deve fazer o espectador perguntar "como?" ou "por quê?".
            6.  **Seja Específico e Intrigante:** Adicione um detalhe específico para aumentar a curiosidade.
            7.  **Maximize a Emoção:** Use o roteiro/hook para identificar o ponto de maior tensão ou a virada mais chocante.

            **INFORMAÇÕES FORNECIDAS PELO USUÁRIO:**
            - **Nicho:** ${niche}
            - **Subnicho:** ${subniche}
            - **Tema do Vídeo:** ${theme}
            - **Roteiro/Hook:** ${script || 'Não fornecido'}
            - **Estrutura Desejada:** ${structure || 'Não especificada'}
            - **Emoção Desejada:** ${emotion || 'Não especificada'}
            - **Ângulo Desejado:** ${angle || 'Não especificado'}
            - **Idioma de Saída:** ${language}

            Agora, gere 5 títulos únicos e persuasivos. Retorne-os em formato de lista JSON, por exemplo: ["Título 1", "Título 2", "Título 3", "Título 4", "Título 5"].
        `;
    }
    
    // --- CHAMADA À API ---
    let resultText;
    if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent(finalPrompt);
        resultText = await result.response.text();
    } else { // OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: finalPrompt }],
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erro na API da OpenAI');
        resultText = data.choices[0].message.content;
    }
    
    // --- PROCESSAMENTO DA RESPOSTA ---
    if (titleToRefine) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ refinedTitle: resultText.replace(/"/g, '').trim() }),
        };
    } else {
        try {
            const jsonMatch = resultText.match(/\[(.*?)\]/s);
            const parsedTitles = JSON.parse(jsonMatch[0]);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ titles: parsedTitles }),
            };
        } catch (e) {
            const titles = resultText.split('\n').map(t => t.replace(/^- /, '').replace(/"/g, '').trim()).filter(Boolean);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ titles: titles }),
            };
        }
    }

  } catch (error) {
    console.error("Erro na Netlify Function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Ocorreu um erro no servidor." }),
    };
  }
};

