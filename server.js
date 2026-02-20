const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

connectDB();

const app = express();

// CORS - Allow all origins
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/social', require('./routes/socialAccountRoutes'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// === LOCAL DEVELOPMENT ONLY ===
// Socket.IO + WhatsApp + Cron only run locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
    const http = require('http');
    const { Server } = require('socket.io');
    const { connectToWhatsApp, setSocketIO, getStatus, requestPairingCode } = require('./services/whatsappService');
    const initCronJobs = require('./services/cronService');

    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        }
    });

    setSocketIO(io);

    io.on('connection', (socket) => {
        console.log('🔌 Client connected to Socket.IO');

        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected from Socket.IO');
        });

        socket.on('request-qr', async () => {
            console.log('📱 Client requested QR code (immediate)');
            const { status, qr } = getStatus();

            if (status === 'connected') {
                socket.emit('connection-status', { status: 'connected', message: 'WhatsApp is already connected' });
            } else if (qr) {
                console.log('⚡ Sending cached QR code...');
                try {
                    const QRCode = require('qrcode');
                    const qrDataURL = await QRCode.toDataURL(qr);
                    socket.emit('qr', qrDataURL);
                    socket.emit('connection-status', { status: 'waiting', message: 'Scan QR Code' });
                } catch (err) {
                    console.error('Error generating cached QR:', err);
                }
            } else {
                socket.emit('connection-status', { status: 'disconnected', message: 'Waiting...' });
            }
        });

        socket.on('request-pairing', async (phoneNumber) => {
            console.log(`📱 Client requested pairing code for ${phoneNumber}`);
            try {
                await requestPairingCode(phoneNumber);
                socket.emit('connection-status', { status: 'pairing', message: 'Pairing Code Requested...' });
            } catch (error) {
                console.error('Pairing Error:', error);
                socket.emit('pairing-error', error.message);
            }
        });
    });

    initCronJobs();

    console.log('Initializing WhatsApp connection...');
    connectToWhatsApp().catch(err => {
        console.error('WhatsApp connection error (Non-fatal):', err.message);
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Socket.IO ready for WhatsApp QR code`);
    });
}

// Export for Vercel serverless
module.exports = app;
