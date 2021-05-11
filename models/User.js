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
    dateOfJoin: {
        type: Date,
        required: true,
        default: new Date()
    },
    dateOfBirth: {
        type: Date,
    },
    profilePicture: {
        type: String,
        required: true,
        default: "https://iglooprofilepictures.s3.ap-south-1.amazonaws.com/user.png"
    },
    headerImage: {
        type: String,
        required: true,
        default: "https://iglooheaderimages.s3.ap-south-1.amazonaws.com/default.png"
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
    notifications: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notification',
    }],
    numberOfNewNotifications: {
        type: Number,
        default: 0,
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    }],
    pages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Page',
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
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    following: [{
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
    nameModifiedDate: {
        type: Date,
    },
    usernameModifiedDate: {
        type: Date,
    },
    resetcode: {
        type: String,
    },
    isPro: {
        type: Boolean,
    },
    proExpiryDate: {
        type: Date,
    },
    canCreateSpace: {
        type: Boolean,
        default: true
    },
    isPublicProfile: {
        type: Boolean,
        default: false,
    },
    referralCode: {
        type: String,
    },
    redeemedInviteTenOffer: {
        type: Boolean,
        default: false,
    }
});

module.exports = User = mongoose.model('User', UserModel);