const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Code = require('../../models/Code');
const adminAuth = require('../../middleware/adminAuth');
const neodriver = require('../../neo4jconnect');
const Stat = require('../../models/Stat');

const router = express.Router();

//@route   POST /api/admin/getStats
//@desc    Get all stats
//access   Private

router.post('/getStats', adminAuth, async (req, res) => {
    try {
        let stats = {};
        stats.users = await User.countDocuments();
        stats.posts = await Post.countDocuments();
        stats.pages = await Page.countDocuments();
        stats.reports = await Report.countDocuments();
        stats.spaces = await Space.countDocuments();
        stats.groups = await Group.countDocuments();
        return res.status(200).send({ stats });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/admin/takeStatSnapshot
//@desc    Take a snapshot of stats
//access   Private

router.post('/takeStatSnapshot', adminAuth, async (req, res) => {
    let { users, posts, pages, reports, spaces, groups } = req.body.stats;
    try {
        const stat = new Stat({
            usersCount: users,
            postsCount: posts,
            pagesCount: pages,
            reportsCount: reports,
            spacesCount: spaces,
            groupsCount: groups
        });
        await stat.save();
        return res.status(200).send();
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/admin/userPage
//@desc    User Page 
//access   Private

router.post('/userPage', adminAuth, async (req, res) => {
    try {
        const users = await User.find().limit(50).sort({ _id: 'desc' });
        const lastDay = await User.find({
            "dateOfJoin":
            {
                $gte: new Date((new Date().getTime() - (24 * 60 * 60 * 1000)))
            }
        });
        const last30Days = await User.find({
            "dateOfJoin":
            {
                $gte: new Date((new Date().getTime() - (30 * 24 * 60 * 60 * 1000)))
            }
        });
        return res.status(200).send({ users, lastDay, last30Days });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/admin/postsPage
//@desc    Posts Page 
//access   Private

router.post('/postsPage', adminAuth, async (req, res) => {
    try {
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var thirtydaysago = new Date();
        thirtydaysago.setDate(thirtydaysago.getDate() - 30);
        console.log(thirtydaysago);
        const posts = await Post.find().limit(50).sort({ publishTime: 'desc' }).populate('creator', 'name username');
        const lastDay = await Post.find({
            publishTime:
                { "$gte": yesterday }
        });
        const last30Days = await Post.find({
            publishTime:
                { "$gte": thirtydaysago }
        });
        console.log(last30Days, lastDay);
        return res.status(200).send({ posts, lastDay, last30Days });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});


module.exports = router;

