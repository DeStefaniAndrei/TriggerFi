const { exec } = require('child_process');

console.log('📦 Installing Firebase dependencies...\n');

const command = 'npm install firebase@10.7.1';

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`⚠️  Warning: ${stderr}`);
  }
  console.log(stdout);
  console.log('✅ Firebase installed successfully!');
});