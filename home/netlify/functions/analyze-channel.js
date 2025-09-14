// Importa o SDK do Google AI
const { GoogleGenerativeAI } = require("@google/generative-ai");

// É necessário um polyfill de fetch para o Node.js
const fetch = require('node-fetch');

const corsHeaders = {
    "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  
    let body;
    try { body = JSON.parse(event.body); } 
    catch (e) { return { statusCode: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Corpo da requisição inválido."}) }; }

    const { channelQuery, ytApiKey, geminiApiKey } = body;

    if (!channelQuery || !ytApiKey || !geminiApiKey) {
        return { statusCode: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Todos os campos são obrigatórios." }) };
    }

    try {
        const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

        // --- ETAPA 1: ENCONTRAR O ID DO CANAL ---
        const searchUrl = `${YT_API_BASE}/search?part=snippet&q=${encodeURIComponent(channelQuery)}&type=channel&maxResults=1&key=${ytApiKey}`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (!searchResponse.ok || !searchData.items || searchData.items.length === 0) {
            throw new Error('Nenhum canal encontrado com o termo fornecido. Verifique o nome ou a URL e tente novamente.');
        }
        const channelId = searchData.items[0].id.channelId;
        
        // --- ETAPA 2: BUSCAR DADOS DETALHADOS DO CANAL ---
        const channelDetailsUrl = `${YT_API_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${ytApiKey}`;
        const channelResponse = await fetch(channelDetailsUrl);
        const channelData = await channelResponse.json();

        if (!channelResponse.ok || !channelData.items || channelData.items.length === 0) {
            throw new Error('Não foi possível buscar os detalhes do canal encontrado. Verifique sua chave de API do YouTube.');
        }

        const snippet = channelData.items[0].snippet;
        const stats = channelData.items[0].statistics;

        // Busca os 15 vídeos mais recentes
        const videosUrl = `${YT_API_BASE}/search?part=snippet&channelId=${channelId}&maxResults=15&order=date&type=video&key=${ytApiKey}`;
        const videosResponse = await fetch(videosUrl);
        const videosData = await videosResponse.json();
        const recentVideoTitles = videosData.items.map(item => item.snippet.title);

        // --- ETAPA 3: ANALISAR COM O GEMINI ---
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

        const prompt = `
            **Tarefa:** Você é um consultor especialista em estratégia de canais do YouTube. Analise os dados brutos de um canal e forneça uma análise estratégica completa.

            **Dados do Canal:**
            - **Nome:** "${snippet.title}"
            - **Descrição:** "${snippet.description}"
            - **Inscritos:** ${stats.subscriberCount}
            - **Total de Vídeos:** ${stats.videoCount}
            - **Títulos dos 15 Vídeos Mais Recentes:**
              - ${recentVideoTitles.join('\n              - ')}

            **Sua Análise Deve Conter (use exatamente estes títulos em negrito):**

            **Nicho e Pilares de Conteúdo:**
            - Identifique o nicho principal do canal e os temas recorrentes (pilares de conteúdo) com base na descrição e nos títulos dos vídeos.

            **Público-Alvo Inferido:**
            - Descreva o provável público-alvo deste canal (idade, gênero, interesses).
			
			**Análise de Palavras-Chave:**
			- Identifique os temas recorrentes, as Estratégias de SEO e oportunidades de Palavras-Chave.
			
			**Padrões de títulos:**
			- Identifique as estruturas mais utilizadas para os títulos e as técnicas de Copywriting.
			
            **Pontos Fortes:**
            - Aponte os aspectos positivos da estratégia atual do canal (consistência, clareza no nicho, etc.).
			
			**Pontos Fracos:**
			- Aponte os aspectos negativos da estratégia atual do canal que poderiam ser melhoradas.

            **Oportunidades de Melhoria:**
            - Dê 3 a 5 sugestões práticas e acionáveis para o canal crescer, focando em otimização de títulos, novas ideias de conteúdo ou formas de engajamento.

            **Ideias para um Novo Canal (Nichos Adjacentes):**
            - Com base no nicho do canal analisado, sugira 2 a 3 ideias para um novo canal em nichos ou micro-nichos semelhantes, mas que não são diretamente abordados pelo canal atual. Explique brevemente o potencial de cada ideia.

            **Formato da Resposta:** Use títulos em negrito (ex: **Título**) e listas com marcadores (-) para os itens. Não inclua saudações ou despedidas, vá direto para a análise.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysisText = response.text();
    
        return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ analysis: analysisText }),
        };

    } catch (error) {
        console.error("Erro no processo de análise:", error);
        let userMessage = error.message || "Ocorreu um erro desconhecido no servidor.";
         if (error.message && error.message.includes('API key not valid')) {
            userMessage = "Sua chave de API do Gemini é inválida ou não foi encontrada.";
        }
        return {
            statusCode: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ error: userMessage }),
        };
    }
};

