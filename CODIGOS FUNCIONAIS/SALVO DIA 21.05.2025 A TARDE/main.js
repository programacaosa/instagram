const { spawn } = require('child_process');

function runScript(script, profileDir) {
  const args = profileDir ? [script, profileDir] : [script];
  return spawn('node', args, { stdio: 'inherit' });
}

function main() {
  runScript('insta.js');
  runScript('analisarImagem.js');
  // runScript('interagirChats.js', './perfil_interagir'); // REMOVIDO
}

main();
