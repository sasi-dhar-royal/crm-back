const express = require('express');
const router = express.Router();
const { handleFacebookWebhook, verifyWebhook } = require('../controllers/webhookController');

router.get('/facebook', verifyWebhook);
router.post('/facebook', handleFacebookWebhook);

module.exports = router;
