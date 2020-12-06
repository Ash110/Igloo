const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/search/searchUsers
//@desc    Search for a user
//access   Private

router.post('/searchUsers', auth, async (req, res) => {
    const { searchText } = req.body;
    try {
        const users = await User.find({ 'name': { '$regex': `^${searchText}`, '$options': 'i' }, '_id': { $ne: req.id } }, { name: 1, _id: 1, profilePicture: 1, username: 1, });
        console.log(users);
        return res.status(200).send(users);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Erro");
    }
});

module.exports = router;