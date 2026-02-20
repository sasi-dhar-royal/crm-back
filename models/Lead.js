const mongoose = require('mongoose');

const leadSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
        },
        phone: {
            type: String,
            required: true,
        },
        source: {
            type: String,
            default: 'manual',
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        status: {
            type: String,
            enum: ['new', 'follow-up', 'converted', 'lost'],
            default: 'new',
        },
        notes: {
            type: String,
        },
        followUpDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
