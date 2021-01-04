const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const setExpiryDate = () => {
    var d = new Date()
    d.setFullYear(d.getFullYear() + 99);
    return d
}

const PostModel = new Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isText: {
        type: Boolean,
    },
    image: {
        type: String,
    },
    disableComments: {
        type: Boolean,
    },
    caption: {
        type: String,
    },
    publishTime: {
        type: Date,
        required: true,
        default: new Date()
    },
    expiryDate: {
        type: Date,
        required: true,
        default: setExpiryDate()
    },
    selectedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    }],
});

module.exports = Post = mongoose.model('Post', PostModel);