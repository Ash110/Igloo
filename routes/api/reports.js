const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Report = require('../../models/Report');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/reports/reportPost
//@desc    Report a post
//access   Private

router.post('/reportPost', auth, async (req, res) => {
    const { postId, reasons } = req.body;
    try {
        const session = neodriver.session();
        await session.run(`MATCH (u:User{id:"${req.id}"}), (p:Post{id : "${postId}"}) CREATE (u)-[:HAS_REPORTED]->(p) return u.id`);
        let token = Math.round((Math.pow(36, 15) - Math.random() * Math.pow(36, 14))).toString(36).slice(1).toUpperCase();
        let report = await Report.findOne({ token });
        while (report) {
            token = Math.round((Math.pow(36, 9) - Math.random() * Math.pow(36, 8))).toString(36).slice(1).toUpperCase();
        }
        report = new Report({
            token,
            creator: req.id,
            reasons,
            reportedPost: postId,
        });
        await report.save();
        return res.status(200).send(token);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});


//@route   POST /api/reports/getAllReports
//@desc    Report a post
//access   Private

router.post('/getAllReports', async (req, res) => {
    const { } = req.body;
    try {
        let reports = await Report.find().populate('reportedPost', 'image caption');
        console.log(reports);
        return res.status(200).send(reports);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;

