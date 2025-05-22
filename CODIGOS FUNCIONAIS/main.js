// main.js
const { abrirInstagramETirarScreenshot } = require('./insta.js');
const { analisarImagem } = require('./analisarImagem.js');
const { responderChats } = require('./interagirChats.js');

async function main() {
  // 1. Abre insta, inbox e tira print
  const screenshotBuffer = await abrirInstagramETirarScreenshot();

  // 2. Analisar print e obter lista de chats não respondidos
  const chatsNaoRespondidos = await analisarImagem(screenshotBuffer);

  // 3. Abre cada chat não respondido e envia saudação
  await responderChats(chatsNaoRespondidos);
}

main();
