const puppeteer = require('puppeteer');
const fs = require('fs');

const dadosIA = JSON.parse(fs.readFileSync('./chat.json', 'utf8'));
const nomesChats = dadosIA.naoRespondidos;

// Função delay para substituir page.waitForTimeout
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  console.log('🔐 Acessando o Instagram...');
  await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });

  // Espera inbox carregar (substituído)
  await delay(10000);

  console.log('📥 Iniciando busca por chats não respondidos...');

  for (const nome of nomesChats) {
    console.log(`🔎 Procurando: ${nome}`);

    try {
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
          // Substituído
          await delay(1500);
          tentativas++;
        }
      }

      if (encontrado) {
        console.log(`✅ Chat com "${nome}" aberto!`);
        // Substituído
        await delay(2000);
        const inputSelector = 'textarea, div[contenteditable="true"]';
        await page.waitForSelector(inputSelector, { visible: true });
        const input = await page.$(inputSelector);
        await input.type('Olá, tudo bem? 😊');
        await page.keyboard.press('Enter');
        console.log(`💬 Saudação enviada para "${nome}"`);
      } else {
        console.log(`❌ Não foi possível encontrar "${nome}" nos chats.`);
      }

      // Substituído
      await delay(3000);
    } catch (erro) {
      console.error(`🚫 Erro ao interagir com "${nome}":`, erro);
    }
  }

  console.log('🏁 Processo finalizado.');
  // await browser.close();
})();
