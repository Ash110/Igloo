const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/notifications/getPendingFollowRequests
//@desc    Get pending follow requests
//access   Private

router.post('/getPendingFollowRequests', auth, async (req, res) => {
    try {
        const session = neodriver.session();
        try {
            const neo_res = await session.run(`Match (u:User) -[:HAS_REQUESTED_FOLLOW]->(:User{id:"${req.id}"}) return u.id, u.username, u.name, u.profilePicture`);
            requests = [];
            neo_res.records.map((record) => requests.push(record._fields));
            await session.close()
            return res.status(200).send(requests);
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to fetch follow requests");
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/notifications/getAllNotifications
//@desc    Get pending follow requests
//access   Private

router.post('/getAllNotifications', auth, async (req, res) => {
    try {
        const notifications = await User.findById(req.id).select('notifications').limit(20);
        res.status(200).send(notifications);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;