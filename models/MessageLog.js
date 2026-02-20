const mongoose = require('mongoose');

const messageLogSchema = mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipients: [{
        type: String, // Phone numbers
        required: true
    }],
    content: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'failed', 'partial'],
        default: 'sent'
    },
    details: [{
        phone: String,
        status: String,
        error: String
    }],
    templateName: {
        type: String,
        default: 'manual'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('MessageLog', messageLogSchema);
