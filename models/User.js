const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserModel = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    dateOfBirth: {
        type: Date,
    },
    profilePicture: {
        type: String,
        required: true,
        default: "user.png"
    },
    headerImage: {
        type: String,
        required: true,
        default: "default.png"
    },
    bio: {
        type: String,
        default: "",
    },
    mutedUsers: [{
        type: String
    }],
    lastActive: {
        type: Date,
        required: true,
        default: new Date()
    },
    newNotifications: {
        type: Boolean,
        default: false
    },
    // notifications: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Notification',
    // }],
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    }],
    passwordReset: {
        code: {
            type: String,
        },
        sendDate: {
            type: Date,
        }
    },
    groups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
    }],
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    emailPreferences: {
        friendRequestEmails: {
            type: Boolean,
            default: true
        },
        newsletterEmails: {
            type: Boolean,
            default: true
        }
    },
    telegramUsername: {
        type: String,
        default: null
    },
    notificationTokens: [{
        type: String,
    }],
    nameModifiedDate : {
        type:Date,
    },
    usernameModifiedDate: {
        type: Date,
    }
});

module.exports = User = mongoose.model('User', UserModel);