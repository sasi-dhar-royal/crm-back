const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SocialAccount = require('./models/SocialAccount');
const path = require('path');

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm_db');
        console.log('Connected to Database');

        const existing = await SocialAccount.findOne({ pageId: '995770676956851' });

        if (!existing) {
            await SocialAccount.create({
                accountName: 'Sswebtech1 (Manual)',
                platform: 'facebook',
                accessToken: process.env.FB_ACCESS_TOKEN,
                pageId: '995770676956851', // Your fixed Page ID
                isActive: true
            });
            console.log('✅ Successfully imported your manual account to the dashboard!');
        } else {
            console.log('ℹ️ Account already exists in the dashboard.');
        }

        process.exit();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
