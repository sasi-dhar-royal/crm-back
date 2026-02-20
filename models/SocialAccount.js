const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema({
    accountName: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        enum: ['facebook', 'instagram'],
        default: 'facebook'
    },
    accessToken: {
        type: String,
        required: true
    },
    pageId: {
        type: String,
        required: true
    },
    adAccountId: {
        type: String
    },
    tokenExpiry: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    connectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    connectedDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for performance
socialAccountSchema.index({ pageId: 1, platform: 1 });

const SocialAccount = mongoose.model('SocialAccount', socialAccountSchema);

module.exports = SocialAccount;
