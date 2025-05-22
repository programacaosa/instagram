const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const fetch = require('node-fetch'); // Caso use node v18+ pode usar fetch nativo

puppeteer.use(StealthPlugin());

const API_KEY = 'AIzaSyAErnGp3kTtmzP8EpAyLh1vRVq98obquVs';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${API_KEY}`;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function gerarRespostaIA(mensagem) {
  try {
    // Instrução para a IA
    const prompt =
      "Você é um assistente chamada Larrisa Amanda.Voce precisa identificar quando uma mensagem já foi enviada e se nao estiver mensagem nova para voce entao voce nao responde. Fica parada aguardando nova mensagem para voce " +
      "Responda educadamente a mensagem a seguir:\n\n" + mensagem;

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    };

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('Erro na API Gemini:', response.statusText, await response.text());
      return null;
    }

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0) {
      const parts = data.candidates[0].content.parts;
      if (parts && parts.length > 0) {
        return parts[0].text.trim();
      }
    }

    return null;
  } catch (e) {
    console.error('Erro ao chamar Gemini:', e);
    return null;
  }
}

async function digitarDevagar(elementHandle, texto) {
  for (const char of texto) {
    await elementHandle.type(char);
    await delay(100 + Math.random() * 100);
  }
}

function carregarRespondidos() {
  try {
    const data = fs.readFileSync('./respondidos.json', 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function salvarRespondidos(obj) {
  fs.writeFileSync('./respondidos.json', JSON.stringify(obj, null, 2));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  const cookies = JSON.parse(fs.readFileSync('./cookies.json'));
  await page.setCookie(...cookies);

  console.log('🔐 Acessando o Instagram feed...');
  await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
  await delay(7000);

  console.log('⏳ Acessando a inbox...');
  await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });
  await delay(10000);

  console.log('🔄 Iniciando monitoramento contínuo...');

  while (true) {
    try {
      const dadosIA = JSON.parse(fs.readFileSync('./chat.json', 'utf8'));
      const nomesChats = dadosIA.naoRespondidos;

      // Carrega o objeto com status dos respondidos
      const respondidos = carregarRespondidos();

      for (const nome of nomesChats) {

        console.log(`🔎 Procurando: ${nome}`);

        let encontrado = false;
        let tentativas = 0;

        while (!encontrado && tentativas < 10) {
          encontrado = await page.evaluate((nome) => {
            const spans = Array.from(document.querySelectorAll('span'));
            const alvo = spans.find(span => span.innerText.trim() === nome);
            if (alvo) {
              alvo.scrollIntoView();
              alvo.click();
              return true;
            }
            return false;
          }, nome);

          if (!encontrado) {
            await page.evaluate(() => {
              const container = document.querySelector('div[role="presentation"]');
              if (container) container.scrollBy(0, 500);
            });
            await delay(1500);
            tentativas++;
          }
        }

        if (!encontrado) {
          console.log(`❌ Não foi possível encontrar "${nome}" nos chats.`);
          continue;
        }

        console.log(`✅ Chat com "${nome}" aberto!`);
        await delay(4000);

        // Pega todas as mensagens visíveis no chat, para determinar quem enviou a última mensagem
        const mensagens = await page.evaluate(() => {
          // Seleciona os elementos das mensagens (ajuste se necessário para seu seletor correto)
          const elementos = Array.from(document.querySelectorAll('div[dir="auto"].html-div'));
          // Cada mensagem, tenta extrair texto e o nome do autor (se conseguir identificar pelo DOM)
          // Para o Instagram Direct, geralmente as mensagens enviadas pelo próprio usuário tem classes ou estruturas diferentes
          // Como não temos classe direta para isso, vamos retornar o texto e className para inferir quem enviou
          return elementos.map(el => {
            return {
              texto: el.innerText.trim(),
              classes: el.className
            };
          });
        });

        if (mensagens.length === 0) {
          console.log(`⚠️ Não foi possível capturar mensagens de "${nome}". Pulando...`);
          continue;
        }

        // A lógica para identificar se a última mensagem foi da IA (bot) ou do usuário:
        // Vamos considerar que se a última mensagem enviada no chat for igual à última resposta enviada pelo bot,
        // então não responder novamente.
        // Caso contrário, responde.

        const ultimaMensagem = mensagens[mensagens.length - 1].texto;
        const penultimaMensagem = mensagens.length > 1 ? mensagens[mensagens.length - 2].texto : null;

        console.log(`📝 Última mensagem de "${nome}": "${ultimaMensagem}"`);

        // Checar no JSON respondidos:
        // Se respondidos[nome] == ultimaMensagem, quer dizer que a última mensagem foi nossa resposta, então não responde
        // Se não, responder

        if (respondidos[nome] && respondidos[nome] === ultimaMensagem) {
          console.log(`⚠️ Já respondi essa mensagem para "${nome}". Pulando para próxima...`);
          continue;
        }

        // Se a última mensagem for a mesma do usuário (última diferente da nossa resposta salva),
        // gera a resposta

        const resposta = await gerarRespostaIA(ultimaMensagem);

        if (!resposta) {
          console.log(`⚠️ IA não retornou resposta para "${nome}". Pulando...`);
          continue;
        }

        const inputSelector = 'textarea, div[contenteditable="true"]';
        await page.waitForSelector(inputSelector, { visible: true });
        const input = await page.$(inputSelector);

        if (!input) {
          console.log(`⚠️ Campo de mensagem não encontrado para "${nome}". Pulando...`);
          continue;
        }

        console.log(`💬 Enviando resposta para "${nome}": ${resposta}`);

        await digitarDevagar(input, resposta);
        await page.keyboard.press('Enter');

        // Atualiza o JSON respondidos para não responder novamente essa mesma mensagem
        respondidos[nome] = resposta;
        salvarRespondidos(respondidos);

        await delay(4000);
      }

    } catch (e) {
      console.error('Erro no loop principal:', e);
    }

    console.log('⏳ Aguardando 30 segundos para nova verificação...');
    await delay(30000);  // Ajuste esse delay conforme sua necessidade
  }

  // await browser.close(); // Não fecha o navegador, pois o processo é contínuo
})();
