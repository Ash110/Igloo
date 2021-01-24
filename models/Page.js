const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PageModel = new Schema({
    name: {
        type: String,
        required: true,
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    dateOfCreation: {
        type: Date,
        default: new Date()
    },
    description: {
        type: String
    },
    category: {
        String,
    },
    tags: {
        type: [String],
        default: [],
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    }],
    subscribers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
});

module.exports = Page = mongoose.model('Page', PageModel);