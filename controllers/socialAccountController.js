const SocialAccount = require('../models/SocialAccount');
const axios = require('axios');

// Get Facebook Auth URL
exports.getFBAuthUrl = (req, res) => {
    const appId = process.env.FB_APP_ID;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/social/facebook/callback`;
    const scope = 'pages_show_list,leads_retrieval,ads_read,pages_read_engagement,pages_manage_ads';

    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;

    res.json({ url });
};

// Handle Facebook Callback
exports.handleFBCallback = async (req, res) => {
    console.log('--- FB Callback Received ---');
    console.log('Query Params:', req.query);

    const { code, error, error_description } = req.query;

    if (error) {
        console.error('FB Redirect Error:', error, error_description);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=${error}`);
    }

    if (!code) {
        return res.status(400).json({
            message: 'Code is required',
            received: req.query
        });
    }

    try {
        // 1. Exchange code for user access token
        const tokenResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
            params: {
                client_id: process.env.FB_APP_ID,
                client_secret: process.env.FB_APP_SECRET,
                redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/social/facebook/callback`,
                code
            }
        });

        const userToken = tokenResponse.data.access_token;

        // 2. Get user's pages
        const pagesResponse = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
            params: { access_token: userToken }
        });

        const pages = pagesResponse.data.data;

        // 3. For each page, save or update a SocialAccount
        for (const page of pages) {
            await SocialAccount.findOneAndUpdate(
                { pageId: page.id, platform: 'facebook' },
                {
                    accountName: page.name,
                    accessToken: page.access_token, // Page access token
                    tokenExpiry: null,
                    isActive: true,
                    connectedBy: req.user?._id
                },
                { upsert: true, new: true }
            );
        }

        // Redirect back to frontend
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?success=true`);

    } catch (err) {
        console.error('FB Callback Error:', err.response?.data || err.message);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?error=auth_failed`);
    }
};

// Get all connected accounts
exports.getConnectedAccounts = async (req, res) => {
    try {
        const accounts = await SocialAccount.find().sort({ createdAt: -1 });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Toggle account status
exports.toggleAccount = async (req, res) => {
    try {
        const account = await SocialAccount.findById(req.params.id);
        if (!account) return res.status(404).json({ message: 'Account not found' });

        account.isActive = !account.isActive;
        await account.save();

        res.json(account);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Disconnect account
exports.disconnectAccount = async (req, res) => {
    try {
        await SocialAccount.findByIdAndDelete(req.params.id);
        res.json({ message: 'Account disconnected successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
