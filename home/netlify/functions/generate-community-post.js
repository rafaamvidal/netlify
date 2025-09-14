const { GoogleGenerativeAI } = require("@google/generative-ai");

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
    const { apiKey, context, postStatus, language } = JSON.parse(event.body);

    if (!apiKey || !context || !postStatus || !language) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Todos os campos são obrigatórios.' }), headers };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const statusInstruction = postStatus === 'sneak_peek' 
      ? "O vídeo ainda não foi lançado. O objetivo é criar antecipação e curiosidade, dizendo às pessoas para ficarem atentas (ex: 'Não perca o vídeo novo que sai hoje às 18h!')."
      : "O vídeo já está no ar. O objetivo é convencer as pessoas a clicarem e assistirem agora (ex: 'O vídeo novo já está no ar! Assista agora!').";

    const prompt = `
        Você é um gestor de redes sociais especialista em crescimento de canais no YouTube. Sua tarefa é escrever uma postagem para a aba "Comunidade" que seja curta, magnética e altamente persuasiva.

        **Instruções:**
        1.  **Analise o Contexto:** Leia o roteiro ou resumo do vídeo fornecido abaixo para entender o tema central, o tom e os pontos mais interessantes.
        2.  **Crie Curiosidade:** Escreva um texto que desperte a curiosidade do leitor sem entregar tudo. Use perguntas, afirmações ousadas ou aponte para um conflito/resolução no vídeo.
        3.  **Use Emojis:** Incorpore de 2 a 4 emojis que complementem o texto e chamem a atenção.
        4.  **Adapte o Chamado à Ação (CTA):** ${statusInstruction}
        5.  **Idioma:** Escreva a postagem final no seguinte idioma: ${language}.
        6.  **Formato:** Mantenha o texto conciso, ideal para uma leitura rápida. Use quebras de linha para facilitar a leitura.

        **Contexto do Vídeo:**
        ---
        ${context}
        ---

        Agora, gere a postagem.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const post = response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ post }),
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
