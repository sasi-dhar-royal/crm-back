const express = require('express');
const router = express.Router();
const {
    getFBAuthUrl,
    handleFBCallback,
    getConnectedAccounts,
    toggleAccount,
    disconnectAccount
} = require('../controllers/socialAccountController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public callback (Meta will redirect here)
router.get('/facebook/callback', handleFBCallback);

// Protected routes
router.get('/facebook/auth-url', protect, admin, getFBAuthUrl);
router.get('/accounts', protect, admin, getConnectedAccounts);
router.put('/accounts/:id/toggle', protect, admin, toggleAccount);
router.delete('/accounts/:id', protect, admin, disconnectAccount);

module.exports = router;
