const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

const { state, saveState } = useSingleFileAuthState('./auth.json');

const app = express();
const port = process.env.PORT || 3000;

let sock;

async function connectToWhatsApp() {
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            console.log('QR Code gerado!');
            global.latestQR = await qrcode.toDataURL(qr);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão encerrada. Reconectar?', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Conectado ao WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveState);
}

connectToWhatsApp();

app.use(cors());

app.get('/api/qr', (req, res) => {
    if (global.latestQR) {
        res.send(`<img src="${global.latestQR}" style="width:300px"/>`);
    } else {
        res.send('Aguardando geração do QR...');
    }
});

app.listen(port, () => {
    console.log(`✅ Servidor rodando na porta ${port}`);
});
