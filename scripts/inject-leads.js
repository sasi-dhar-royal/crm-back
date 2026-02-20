const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Lead = require('../models/Lead');

dotenv.config({ path: '../.env' });

const injectLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm_db');
        console.log('Connected to Database for Injection');

        const testLeads = [];
        for (let i = 1; i <= 10; i++) {
            testLeads.push({
                name: `FB Test User ${i}`,
                phone: `99887766${i < 10 ? '0' + i : i}`,
                email: `test_user${i}@fb-leads.com`,
                source: 'facebook',
                status: 'new',
                notes: `Simulated Facebook Lead #${i} - Meta Graph API Test`,
                metadata: {
                    facebookPageId: '995770676956851',
                    leadgenId: `sim_${Date.now()}_${i}`,
                    formId: 'test_form_123'
                }
            });
        }

        await Lead.insertMany(testLeads);
        console.log('✅ Successfully injected 10 Simulated Facebook Leads!');

        process.exit();
    } catch (err) {
        console.error('Injection failed:', err);
        process.exit(1);
    }
};

injectLeads();
