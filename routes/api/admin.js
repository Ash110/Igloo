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


module.exports = router;

