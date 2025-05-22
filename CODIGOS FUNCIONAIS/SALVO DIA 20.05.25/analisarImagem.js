const axios = require('axios');
const fs = require('fs');

function extrairJsonDaResposta(texto) {
  const regex = /```json\s*([\s\S]*?)```/i;
  const match = texto.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return texto.trim();
}

async function analisarImagem() {
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

    const respostaRaw = response.data.candidates[0].content.parts[0].text;
    console.log('📊 Resultado da IA:\n');
    console.log(respostaRaw);

    const respostaLimpa = extrairJsonDaResposta(respostaRaw);

    let jsonData;
    try {
      jsonData = JSON.parse(respostaLimpa);
    } catch (e) {
      console.error('❌ Resposta não é um JSON válido:', e.message);
      return;
    }

    fs.writeFileSync('chat.json', JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log('✅ Resultado salvo em chat.json');

  } catch (error) {
    console.error('❌ Erro ao analisar imagem com Gemini:', error.response?.data || error.message);
  }
}

analisarImagem();
