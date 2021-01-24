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
    isSong: {
        type: Boolean,
    },
    songDetails: {
        songName: {
            type: String,
        },
        songArtists: [
            {
                type: String,
            }
        ],
        previewUrl: {
            type: String,
        },
        songImage: {
            type: String,
        }
    },
    isMovie: {
        type: Boolean,
    },
    imdbId: {
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
    isPagePost: {
        type: Boolean,
        default: false,
    },
    page: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Page',
    },
});

module.exports = Post = mongoose.model('Post', PostModel);