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

  const processados = new Set();

  console.log('🔄 Iniciando monitoramento contínuo...');

  while (true) {
    try {
      const dadosIA = JSON.parse(fs.readFileSync('./chat.json', 'utf8'));
      const nomesChats = dadosIA.naoRespondidos;

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

        const ultimaMensagem = await page.evaluate(() => {
          const mensagens = Array.from(document.querySelectorAll('div[dir="auto"].html-div'));
          if (mensagens.length === 0) return null;
          const ultima = mensagens[mensagens.length - 1];
          return ultima ? ultima.innerText.trim() : null;
        });

        if (!ultimaMensagem) {
          console.log(`⚠️ Não foi possível capturar a última mensagem de "${nome}". Pulando...`);
          continue;
        }

        console.log(`📝 Última mensagem de "${nome}": "${ultimaMensagem}"`);

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
