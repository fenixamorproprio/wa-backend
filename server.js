const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');

const { state, saveState } = useSingleFileAuthState('./auth.json');

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let qrCodeData = '';

async function startSock() {
  sock = makeWASocket({ auth: state });

  sock.ev.on('connection.update', async ({ qr, connection }) => {
    if (qr) {
      qrCodeData = await qrcode.toDataURL(qr);
    }
    if (connection === 'open') {
      console.log('Conectado ao WhatsApp!');
    }
  });

  sock.ev.on('creds.update', saveState);
}

startSock();

app.get('/api/qr', (req, res) => {
  res.json({ qr: qrCodeData });
});

app.get('/api/grupos', async (req, res) => {
  try {
    const groups = await sock.groupFetchAllParticipating();
    const list = Object.values(groups).map((g) => ({
      name: g.subject,
      id: g.id,
    }));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar grupos' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
