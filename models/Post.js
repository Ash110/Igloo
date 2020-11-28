const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostModel = new Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isText: {
        type: Boolean,
    },
    isTemp: {
        type: Boolean,
    },
    image: {
        type: String,
    },  
    disableComments : {
        type : Boolean,
    },
    caption: {
        type: String,
    },
    publishTime: {
        type: Date,
        required: true,
        default: new Date()
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],   
});

module.exports = Post = mongoose.model('Post', PostModel);