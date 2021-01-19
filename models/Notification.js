const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const NotificationModel = new Schema({
    trigger: {
        type: String,
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    dateOfCreation: {
        type: Date,
        default: new Date()
    },
    triggerPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
});

module.exports = Notification = mongoose.model('Notification', NotificationModel);