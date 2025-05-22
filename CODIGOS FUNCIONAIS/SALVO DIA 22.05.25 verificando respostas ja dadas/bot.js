const { spawn } = require('child_process');

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const process = spawn('node', [scriptName], { stdio: 'inherit' });
    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} terminou com código ${code}`));
    });
  });
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  try {
    console.log('Executando insta.js...');
    runScript('insta.js'); // roda sem esperar terminar

    console.log('Esperando 30 segundos...');
    await wait(30000);

    console.log('Executando analisarImagem.js...');
    runScript('analisarImagem.js'); // roda sem esperar terminar

    console.log('Esperando mais 30 segundos...');
    await wait(30000);

    console.log('Executando interagirChats.js...');
    runScript('interagirChats.js'); // roda sem esperar terminar

    console.log('Todos os scripts foram iniciados.');
  } catch (err) {
    console.error('Erro:', err);
  }
}

run();
