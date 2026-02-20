const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');

let sock;
let io; // Socket.IO instance

const setSocketIO = (socketIO) => {
    io = socketIO;
};

let currentQR = null;
let currentStatus = 'disconnected';

const connectToWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        printQRInTerminal: false, // Disable terminal QR
        auth: state,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('📱 QR Code received, caching and sending...');
            currentQR = qr;
            currentStatus = 'waiting';

            // Generate QR code as data URL
            try {
                const qrDataURL = await QRCode.toDataURL(qr);
                // Emit to all connected clients
                if (io) {
                    io.emit('qr', qrDataURL);
                    io.emit('connection-status', { status: 'waiting', message: 'Scan QR Code' });
                }
            } catch (err) {
                console.error('Error generating QR code:', err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed:', lastDisconnect?.error?.message);
            currentQR = null;
            currentStatus = 'disconnected';

            if (io) {
                io.emit('connection-status', {
                    status: 'disconnected',
                    message: 'WhatsApp disconnected'
                });
            }

            if (shouldReconnect) {
                console.log('🔄 Reconnecting...');
                setTimeout(() => connectToWhatsApp(), 3000);
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Connected Successfully!');
            currentQR = null;
            currentStatus = 'connected';

            if (io) {
                io.emit('connection-status', {
                    status: 'connected',
                    message: 'WhatsApp connected successfully'
                });
            }
        }
    });

    return sock;
};

const sendMessage = async (phone, text) => {
    if (!sock || currentStatus !== 'connected') {
        throw new Error('WhatsApp is not connected. Please scan the QR code first.');
    }

    if (!phone) {
        throw new Error('Phone number is required');
    }

    // Basic cleanup: remove non-numeric chars
    let cleanPhone = phone.replace(/\D/g, '');

    // Assuming international format without +, but if local, default to country code (e.g. 91 for India)
    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    }

    const id = cleanPhone + '@s.whatsapp.net';

    try {
        await sock.sendMessage(id, { text });
        console.log(`✅ Message sent to ${id}`);
    } catch (error) {
        console.error('❌ Failed to send message:', error);
        throw new Error(`Failed to send message: ${error.message}`);
    }
};

const getConnectionStatus = () => {
    return sock ? 'connected' : 'disconnected';
};

// ... (previous code)

const requestPairingCode = async (phoneNumber) => {
    if (!sock) {
        await connectToWhatsApp();
    }

    // Wait a bit for socket to be ready
    setTimeout(async () => {
        try {
            console.log(`Requesting pairing code for ${phoneNumber}...`);
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`Pairing code: ${code}`);
            if (io) {
                io.emit('pairing-code', code);
            }
            return code;
        } catch (error) {
            console.error('Error requesting pairing code:', error);
            if (io) {
                io.emit('pairing-error', error.message);
            }
        }
    }, 2000);
};

const getStatus = () => {
    return { status: currentStatus, qr: currentQR };
};

module.exports = { connectToWhatsApp, sendMessage, setSocketIO, getConnectionStatus, getStatus, requestPairingCode };
