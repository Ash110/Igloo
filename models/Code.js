const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CodeModel = new Schema({
    dateOfCreation: {
        type: Date,
        default: new Date()
    },
    token: {
        type: String,
        unique: true,
        required: true,
    },
    reasonForCode: {
        type: String,
    },
    expiryDate: {
        type: Date,
        required: true,
    },
    durationInDays: {
        type: Number,
        required: true,
    },
    redeemed: {
        type: Boolean,
        required: true,
        default: false,
    }
});

module.exports = Code = mongoose.model('Code', CodeModel);