const express = require('express');
const router = express.Router();
const { sendSingleMessage, sendBulkMessages, getWhatsAppStatus } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send', protect, sendSingleMessage);
router.post('/bulk', protect, sendBulkMessages);
router.get('/status', protect, getWhatsAppStatus);

module.exports = router;

module.exports = router;
