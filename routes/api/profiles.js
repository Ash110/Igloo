const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/profiles/getUserPosts
//@desc    Create the Text post
//access   Private

router.post('/getUserPosts', auth, async (req, res) => {
    var {userId, isUser} = req.body;
    console.log(req.body);
    if(!userId){
        userId = req.id;
    }
    if(isUser){
        try {
            const session = neodriver.session();
            const neo_res = await session.run(`MATCH (:User{id:"${userId}"}) -[:HAS_POST]->(p:Post) RETURN p.id`);
            posts = [];
            neo_res.records.map((record) => posts.push(record._fields[0]));
            return res.status(200).send(posts);
        } catch (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        }
    }else{
        try {
            const session = neodriver.session();
            const b = new Date().toISOString();
            const neo_res = await session.run(`MATCH (:User{id:"${userId}"}) -[:HAS_POST]->(p:Post)<-[:IN_FEED]-(:User{id:"${req.id}"}) WHERE p.expiryDate > "${b}" RETURN p.id`);
            posts = [];
            neo_res.records.map((record) => posts.push(record._fields[0]));
            return res.status(200).send(posts);
        } catch (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        }
    }
});

module.exports = router;