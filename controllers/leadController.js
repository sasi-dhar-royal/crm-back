const Lead = require('../models/Lead.js');
const xlsx = require('xlsx');
const fs = require('fs');

// @desc    Create a new lead
// @route   POST /api/leads
// @access  Private
const createLead = async (req, res) => {
    const { name, email, phone, source, notes, followUpDate, assignedTo } = req.body;

    console.log('=== CREATE LEAD REQUEST ===');
    console.log('Request body:', req.body);
    console.log('assignedTo value:', assignedTo);
    console.log('assignedTo type:', typeof assignedTo);

    const lead = new Lead({
        name,
        email,
        phone,
        source,
        notes,
        followUpDate,
        assignedTo, // Can be null if not assigned yet
    });

    const createdLead = await lead.save();
    console.log('Created lead:', createdLead);
    console.log('Lead assignedTo after save:', createdLead.assignedTo);
    res.status(201).json(createdLead);
};

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
const getLeads = async (req, res) => {
    let leads;

    if (req.user.role === 'admin') {
        leads = await Lead.find({}).populate('assignedTo', 'name email');
    } else {
        // Employee sees only assigned leads
        leads = await Lead.find({ assignedTo: req.user._id });
    }

    res.json(leads);
};

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
const updateLead = async (req, res) => {
    const { status, notes, followUpDate, assignedTo } = req.body;

    const lead = await Lead.findById(req.params.id);

    if (lead) {
        // Check if employee is authorized to update this lead
        if (req.user.role !== 'admin' && lead.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to update this lead' });
        }

        lead.status = status || lead.status;
        lead.notes = notes || lead.notes;
        lead.followUpDate = followUpDate || lead.followUpDate;

        if (req.user.role === 'admin' && assignedTo) {
            lead.assignedTo = assignedTo;
        }

        const updatedLead = await lead.save();
        res.json(updatedLead);
    } else {
        res.status(404).json({ message: 'Lead not found' });
    }
};

// @desc    Upload leads from Excel
// @route   POST /api/leads/upload
// @access  Private/Admin
const uploadLeads = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const leads = [];
        for (const row of data) {
            leads.push({
                name: row.Name || row.name,
                email: row.Email || row.email,
                phone: row.Phone || row.phone,
                source: 'excel',
                assignedTo: req.body.assignedTo || null
            });
        }

        await Lead.insertMany(leads);

        // Cleanup file
        fs.unlinkSync(req.file.path);

        res.status(201).json({ message: 'Leads uploaded successfully', count: leads.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Assign/Unassign lead to employee
// @route   PUT /api/leads/:id/assign
// @access  Private/Admin
const assignLead = async (req, res) => {
    try {
        const { employeeId } = req.body;
        const User = require('../models/User');

        let assignedTo = null;

        // If employeeId is provided, verify it's valid
        if (employeeId && employeeId.trim() !== '') {
            const employee = await User.findById(employeeId);
            if (!employee || employee.role !== 'employee' || employee.status !== 'approved') {
                return res.status(400).json({ message: 'Invalid employee' });
            }
            assignedTo = employeeId;
        }
        // If employeeId is empty/null, we're unassigning (assignedTo stays null)

        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            { assignedTo },
            { new: true }
        ).populate('assignedTo', 'name email');

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        res.json(lead);
    } catch (error) {
        console.error('Assign Lead Error:', error);
        res.status(500).json({ message: error.message });
    }
};

const deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        res.json({ message: 'Lead removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (lead) {
            res.json(lead);
        } else {
            res.status(404).json({ message: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const syncFacebookLeads = async (req, res) => {
    try {
        const SocialAccount = require('../models/SocialAccount');
        const axios = require('axios');
        const activeAccounts = await SocialAccount.find({ isActive: true });

        if (activeAccounts.length === 0) {
            return res.status(400).json({ message: 'No active Facebook accounts connected. Please go to Facebook Sync page.' });
        }

        let totalNewLeads = 0;
        let summary = [];

        for (const account of activeAccounts) {
            try {
                // 1. Get Forms for this page (this allows syncing multiple forms per page)
                const formsUrl = `https://graph.facebook.com/v19.0/${account.pageId}/leadgen_forms?access_token=${account.accessToken}`;
                const { data: formsData } = await axios.get(formsUrl);

                let accountLeadCount = 0;

                for (const form of formsData.data) {
                    // 2. Fetch leads for each form
                    const leadsUrl = `https://graph.facebook.com/v19.0/${form.id}/leads?access_token=${account.accessToken}`;
                    const { data: leadsData } = await axios.get(leadsUrl);

                    for (const leadData of leadsData.data) {
                        const exists = await Lead.findOne({ notes: { $regex: leadData.id } });

                        if (!exists) {
                            let payload = {
                                name: `Lead ${leadData.id}`,
                                phone: '0000000000',
                                source: 'facebook',
                                status: 'new',
                                notes: `Page: ${account.accountName}, Form: ${form.name}, ID: ${leadData.id}`,
                                metadata: {
                                    facebookPageId: account.pageId,
                                    leadgenId: leadData.id,
                                    formId: form.id
                                }
                            };

                            leadData.field_data.forEach(field => {
                                const name = field.name.toLowerCase();
                                const value = field.values[0];
                                if (name.includes('name')) payload.name = value;
                                if (name.includes('email')) payload.email = value;
                                if (name.includes('phone')) payload.phone = value;
                            });

                            await Lead.create(payload);
                            accountLeadCount++;
                            totalNewLeads++;
                        }
                    }
                }
                summary.push(`${account.accountName}: ${accountLeadCount} new`);
            } catch (accError) {
                console.error(`Error syncing account ${account.accountName}:`, accError.response?.data || accError.message);
                summary.push(`${account.accountName}: Failed`);
            }
        }

        res.json({
            message: `Sync Complete! ${totalNewLeads} new leads found.`,
            details: summary.join(', ')
        });
    } catch (error) {
        console.error('FB Universal Sync Error:', error);
        res.status(500).json({ message: 'An error occurred during synchronization.' });
    }
};

module.exports = { createLead, getLeads, updateLead, uploadLeads, assignLead, deleteLead, getLeadById, syncFacebookLeads };
