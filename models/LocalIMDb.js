const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const LocalIMDbModel = new Schema({
    imdbId: {
        type: String,
        required: true
    },
    lastUpdateDate: {
        type: Date,
        default: new Date,
        required: true,
    },
    Title: {
        type: String,
    },
    Year: {
        type: String,
    },
    Genre: {
        type: String,
    },
    Actors: {
        type: String,
    },
    Plot: {
        type: String,
    },
    Language: {
        type: String,
    },
    Country: {
        type: String,
    },
    Poster: {
        type: String,
    },
    imdbRating: {
        type: String,
    },

});

module.exports = LocalIMDb = mongoose.model('LocalIMDb', LocalIMDbModel);