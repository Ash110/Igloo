const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/search/searchUser
//@desc    Search for a user
//access   Private

router.post('/searchUser', auth, async (req, res) => {
    const { searchString } = req.body;
    try {
        const users = await Users.find({ 'name': { '$regex': `^${searchString}`, '$options': 'i' } }, { name: 1, _id: 1, profilePicture: 1, username: 1, });
        console.log(users);
        return res.status(200).send(users);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Erro");
    }
});

module.exports = router;