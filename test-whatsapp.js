const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const connectToWhatsApp = async () => {
    console.log('\n===========================================');
    console.log('🔄 Starting WhatsApp Connection...');
    console.log('===========================================\n');

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📱 QR CODE RECEIVED!');
            console.log('👆 Scan the QR code above with WhatsApp');
            console.log('   Go to: WhatsApp > Settings > Linked Devices > Link a Device\n');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('\n❌ Connection closed:', lastDisconnect?.error);

            if (shouldReconnect) {
                console.log('🔄 Reconnecting...\n');
                setTimeout(() => connectToWhatsApp(), 3000);
            } else {
                console.log('🚪 Logged out. Please restart to reconnect.\n');
                process.exit(0);
            }
        } else if (connection === 'open') {
            console.log('\n✅ WhatsApp Connected Successfully!');
            console.log('📞 You can now send messages.\n');
        }
    });

    return sock;
};

connectToWhatsApp().catch(err => {
    console.error('❌ WhatsApp Error:', err);
    process.exit(1);
});
