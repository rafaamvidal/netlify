const { GoogleGenerativeAI } = require("@google/generative-ai");

// Função para extrair o ID do vídeo de vários formatos de URL do YouTube
function getVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Função para buscar a transcrição (legendas) de um vídeo
async function getTranscript(videoId, apiKey) {
    try {
        // Primeiro, obtemos a lista de faixas de legendas disponíveis
        const listUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();

        if (!listData.items || listData.items.length === 0) {
            return "Legendas automáticas não disponíveis para este vídeo.";
        }
        
        // Priorizamos legendas em português ou inglês, mas pegamos a primeira disponível
        let captionTrack = listData.items.find(item => item.snippet.language === 'pt') || 
                           listData.items.find(item => item.snippet.language === 'en') || 
                           listData.items[0];

        // Agora, baixamos a legenda específica
        // A API v3 não fornece um link direto para download, então esta parte é complexa
        // e geralmente requer OAuth. Para uma API Key simples, a melhor abordagem
        // é informar que a funcionalidade de análise de roteiro depende das legendas.
        // A busca real da transcrição textual é mais complexa do que uma simples chamada fetch.
        // Para esta ferramenta, vamos simular a ideia informando à IA que ela deve se basear
        // no título e descrição para inferir o conteúdo do roteiro.
        
        // Simulação simplificada por enquanto. Uma implementação completa exigiria bibliotecas mais complexas.
        return "A análise de roteiro e capítulos depende da disponibilidade de legendas públicas, que não puderam ser extraídas automaticamente nesta versão.";

    } catch (error) {
        console.error("Erro ao buscar transcrição:", error);
        return "Não foi possível buscar as legendas do vídeo.";
    }
}


exports.handler = async function (event) {
  // Configuração dos cabeçalhos CORS
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
    const { videoUrl, youtubeApiKey, geminiApiKey } = JSON.parse(event.body);

    if (!videoUrl || !youtubeApiKey || !geminiApiKey) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Todos os campos são obrigatórios.' }), headers };
    }

    const videoId = getVideoId(videoUrl);
    if (!videoId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'URL do YouTube inválida.' }), headers };
    }

    // --- Passo 1: Buscar detalhes do vídeo (título, descrição) ---
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`;
    const videoDetailsResponse = await fetch(videoDetailsUrl);
    const videoData = await videoDetailsResponse.json();
    
    if (videoData.error) {
        throw new Error(`Erro na API do YouTube ao buscar detalhes: ${videoData.error.message}`);
    }
    if (!videoData.items || videoData.items.length === 0) {
        throw new Error('Não foi possível encontrar os detalhes do vídeo.');
    }

    const videoTitle = videoData.items[0].snippet.title;
    const videoDescription = videoData.items[0].snippet.description;

    // --- Passo 2: Buscar comentários da API do YouTube ---
    const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${youtubeApiKey}&maxResults=100&order=relevance`;
    const commentsResponse = await fetch(commentsUrl);
    const commentsData = await commentsResponse.json();
    const comments = commentsData.items && commentsData.items.length > 0 
        ? commentsData.items.map(item => item.snippet.topLevelComment.snippet.textOriginal).join('\n---\n')
        : "Não há comentários para analisar.";

    // --- Passo 3 (NOVO): Buscar transcrição (legendas) ---
    // NOTA: A busca real de legendas com API Key é limitada. Vamos usar o título/descrição como base para a IA.
    const transcript = `(A análise de roteiro será baseada no título e na descrição, pois a extração de legendas completas requer autenticação avançada.)`;


    // --- Passo 4: Analisar tudo com a IA do Gemini ---
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
        Você é um estratega de conteúdo e analista de dados para o YouTube. Sua tarefa é fazer uma análise 360º de um vídeo, incluindo seu conteúdo, SEO e feedback da audiência, para fornecer insights acionáveis.

        **Material para Análise:**
        - **Título Original:** ${videoTitle}
        - **Descrição Original:** ${videoDescription.substring(0, 500)}...
        - **Transcrição/Roteiro:** ${transcript}
        - **Comentários da Audiência:** ${comments}

        Com base em todo o material fornecido, gere um relatório completo com as seguintes seções:

        ## Análise de SEO e Otimização
        ### Sugestões de Títulos Alternativos
        (Identifique a estrutura + emoção utilizada no titulo e utilize essa estrutura para criar 5 alternativas de títulos otimizados para cliques, explicando brevemente a estratégia de cada um.)
        ### Otimização da Descrição
        (Analise a descrição original e sugira uma versão melhorada, incluindo o uso de palavras-chave, CTAs e uma estrutura mais clara.)

        ## Análise do Conteúdo (Baseado no Título e Descrição)
        ### Resumo Automático do Vídeo
        (Crie um resumo conciso do conteúdo do vídeo.)
        ### Sugestão de Capítulos para YouTube
        (Com base nos tópicos prováveis, sugira uma lista de capítulos com marcações de tempo (ex: 00:00) para melhorar a navegação.)
        
        ## Análise dos Comentários da Audiência
        ### Análise de Sentimento Geral
        (Descreva o sentimento predominante: Positivo, Negativo ou Misto.)
        ### Principais Elogios e Críticas
        (Liste os pontos positivos e as críticas construtivas mais mencionados.)
        ### Perguntas Frequentes
        (Identifique as perguntas mais recorrentes nos comentários.)

        ## 💡 Sugestões de Novos Conteúdos (Mesmo Nicho)
        (Com base em toda a análise, sugira de 3 a 5 ideias **específicas** para novos vídeos que se aprofundem no mesmo nicho.)

        ## Conclusão Estratégica
        (Forneça um parágrafo final com um resumo das suas recomendações.)
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis }),
    };

  } catch (error) {
    console.error("Erro na Netlify Function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Ocorreu um erro no servidor." }),
    };
  }
};

