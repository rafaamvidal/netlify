// Importa o SDK do Google AI
const { GoogleGenerativeAI } = require("@google/generative-ai");

const languageMap = {
    pt: 'Português (Brasil)',
    en: 'Inglês',
    es: 'Espanhol',
    fr: 'Francês',
    de: 'Alemão',
    it: 'Italiano'
};

// Define cabeçalhos CORS comuns para reutilização
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

exports.handler = async function (event) {
  // Adicionado para lidar com a requisição "preflight" do CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
        statusCode: 204,
        headers: corsHeaders,
        body: ''
    };
  }

  // A requisição agora é POST, então os dados vêm no corpo (body)
  if (event.httpMethod !== 'POST') {
    return { 
        statusCode: 405, 
        headers: corsHeaders, // Adiciona headers CORS ao erro
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
  
  const { text, sourceLang, targetLang, apiKey } = body;

  // 1. Validação dos parâmetros
  if (!apiKey) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "A chave da API do Gemini é obrigatória." }),
    };
  }
  if (!text || !targetLang) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Texto e idioma de destino são obrigatórios." }),
    };
  }

  try {
    // 2. Inicialização do cliente da API com a chave do usuário
    const genAI = new GoogleGenerativeAI(apiKey);
    // ---- MUDANÇA PRINCIPAL AQUI ----
    // Alterado para o modelo flash, que é rápido e ideal para o nível gratuito.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    // 3. Montagem do prompt para a IA
    const sourceLanguageName = sourceLang === 'auto' ? 'detectado automaticamente' : languageMap[sourceLang] || sourceLang;
    const targetLanguageName = languageMap[targetLang] || targetLang;
    
    const prompt = `Traduza o seguinte texto, que está em ${sourceLanguageName}, para ${targetLanguageName}. Mantenha a formatação original, incluindo quebras de linha. O texto a ser traduzido é:\n\n---\n${text}\n---`;

    // 4. Chamada para a API do Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text();
    
    // 5. Envio da resposta para o frontend
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ translatedText: translatedText }),
    };

  } catch (error) {
    // Log do erro completo para depuração nos logs da Netlify
    console.error("Erro detalhado da API do Gemini:", error);

    // Cria uma mensagem de erro mais útil para o usuário
    let userMessage = "Ocorreu um erro ao comunicar com a API do Gemini.";

    if (error.message) {
        if (error.message.includes('API key not valid')) {
            userMessage = "Sua chave de API do Gemini é inválida ou não foi encontrada. Verifique se a chave está correta e tente novamente.";
        } else if (error.message.includes('permission denied')) {
            userMessage = "Permissão negada. Verifique se a API Generative Language está ativada no seu projeto Google Cloud e se a chave tem as permissões necessárias.";
        } else if (error.message.toLowerCase().includes('billing')) {
             userMessage = "Problema de faturamento. Verifique se o faturamento está ativado para o projeto associado à sua chave de API.";
        } else {
            // Para outros erros, fornece uma mensagem mais geral, mas inclui o erro original para contexto
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

