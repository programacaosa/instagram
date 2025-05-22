const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const fetch = require('node-fetch'); // Caso use node v18+ pode usar fetch nativo

puppeteer.use(StealthPlugin());

// Sua chave e URL da Gemini
const API_KEY = 'AIzaSyAErnGp3kTtmzP8EpAyLh1vRVq98obquVs';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${API_KEY}`;

// Função delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Lê chats não respondidos do JSON
const dadosIA = JSON.parse(fs.readFileSync('./chat.json', 'utf8'));
const nomesChats = dadosIA.naoRespondidos;

// Função para chamar Gemini API
async function gerarRespostaIA(mensagem) {
  try {
    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: mensagem }]
        }
      ]
    };

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('Erro na API Gemini:', response.statusText, await response.text());
      return null;
    }

    const data = await response.json();

    // Extrair a resposta correta
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


// Função para digitar texto lentamente no input
async function digitarDevagar(elementHandle, texto) {
  for (const char of texto) {
    await elementHandle.type(char);
    await delay(100 + Math.random() * 100); // digitação randômica entre 100-200ms
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  // Carrega cookies salvos para login automático
  const cookies = JSON.parse(fs.readFileSync('./cookies.json'));
  await page.setCookie(...cookies);

  console.log('🔐 Acessando o Instagram feed...');
  await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
  await delay(7000);

  console.log('⏳ Acessando a inbox...');
  await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });
  await delay(10000);

  console.log('📥 Iniciando busca por chats não respondidos...');

  for (const nome of nomesChats) {
    console.log(`🔎 Procurando: ${nome}`);

    try {
      let encontrado = false;
      let tentativas = 0;

      // Procura o chat no inbox e clica
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

      // Espera carregar a última mensagem (selector exato que você passou)
      await delay(4000);

      // Tenta pegar a última mensagem enviada pelo usuário
      const ultimaMensagem = await page.evaluate(() => {
        // Seletor baseado no que você passou: 
        // <div dir="auto" class="html-div ...">Só um momento</div>
        // Então pegamos o último div[dir="auto"] visível no chat

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

      // Chama a IA para gerar a resposta
      const resposta = await gerarRespostaIA(ultimaMensagem);

      if (!resposta) {
        console.log(`⚠️ IA não retornou resposta para "${nome}". Pulando...`);
        continue;
      }

      // Espera o input ficar disponível
      const inputSelector = 'textarea, div[contenteditable="true"]';
      await page.waitForSelector(inputSelector, { visible: true });
      const input = await page.$(inputSelector);

      if (!input) {
        console.log(`⚠️ Campo de mensagem não encontrado para "${nome}". Pulando...`);
        continue;
      }

      console.log(`💬 Enviando resposta para "${nome}": ${resposta}`);

      // Digita devagar e envia
      await digitarDevagar(input, resposta);
      await page.keyboard.press('Enter');

      await delay(4000);
    } catch (erro) {
      console.error(`🚫 Erro ao interagir com "${nome}":`, erro);
    }
  }

  console.log('🏁 Processo finalizado.');
  // await browser.close();
})();
