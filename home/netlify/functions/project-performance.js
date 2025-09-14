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
    const { geminiApiKey, performanceData } = JSON.parse(event.body);

    if (!geminiApiKey || !performanceData) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados insuficientes para a análise.' }), headers };
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
        Você é um analista de dados especialista no algoritmo do YouTube. Sua tarefa é analisar os dados de performance de um vídeo e fornecer um prognóstico e recomendações estratégicas.

        **Dados brutos de performance (formato CSV):**
        ${performanceData}

        Com base nos dados fornecidos, gere um relatório completo com as seguintes seções:

        ## Análise da Tendência Atual
        ### Diagnóstico da Curva de Crescimento
        (Analise a velocidade das visualizações e impressões. A curva está a acelerar (viral), a crescer de forma estável (evergreen) ou a desacelerar (vida útil inicial a terminar)? Justifique a sua análise com base nos números.)
        ### Análise de CTR (Click-Through Rate)
        (Calcule o CTR médio e avalie se é saudável. Um CTR alto com impressões crescentes é excelente. Um CTR baixo com impressões altas é um alerta.)

        ## Análise de Engajamento e Retenção
        ### Impacto na Viralização
        (Analise a relação entre visualizações, gostos e comentários. Um bom rácio de gostos/visualização (acima de 4%) e comentários ativos são sinais positivos para o algoritmo.)
        ### Análise de Retenção (Duração Média)
        (Com base na duração média da visualização, avalie a retenção do público. Uma retenção alta é um dos sinais mais fortes para o algoritmo. Indique se a retenção é um ponto forte ou uma área a ser melhorada.)
        ### Conversão de Inscritos
        (Avalie se o vídeo está a ser eficaz a converter espectadores em novos inscritos.)

        ## Prognóstico de Performance (Próximos 7-14 dias)
        ### O vídeo vai "morrer" ou continuar a crescer?
        (Com base em todas as métricas, dê um prognóstico sobre a trajetória futura do vídeo.)

        ## 💡 Recomendações Estratégicas
        ### O que fazer agora?
        (Com base em todo o diagnóstico, forneça de 2 a 3 recomendações acionáveis e específicas para este vídeo.)
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis }),
    };

  } catch (error)
    {
    console.error("Erro na Netlify Function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Ocorreu um erro no servidor." }),
    };
  }
};

