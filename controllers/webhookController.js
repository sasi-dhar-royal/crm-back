const SocialAccount = require('../models/SocialAccount');
const Lead = require('../models/Lead');
const axios = require('axios');

const handleFacebookWebhook = async (req, res) => {
    try {
        const entry = req.body.entry;

        if (!entry) {
            return res.status(400).send('No entry found');
        }

        for (const accountEntry of entry) {
            const pageId = accountEntry.id; // Corrected: accountEntry.id is the Page ID

            // Find the connected account for this Page ID
            const socialAcc = await SocialAccount.findOne({ pageId, isActive: true });

            if (accountEntry.changes) {
                for (const change of accountEntry.changes) {
                    if (change.field === 'leadgen') {
                        const leadData = change.value;
                        const { leadgen_id, form_id, created_time } = leadData;

                        let leadPayload = {
                            name: `Lead ${leadgen_id}`,
                            email: `fb_${leadgen_id}@example.com`,
                            phone: '0000000000',
                            source: 'Facebook Lead Ads',
                            status: 'new',
                            notes: `Page: ${socialAcc ? socialAcc.accountName : pageId}, Form ID: ${form_id}`,
                            metadata: {
                                facebookPageId: pageId,
                                leadgenId: leadgen_id,
                                formId: form_id
                            }
                        };

                        // Use page-specific token if available
                        const token = socialAcc ? socialAcc.accessToken : process.env.FB_ACCESS_TOKEN;

                        if (token) {
                            try {
                                const graphUrl = `https://graph.facebook.com/v19.0/${leadgen_id}?access_token=${token}`;
                                const { data } = await axios.get(graphUrl);

                                if (data.field_data) {
                                    data.field_data.forEach(field => {
                                        const key = field.name.toLowerCase();
                                        const value = field.values[0];

                                        if (key.includes('name')) leadPayload.name = value;
                                        if (key.includes('email')) leadPayload.email = value;
                                        if (key.includes('phone')) leadPayload.phone = value;
                                    });
                                }
                            } catch (graphError) {
                                console.error('Graph API Error (Webhook):', graphError.response?.data || graphError.message);
                            }
                        }

                        const newLead = await Lead.create(leadPayload);
                        console.log('Lead Saved from Multi-Account Webhook:', newLead._id);
                    }
                }
            }
        }

        res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Server Error');
    }
};

// @desc    Verify Webhook (GET request)
// @route   GET /api/webhooks/facebook
const verifyWebhook = (req, res) => {
    const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'my_verification_token';

    console.log('Webhook Verification Request:');
    console.log('Mode:', req.query['hub.mode']);
    console.log('Token Received:', req.query['hub.verify_token']);
    console.log('Expected Token:', VERIFY_TOKEN);

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

module.exports = { handleFacebookWebhook, verifyWebhook };
