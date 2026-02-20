const User = require('../models/User');
const Lead = require('../models/Lead');

const MessageLog = require('../models/MessageLog');

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
    try {
        const { role, _id } = req.user;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Core Query Filter (Based on Role)
        let leadQuery = {};
        let messageQuery = {};

        if (role === 'employee') {
            leadQuery.assignedTo = _id;
            messageQuery.sender = _id;
        }

        // 1. Basic Counts
        const totalLeads = await Lead.countDocuments(leadQuery);
        const todayLeads = await Lead.countDocuments({ ...leadQuery, createdAt: { $gte: today } });
        const convertedLeads = await Lead.countDocuments({ ...leadQuery, status: 'converted' });
        const followUps = await Lead.countDocuments({ ...leadQuery, status: 'follow-up' });

        // 2. Message Stats
        const messagesSentToday = await MessageLog.countDocuments({
            ...messageQuery,
            createdAt: { $gte: today },
            status: 'sent'
        });

        const stats = {
            role,
            counts: {
                total: totalLeads,
                today: todayLeads,
                converted: convertedLeads,
                followUp: followUps,
                messages: messagesSentToday
            }
        };

        // 3. Admin Exclusive Data
        if (role === 'admin') {
            // Employee Performance (Top Converters)
            const employeePerformance = await Lead.aggregate([
                { $match: { status: 'converted' } },
                { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'employee' } },
                { $unwind: '$employee' },
                { $project: { name: '$employee.name', count: 1 } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            // Recent Messages Log (Last 10)
            const recentMessages = await MessageLog.find({})
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('sender', 'name');

            stats.performance = employeePerformance;
            stats.recentMessages = recentMessages;
        }

        res.json(stats);

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDashboardStats };
