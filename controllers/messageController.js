const MessageLog = require('../models/MessageLog');
const { sendMessage, getStatus } = require('../services/whatsappService');

// @desc    Send a single WhatsApp message
// @route   POST /api/messages/send
// @access  Private
const sendSingleMessage = async (req, res) => {
    const { phone, message } = req.body;
    try {
        await sendMessage(phone, message);

        // Log single message
        await MessageLog.create({
            sender: req.user._id,
            recipients: [phone],
            content: message,
            status: 'sent',
            details: [{ phone, status: 'sent' }]
        });

        res.json({ message: 'Message sent successfully' });
    } catch (error) {
        // Log failed attempt
        if (req.user) {
            await MessageLog.create({
                sender: req.user._id,
                recipients: [phone],
                content: message,
                status: 'failed',
                details: [{ phone, status: 'failed', error: error.message }]
            });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send bulk WhatsApp messages
// @route   POST /api/messages/bulk
// @access  Private
const sendBulkMessages = async (req, res) => {
    const { numbers, message } = req.body;

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ message: 'Please provide an array of phone numbers.' });
    }

    if (!message) {
        return res.status(400).json({ message: 'Message content is required.' });
    }

    const results = {
        total: numbers.length,
        sent: 0,
        failed: 0,
        details: []
    };

    for (const phone of numbers) {
        try {
            await sendMessage(phone, message);
            results.sent++;
            results.details.push({ phone, status: 'sent' });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit 1 sec
        } catch (error) {
            results.failed++;
            results.details.push({ phone, status: 'failed', error: error.message });
        }
    }

    // Save Log
    await MessageLog.create({
        sender: req.user._id,
        recipients: numbers,
        content: message,
        status: results.failed === 0 ? 'sent' : results.sent === 0 ? 'failed' : 'partial',
        details: results.details
    });

    res.json({
        message: `Bulk messaging completed. Sent: ${results.sent}, Failed: ${results.failed}`,
        results
    });
};

// @desc    Check WhatsApp connection status
// @route   GET /api/messages/status
// @access  Private
const getWhatsAppStatus = (req, res) => {
    const status = getStatus();
    res.json(status);
};

module.exports = { sendSingleMessage, sendBulkMessages, getWhatsAppStatus };
