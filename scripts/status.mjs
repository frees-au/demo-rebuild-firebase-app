import { readFile } from 'node:fs/promises';
import net from 'node:net';
import { resolve } from 'node:path';

async function loadFirebaseConfig() {
  return JSON.parse(await readFile(resolve('firebase.json'), 'utf8'));
}

function portIsOpen(port, host = '127.0.0.1') {
  return new Promise((resolvePort) => {
    const socket = net.createConnection({ host, port: Number(port) });
    const done = (isOpen) => {
      socket.removeAllListeners();
      socket.destroy();
      resolvePort(isOpen);
    };

    socket.setTimeout(1000);
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.once('timeout', () => done(false));
  });
}

const config = await loadFirebaseConfig();
const emulators = [
  { label: 'Dashboard', port: config.emulators?.ui?.port, url: `http://127.0.0.1:${config.emulators?.ui?.port}` },
  { label: 'Hosting', port: config.emulators?.hosting?.port, url: `http://127.0.0.1:${config.emulators?.hosting?.port}` },
].filter((emulator) => emulator.port);
const checks = await Promise.all(emulators.map((emulator) => portIsOpen(emulator.port)));
const statuses = emulators.map((emulator, index) => ({
  ...emulator,
  running: checks[index],
}));

console.log(
  statuses
    .map((status) => {
      const light = status.running ? '🟢' : '🔴';
      return `${light} ${status.label} ${status.url}`;
    })
    .join(' '),
);
