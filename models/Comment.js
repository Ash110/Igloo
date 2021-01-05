const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CommentModel = new Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    parentPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    },
    image: {
        type: String,
    },
    text: {
        type: String,
    },
    publishTime: {
        type: Date,
        required: true,
        default: new Date()
    },
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    }],
    isReply: {
        type: Boolean,
        default: false,
        required: true,
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
});

module.exports = Comment = mongoose.model('Comment', CommentModel);