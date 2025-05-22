const puppeteer = require('puppeteer');
const fs = require('fs');

async function abrirInstagramETirarScreenshot() {
    console.log("✅ Iniciando...");

    // Carrega cookies
    const cookiesPath = './cookies.json';
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    console.log("✅ Cookies carregados.");

    // Inicia navegador
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    const page = await browser.newPage();

    // Aplica cookies
    await page.setCookie(...cookies);

    // Vai para a inbox do Instagram
    console.log("⏳ Acessando a inbox...");
    await page.goto('https://www.instagram.com/direct/inbox/', {
        waitUntil: 'networkidle2'
    });

    // Aguarda carregamento da inbox
    console.log("⏳ Aguardando carregamento da inbox...");
    await new Promise(resolve => setTimeout(resolve, 5000)); // Espera 5 segundos

    // Tira print da tela
    const screenshotPath = 'inbox.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Screenshot salva em: ${screenshotPath}`);

    // NÃO fecha o navegador ainda
    console.log("✅ Finalizado. A imagem da inbox foi capturada.");
}

abrirInstagramETirarScreenshot().catch(console.error);
