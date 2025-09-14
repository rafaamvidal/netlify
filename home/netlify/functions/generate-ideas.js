// Importa o SDK do Google AI
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Define cabeçalhos CORS comuns para reutilização
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

exports.handler = async function (event) {
  // Lida com a requisição "preflight" do CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
        statusCode: 204,
        headers: corsHeaders,
        body: ''
    };
  }

  // Valida se o método é POST
  if (event.httpMethod !== 'POST') {
    return { 
        statusCode: 405, 
        headers: corsHeaders,
        body: 'Method Not Allowed' 
    };
  }
  
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { 
        statusCode: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Corpo da requisição inválido."}) 
    };
  }

  const { topic, apiKey } = body;

  // 1. Validação dos parâmetros
  if (!apiKey) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "A chave da API do Gemini é obrigatória." }),
    };
  }
  if (!topic) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "O tema é obrigatório." }),
    };
  }

  try {
    // 2. Inicialização do cliente da API com a chave do usuário
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            ideas: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  hook: { type: "STRING" },
                  topics: { type: "ARRAY", items: { type: "STRING" } },
                },
              },
            },
          },
        },
      },
    });

    // 3. Montagem do prompt para a IA
    const prompt = `Você é um especialista em estratégia de conteúdo para o YouTube. Com base no tema "${topic}", gere 5 ideias criativas de vídeo. Para cada ideia, forneça: um título magnético (otimizado para cliques), um gancho (hook) de 1-2 frases para prender a atenção no início, e 3 tópicos principais para abordar no roteiro. Responda no formato JSON solicitado.`;

    // 4. Chamada para a API do Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // 5. Envio da resposta para o frontend
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ideasJson: responseText }), // Encapsula o JSON string
    };

  } catch (error) {
    // Log do erro completo para depuração
    console.error("Erro detalhado da API do Gemini:", error);

    // Cria uma mensagem de erro mais útil para o usuário
    let userMessage = "Ocorreu um erro ao comunicar com a API do Gemini.";
    if (error.message) {
        if (error.message.includes('API key not valid')) {
            userMessage = "Sua chave de API do Gemini é inválida ou não foi encontrada. Verifique se a chave está correta e tente novamente.";
        } else if (error.message.includes('permission denied')) {
            userMessage = "Permissão negada. Verifique se a API Generative Language está ativada no seu projeto Google Cloud.";
        } else {
            userMessage = `Erro na API do Gemini: ${error.message}`;
        }
    }
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: userMessage }),
    };
  }
};
