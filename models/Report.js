const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ReportModel = new Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    dateOfCreation: {
        type: Date,
        default: new Date()
    },
    token: {
        type: String
    },
    reportedPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
    reasons: [{ type: String, }],

});

module.exports = Report = mongoose.model('Report', ReportModel);