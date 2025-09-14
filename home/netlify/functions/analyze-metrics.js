// Importa o SDK do Google AI
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Define cabeçalhos CORS comuns
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }
  
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Corpo da requisição inválido."}) };
  }

  const { impressions, views, retention, videoTitle, apiKey } = body;

  // Validação dos parâmetros
  if (!impressions || !views || !retention || !videoTitle || !apiKey) {
    return { statusCode: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Todos os campos são obrigatórios." }) };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    // Calcula o CTR (Click-Through Rate)
    const impressionsNum = parseInt(impressions, 10);
    const viewsNum = parseInt(views, 10);
    const ctr = impressionsNum > 0 ? ((viewsNum / impressionsNum) * 100).toFixed(2) : 0;

    // Montagem do prompt para a IA
    const prompt = `
      Você é um especialista em crescimento de canais no YouTube e análise de dados. Sua missão é fornecer conselhos práticos e acionáveis.

      Analise os seguintes dados de um vídeo do YouTube:
      - Título: "${videoTitle}"
      - Impressões: ${impressions}
      - Visualizações: ${views}
      - Taxa de Cliques (CTR): ${ctr}%
      - Retenção Média: ${retention}

      Com base nesses dados, forneça uma análise e um plano de ação com 3 a 5 pontos principais em formato de lista (bullet points). 
      Foque nos pontos fracos e dê sugestões claras de melhoria. 
      - Se o CTR for baixo (abaixo de 4%), sugira melhorias no título e thumbnail para aumentar o apelo.
      - Se a retenção for baixa, sugira melhorias no roteiro, edição ou ritmo do vídeo para prender a atenção do espectador.
      - Se as impressões forem baixas, sugira melhorias de SEO no título e descrição.

      Seja direto, use um tom encorajador e profissional. Comece a resposta com um breve resumo da análise.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    // Envio da resposta para o frontend
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: analysisText }),
    };

  } catch (error) {
    console.error("Erro detalhado da API do Gemini:", error);
    let userMessage = "Ocorreu um erro ao comunicar com a API do Gemini.";
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
