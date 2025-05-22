const axios = require('axios');
const fs = require('fs');

// Função para extrair apenas o conteúdo JSON da resposta da IA
function extrairJsonDaResposta(texto) {
  const regex = /```json\s*([\s\S]*?)```/i;
  const match = texto.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return texto.trim();
}

// Função principal para analisar a imagem e salvar o resultado
async function analisarImagem() {
  if (!fs.existsSync('./inbox.png')) {
    console.log('❌ Arquivo inbox.png não encontrado. Pulei esta análise.');
    return;
  }

  const imageData = fs.readFileSync('./inbox.png', { encoding: 'base64' });

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=AIzaSyAErnGp3kTtmzP8EpAyLh1vRVq98obquVs',
      {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: imageData
                }
              },
              {
                text: 'Analise essa imagem da inbox do Instagram e retorne dois arrays em JSON: um chamado "naoRespondidos" e outro chamado "respondidos", com os nomes dos contatos.'
              }
            ]
          }
        ]
      }
    );

    const respostaTexto = response.data.candidates[0].content.parts[0].text;
    const jsonLimpo = extrairJsonDaResposta(respostaTexto);

    console.log('📊 Resultado da IA:\n', jsonLimpo);

    let json;
    try {
      json = JSON.parse(jsonLimpo);
    } catch (e) {
      console.error('❌ Erro ao interpretar JSON:', e.message);
      return;
    }

    // Salvar no mesmo arquivo sempre
    fs.writeFileSync('chat.json', JSON.stringify(json, null, 2), 'utf-8');
    console.log('✅ JSON salvo como chat.json\n');

  } catch (error) {
    console.error('❌ Erro ao analisar imagem com Gemini:', error.response?.data || error.message);
  }
}

// Loop infinito: analisa a imagem a cada 60 segundos
async function loopDeAnalise() {
  while (true) {
    console.log('⏳ Iniciando nova análise da imagem...');
    await analisarImagem();

    console.log('🕒 Aguardando 60 segundos para próxima análise...\n');
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

loopDeAnalise().catch(console.error);
