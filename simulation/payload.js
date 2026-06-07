const os = require('os');
const fs = require('fs');
const https = require('https');

// Simulate system fingerprinting
const info = {
  hostname: os.hostname(),
  user: os.userInfo().username,
  platform: os.platform(),
  homedir: os.homedir()
};

// Simulate sensitive file reads — Falco detects this
const targets = [
  os.homedir() + '/.ssh/id_rsa',
  os.homedir() + '/.aws/credentials',
  '/etc/shadow'
];

targets.forEach(t => {
  try { fs.readFileSync(t); info[t] = 'READ'; }
  catch(e) { info[t] = 'blocked: ' + e.code; }
});

// Simulate persistence attempt — Falco detects this
try {
  fs.writeFileSync(
    '/etc/systemd/system/MicrosoftSystem64.service',
    '[Service]\nExecStart=/bin/bash'
  );
  info.persistence = 'written';
} catch(e) {
  info.persistence = 'blocked: ' + e.code;
}

// Simulate C2 beacon to Hugging Face — Falco detects outbound
https.get('https://huggingface.co/api/whoami', res => {
  info.c2 = 'connection made to huggingface.co';
  fs.writeFileSync('/tmp/honeypot-output.json', JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));
}).on('error', e => {
  info.c2 = 'attempted: ' + e.message;
  fs.writeFileSync('/tmp/honeypot-output.json', JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));
});
