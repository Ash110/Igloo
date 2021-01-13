const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const SpaceModel = new Schema({
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
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    roomType: {
        type: String,
        default: 'discussion',
        required: true,
    },
    roomToken: {
        type: String,
        required: true,
    }
});

module.exports = Space = mongoose.model('Space', SpaceModel);