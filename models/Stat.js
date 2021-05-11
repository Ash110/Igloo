const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const StatModel = new Schema({
    dateOfCreation: {
        type: Date,
        default: new Date()
    },
    usersCount: {
        type: Number,
    },
    postsCount: {
        type: Number,
    },
    pagesCount: {
        type: Number,
    },
    reportsCount: {
        type: Number,
    },
    spacesCount: {
        type: Number,
    },
    groupsCount: {
        type: Number,
    },
});

module.exports = Stat = mongoose.model('Stat', StatModel);