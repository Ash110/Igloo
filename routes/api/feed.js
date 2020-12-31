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
    try {
        const session = neodriver.session();
        const b = new Date().toISOString();
        console.log(`MATCH (:User{id:"${req.id}"})-[:IN_FEED]->(p:Post) WHERE p.expiryDate > "${b}" RETURN p.id`);
        const neo_res = await session.run(`MATCH (:User{id:"${req.id}"})-[:IN_FEED]->(p:Post) WHERE p.expiryDate > "${b}" RETURN p.id`);
        posts = [];
        neo_res.records.map((record) => posts.push(record._fields[0]));
        return res.status(200).send(posts);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;

