const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/feed/getFeed
//@desc    Get user's feed
//access   Private

router.post('/getFeed', auth, async (req, res) => {
    const { skip } = req.body;
    try {
        const session = neodriver.session();
        const b = new Date().toISOString();
        console.log(`MATCH (:User{id:"${req.id}"})-[:IN_FEED]->(p:Post) WHERE p.expiryDate > "${b}" RETURN p.id SKIP ${skip} LIMIT 30`);
        const neo_res = await session.run(`MATCH (:User{id:"${req.id}"})-[:IN_FEED]->(p:Post) WHERE p.expiryDate > "${b}" RETURN p.id ORDER BY p.publishDate DESC SKIP ${skip} LIMIT 30`);
        posts = [];
        neo_res.records.map((record) => posts.push(record._fields[0]));
        const user = await User.findById(req.id).select('newNotifications numberOfNewNotifications');
        return res.status(200).send({ feed: posts, newNotifications: user.newNotifications, numberOfNewNotifications: user.numberOfNewNotifications, skip: posts.length, end: posts.length === 0 });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;

