global.version = '1.0.5';

const config = require('./config');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { writeLog } = require('./lib/log');
const serializeMessage = require('./lib/serializeMessage');
const messageHandler = require('./lib/xenovia');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { clearDirectory, logWithTime } = require('./lib/utils');

const logger = pino({ level: "silent" });
const lastMessageTime = {};
const sessionDir = path.join(process.cwd(), 'sessions');

clearDirectory('../tmp');

async function checkAndUpdate() {
    if (config.AutoUpdate === 'on') {
        const { cloneOrUpdateRepo } = require('./lib/cekUpdate');
        await cloneOrUpdateRepo();
    }
    await connectToWhatsApp();
}

async function connectToWhatsApp() {
    if (global.sock?.user && global.sock?.ws?.readyState === 1) {
        console.log(chalk.yellow("⚠️ Bot sudah terkoneksi dan aktif."));
        return global.sock;
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "22.22.0"],
    });

    global.sock = sock;

    if (!sock.authState.creds.registered && config.type_connection.toLowerCase() === 'pairing') {
        await new Promise(resolve => setTimeout(resolve, 4000));
        const code = await sock.requestPairingCode(config.phone_number_bot.trim());
        console.log(chalk.blue('PHONE NUMBER:'), chalk.yellow(config.phone_number_bot));
        console.log(chalk.blue('CODE PAIRING:'), chalk.yellow(code));
    }

    sock.ev.on('creds.update', saveCreds);

    // Set permission untuk folder sessions
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
    fs.chmodSync(sessionDir, 0o755);
    fs.readdir(sessionDir, (err, files) => {
        if (!err) {
            files.forEach(file => {
                fs.chmod(path.join(sessionDir, file), 0o644, () => {});
            });
        }
    });


// Event: Pesan Masuk
sock.ev.on('messages.upsert', async ({ messages }) => {
    for (let msg of messages) {
        try {
            // ✅ Auto view status WhatsApp
            if (msg.key.remoteJid === 'status@broadcast') {
                if (config.autoviewsw === 'on') {
                    await sock.readMessages([{
                        remoteJid: msg.key.remoteJid,
                        id: msg.key.id,
                        participant: msg.key.participant || msg.participant || ''
                    }]);
                    console.log(
                        chalk.greenBright(`[AUTO VIEW STATUS] ${msg.pushName || 'Tanpa Nama'} (${msg.key.participant || '-'})`)
                    );
                }
                continue;
            }

            // ✅ Pesan masuk biasa
            const m = serializeMessage({ messages: [msg] }, sock);
            if (!m || !m.content) return;

            // 🕒 Waktu lokal
            const waktu = require("moment-timezone")().tz(config.time_zone).format('HH:mm:ss');
            const nama = msg.pushName || 'ANONIM';
            const isi = m.content?.slice(0, 100) || '(Pesan kosong)';

            // 🖥️ Tampilkan di console
            console.log(
                chalk.cyan(`[${waktu}]`) +
                chalk.yellow(` ${nama}`) +
                chalk.gray(` ➜ `) +
                chalk.white(`${isi}`)
            );

            // 📝 Simpan ke file log juga (optional)
            writeLog('CHAT', `${nama} ➜ ${isi}`);

        } catch (err) {
            console.log(chalk.redBright(`❌ Error: ${err.message}`));
        }
    }
});

    // Event: Koneksi
    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr && config.type_connection.toLowerCase() === 'qr') {
            console.log(chalk.yellowBright(`Menampilkan QR`));
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(chalk.greenBright(`✅ KONEKSI TERHUBUNG`));
}

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

            switch (reason) {
                case DisconnectReason.badSession:
                    console.log(chalk.redBright(`Bad session, start again.`));
                    return connectToWhatsApp();
                case DisconnectReason.connectionClosed:
                    console.log(chalk.redBright(`Connection closed, reconnecting...`));
                    return connectToWhatsApp();
                case DisconnectReason.connectionLost:
                    console.log(chalk.redBright(`Connection lost, reconnecting...`));
                    return connectToWhatsApp();
                case DisconnectReason.connectionReplaced:
                    console.log(chalk.redBright(`Connection replaced, restart bot.`));
                    return connectToWhatsApp();
                case DisconnectReason.loggedOut:
                    console.log(chalk.redBright(`Perangkat logout. Scan ulang.`));
                    break;
                case DisconnectReason.restartRequired:
                    console.log(chalk.redBright(`Restart required.`));
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    return connectToWhatsApp();
                case DisconnectReason.timedOut:
                    console.log(chalk.redBright(`Timeout, reconnecting...`));
                    return connectToWhatsApp();
                default:
                    console.log(chalk.redBright(`Unknown disconnect reason: ${reason}`));
                    return connectToWhatsApp();
            }
        }
    });

    return sock;
}

checkAndUpdate();
