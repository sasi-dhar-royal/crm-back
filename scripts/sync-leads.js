const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Lead = require('../models/Lead');

const FORM_ID = process.env.FB_FORM_ID || '1615419856255851';
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

async function syncLeads() {
    try {
        console.log('--- Facebook Lead Sync Started ---');

        if (!FB_ACCESS_TOKEN) {
            console.error('Error: FB_ACCESS_TOKEN not found in .env file.');
            process.exit(1);
        }

        // 1. Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm_db');
        console.log('Connected to Database');

        // 2. Fetch Leads from Facebook
        const url = `https://graph.facebook.com/v19.0/${FORM_ID}/leads?access_token=${FB_ACCESS_TOKEN}`;
        const { data } = await axios.get(url);

        const leads = data.data;
        console.log(`Found ${leads.length} leads on Facebook.`);

        let savedCount = 0;

        // 3. Process each lead
        for (const fbLead of leads) {
            let leadPayload = {
                source: 'Facebook Sync',
                status: 'new',
                notes: `FB Lead ID: ${fbLead.id}`,
            };

            // Parse field_data
            fbLead.field_data.forEach(field => {
                const key = field.name;
                const value = field.values[0];
                if (key.includes('name')) leadPayload.name = value;
                if (key.includes('email')) leadPayload.email = value;
                if (key.includes('phone')) leadPayload.phone = value;
            });

            // Ensure basic data exists
            if (!leadPayload.name) leadPayload.name = `FB Lead ${fbLead.id}`;
            if (!leadPayload.phone) leadPayload.phone = '0000000000';

            // Check if exists (upsert)
            const existingLead = await Lead.findOne({ notes: new RegExp(fbLead.id) });
            if (!existingLead) {
                await Lead.create(leadPayload);
                savedCount++;
            }
        }

        console.log(`Success! Synchronized ${savedCount} NEW leads to your CRM.`);
        console.log('--- Sync Finished ---');
        process.exit(0);

    } catch (error) {
        console.error('Sync Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

syncLeads();
