const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function abrirInstagramETirarScreenshot() {
    console.log("✅ Iniciando...");

    const cookiesPath = './cookies.json';

    if (!fs.existsSync(cookiesPath)) {
        console.error("❌ Arquivo de cookies não encontrado.");
        return;
    }

    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    console.log("✅ Cookies carregados.");

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--start-maximized'],
        defaultViewport: null,
        userDataDir: './perfil-navegador'
    });

    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    await page.setCookie(...cookies);

    console.log("⏳ Acessando a home do Instagram...");
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.evaluate(() => window.scrollBy(0, 200));

    console.log("⏳ Acessando a inbox...");
    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });

    try {
        await page.waitForSelector('div[role="dialog"], .x1iyjqo2', { timeout: 10000 });
        console.log("✅ Inbox carregada.");
    } catch (err) {
        console.warn("⚠️ Timeout esperando a inbox carregar. Continuando...");
    }

    // Loop para tirar screenshots a cada 30 segundos
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // espera 30 segundos

        const screenshotPath = 'inbox.png';
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot atualizada em: ${screenshotPath}`);
    }

    // O navegador fica aberto, o código nunca chega aqui porque o loop é infinito
    // await browser.close();
}

abrirInstagramETirarScreenshot().catch(console.error);
