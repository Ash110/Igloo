const config = require('config');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth')
const neodriver = require('../../neo4jconnect');
const sendWelcomeMail = require('../email/welcomeMail');
const resetPasswordMail = require('../email/resetPasswordMail');
const sendNewLoginMail = require('../email/newLogin');
const { check, validationResult } = require('express-validator');
const { sendActionNotification, userPageNotification } = require('../pushNotifications/actionNotification');
const { removeResetCode } = require('../../agenda/agendaFunctions');
const semiAuth = require('../../middleware/semiAuth');

const router = express.Router();

router.get('/', (req, res) => res.send("Sample User API"));

//@route   POST /api/users/register
//@desc    Register a new user
//access   Public


router.post('/register',
    [
        check('name', 'Name is Required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'The password should be atleast 6 characters long').isLength({ min: 6 }),
        check('username', 'Username cannot be empty').not().isEmpty(),
        check('username', 'Username can only contain a-z A-Z 0-9, underscore (_) and full stop (.)').matches(/^[a-zA-Z0-9_.]+$/, 'i'),
    ]
    , async (req, res) => {
        const { name, email, password, referralCode, username } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        //Check if passwords are same
        try {
            //Check if email exists
            let user = await User.findOne({ email: email.toLowerCase() });
            if (user) {
                return res.status(400).json({ errors: [{ msg: 'An account has already been registered with this email. Do you want to login instead?' }] });
            }
            //Check if username exist
            user = await User.findOne({ username: username.toLowerCase() });
            if (user) {
                return res.status(400).json({ errors: [{ msg: 'Username taken! Try something else.' }] });
            }
            //Check username length 
            if (username.length >= 36) {
                return res.status(400).json({ errors: [{ msg: 'Username must be less than 36 characters long' }] });
            }
            if (username.length < 4) {
                return res.status(400).json({ errors: [{ msg: 'Username must be atleast 4 characters long' }] });
            }

            user = new User({
                name,
                email,
                password,
                username: username.toLowerCase(),
                bio: "",
                profilePicture: "https://iglooprofilepictures.s3.ap-south-1.amazonaws.com/user.png",
            });
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();

            //Create new group
            let group = new Group({
                name: "All Followers",
                description: "Share with everyone who follows you",
                creator: user.id,
                members: new Array(user._id)
            });
            try {
                await group.save();
                let groups = [...user.groups, group._id];
                await user.updateOne({ groups });
            } catch (err) {
                console.log(err);
                await User.findByIdAndDelete(user._id);
                return res.status(500).send("Failed to make group")
            }

            //Check Referral Code
            let referringUser
            if (referralCode) {
                referringUser = await User.findOne({ referralCode: referralCode.trim().toUpperCase() }).select('_id');
            }

            const session = neodriver.session();
            try {
                await session.run(`CREATE (u:User {id : "${user._id}", name : "${user.name}", profilePicture: "user.png", username :"${user.username}"}) RETURN u`);
                await session.run(`CREATE (g:Group {id : "${group._id}", name : "${group.name}", description: "Share with everyone who follows you"}) RETURN g`);
                await session.run(`MATCH (u), (g) WHERE u.id = "${user._id}" AND g.id = "${group._id}" CREATE (u)-[:HAS_GROUP]->(g)`);
                await session.run(`MATCH (u), (g) WHERE u.id = "${user._id}" AND g.id = "${group._id}" CREATE (u)-[:MEMBER_OF]->(g)`);
                if (referringUser) {
                    await session.run(`MATCH (u1), (u2) WHERE u1.id = "${referringUser._id}" AND u2.id = "${user._id}" CREATE (u1)-[:REFERRED]->(u2)`);
                }
            } catch (e) {
                console.log(e);
                await session.close();
                await User.findByIdAndDelete(user._id);
                await Group.findByIdAndDelete(group._id);
                return res.status(500).json({
                    errors: [{ msg: 'Unable to create account. Please try again later.' }]
                });
            } then = async () => {
                await session.close()
            }
            const payload = {
                id: user.id + user.id, //Gets the ID of the user that was just saved. 
                iat: new Date().getTime()
            }
            sendWelcomeMail(user.name, user.email);
            jwt.sign(
                payload,
                config.get('jwtSecret'),
                { expiresIn: 3600 * 24 * 7 },
                (err, token) => {
                    if (err) throw err;
                    return res.status(200).json({ token });
                }
            )
        } catch (err) {
            console.log(err.message);
            return res.status(500).send("Server Error");
        }
    });

//@route   /api/users/login
//@desc    Login a user
//access   Public

router.post('/login',
    async (req, res) => {
        const { email, password } = req.body;
        let ip = (req.headers['x-forwarded-for'] ||
            req.socket.remoteAddress || null);
        if (ip) {
            ip = ip.split(":");
            ip = ip[ip.length - 1]
        }
        validateEmail = (email) => {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(String(email).toLowerCase());
        }
        if (validateEmail(email)) {
            try {
                const user = await User.findOne({ email });

                if (!user) {
                    return res.status(400).json({ errors: [{ msg: "Incorrect username or password. Please try again." }] });
                }
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.status(400).json({ errors: [{ msg: "Incorrect username or password. Please try again." }] });
                }
                const payload = {
                    id: user.id + user.id, //Gets the ID of the user that was just saved. 
                    iat: new Date().getTime()
                }
                await user.updateOne({ lastActive: new Date() });
                const { name, username, profilePicture } = user;
                if (ip) {
                    sendNewLoginMail(name, email, ip);
                }
                jwt.sign(
                    payload,
                    config.get('jwtSecret'),
                    { expiresIn: "7 days" },
                    (err, token) => {
                        if (err) throw err;
                        return res.status(200).json({ token, name, username, profilePicture });
                    }
                )
            } catch (err) {
                console.log(err.message);
                return res.status(500).send("Server Error");
            }
        } else {
            try {
                const user = await User.findOne({ username: email.toLowerCase() });
                if (!user) {
                    return res.status(400).json({ errors: [{ msg: "Incorrect username or password. Please try again." }] });
                }
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.status(400).json({ errors: [{ msg: "Incorrect username or password. Please try again." }] });
                }
                const payload = {
                    id: user.id + user.id, //Gets the ID of the user that was just saved. 
                    iat: new Date().getTime()
                }
                await user.updateOne({ lastActive: new Date() });
                const { name, username, profilePicture, headerImage, bio } = user;
                if (ip) {
                    sendNewLoginMail(name, user.email, ip);
                }
                jwt.sign(
                    payload,
                    config.get('jwtSecret'),
                    { expiresIn: "7 days" },
                    (err, token) => {
                        if (err) throw err;
                        return res.status(200).json({ token, name, username, profilePicture, headerImage, bio });
                    }
                )
            } catch (err) {
                console.log(err.message);
                return res.status(500).send("Server Error");
            }
        }
    });

//@route   /api/users/updateBio
//@desc    Update a user's bio
//access   Private

router.post('/updateBio', auth, async (req, res) => {
    const { bio } = req.body;
    try {
        if (bio.trim() === '') {
            return res.status(403).send("Bio cannot be empty");
        }
        await User.findOneAndUpdate({ _id: req.id }, { bio });
        return res.status(200).send("Done");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/getUserDetails
//@desc    Get user details
//access   Semi-Private

router.post('/getUserDetails', semiAuth, async (req, res) => {
    let { userId, userUsername, isUsername } = req.body;
    try {
        if (isUsername) {
            userUsername = userUsername.replace('@', '');
        }
        let user;
        if (isUsername) {
            user = await User.findOne({ username: userUsername });
        } else {
            user = await User.findById(userId);
        }
        if (user) {
            const { name, username, profilePicture, followers, following, bio, headerImage, pages, _id, isPublicProfile } = user;
            var userDetails = { name, username, profilePicture, followers: followers.length || 0, following: following.length || 0, bio, headerImage, pages: pages.length, _id, isPublicProfile };
            userId = _id;
            if (req.id) {
                const session = neodriver.session();
                try {
                    let neo_res = await session.run(`MATCH (u1),(u2) WHERE u1.id = "${req.id}" AND u2.id = "${userId}" RETURN EXISTS((u2)-[:HAS_BLOCKED]->(u1))`);
                    if (neo_res.records[0]._fields[0]) {
                        return res.status(403).send("Banned");
                    }
                    neo_res = await session.run(`MATCH (u1),(u2) WHERE u1.id = "${req.id}" AND u2.id = "${userId}" RETURN EXISTS((u1)-[:HAS_BLOCKED]->(u2))`);
                    userDetails.isBlocked = neo_res.records[0]._fields[0];
                    neo_res = await session.run(`MATCH (other),(you) WHERE other.id = "${userId}" AND you.id = "${req.id}" RETURN EXISTS((you)-[:FOLLOWS]->(other))`);
                    userDetails.isFollowing = neo_res.records[0]._fields[0];
                    if (!userDetails.isFollowing) {
                        try {
                            const neo_res2 = await session.run(`MATCH (other),(you) WHERE other.id = "${userId}" AND you.id = "${req.id}" RETURN EXISTS((you)-[:HAS_REQUESTED_FOLLOW]->(other))`);
                            userDetails.hasRequestedFollow = neo_res2.records[0]._fields[0];
                        } catch (err) {
                            console.log(e);
                            await session.close()
                            return res.status(500).json({
                                errors: [{ msg: 'Unable to fetch user following details' }]
                            });
                        }
                    }
                    let mutuals = [];
                    const neo_mutuals = await session.run(`Match(:User{id : "${req.id}"})-[:FOLLOWS]->(u:User)<-[:FOLLOWS]-(:User{id : "${userId}"}) return u.id, u.name, u.profilePicture`);
                    neo_mutuals.records.map((mutual) => mutuals.push(mutual._fields));
                    userDetails.mutuals = mutuals;
                } catch (e) {
                    console.log(e);
                    await session.close()
                    return res.status(500).json({
                        errors: [{ msg: 'Unable to fetch user following details' }]
                    });
                } then = async () => {
                    await session.close()
                }
            }
            res.status(200).send(userDetails);
        } else {
            throw "User not found";
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/getUserFriendsCount
//@desc    Get user details
//access   Private

router.post('/getUserFriendsCount', auth, async (req, res) => {
    try {
        const session = neodriver.session();
        let followers, following = 0;
        try {
            followers = await session.run(`MATCH (u1{id : "${req.id}"})<-[:FOLLOWS]-(u2:User)  RETURN COUNT(u2)`);
            followers = followers.records[0]._fields[0].low;
            following = await session.run(`MATCH (u1{id : "${req.id}"})-[:FOLLOWS]->(u2:User)  RETURN COUNT(u2)`);
            following = following.records[0]._fields[0].low;
            // console.log();
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to fetch user following details' }]
            });
        } then = async () => {
            await session.close()
        }
        res.status(200).send({ followers, following });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/followUser
//@desc    Follow user
//access   Private

router.post('/followUser', auth, async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findById(userId).select('notificationTokens isPublicProfile');
        if (user.isPublicProfile) {
            const session = neodriver.session();
            try {
                await session.run(`MATCH (follower),(following) WHERE follower.id = "${req.id}" AND following.id = "${userId}" CREATE (follower)-[:FOLLOWS]->(following) return following.name`);
                await session.run(`Match (follower:User{id : "${req.id}"}),(following:User{id : "${userId}"}),(g:Group{name:'All Followers'}) WHERE (following)-[:HAS_GROUP]->(g) CREATE (follower)-[:MEMBER_OF]->(g) return follower.id`);
                await session.run(`Match (following:User{id : "${userId}"}),(follower:User{id : "${req.id}"}),(g:Group{name:'All Followers'}),(p:Post) WHERE ((following)-[:HAS_GROUP]->(g)-[:CONTAINS]-(p)) CREATE (follower)-[:IN_FEED]->(p) return follower.id`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).json({
                    errors: [{ msg: 'Unable to request' }]
                });
            } then = async () => {
                await session.close()
            }
            await User.findOneAndUpdate({ _id: req.id }, { $push: { following: [userId] } });
            await User.findOneAndUpdate({ _id: userId }, { $push: { followers: [req.id] } });
            res.status(200).send("done");
        } else {
            const session = neodriver.session();
            try {
                await session.run(`MATCH (u1),(u2) WHERE u1.id = "${userId}" AND u2.id = "${req.id}" CREATE (u2)-[:HAS_REQUESTED_FOLLOW]->(u1) return u1.name`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).json({
                    errors: [{ msg: 'Unable to request' }]
                });
            } then = async () => {
                await session.close()
            }
            if (user.notificationTokens && user.notificationTokens.length > 0) {
                const sender = await User.findById(req.id).select('name');
                sendActionNotification(user.notificationTokens, `${sender.name} has requested to follow you`, "Click to accept or reject request", "notifications");
            }
            User.findByIdAndUpdate(userId, { newNotifications: true });
            await User.findByIdAndUpdate(userId, { $inc: { numberOfNewNotifications: 1 } });
            res.status(200).send("Request sent!");
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/cancelFollowRequest
//@desc    Follow user
//access   Private

router.post('/cancelFollowRequest', auth, async (req, res) => {
    const { userId } = req.body;
    try {
        const session = neodriver.session();
        try {
            await session.run(`MATCH (u2)-[hrf:HAS_REQUESTED_FOLLOW]->(u1) WHERE u1.id = "${userId}" AND u2.id = "${req.id}" DELETE hrf`);
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to request' }]
            });
        } then = async () => {
            await session.close()
        }
        res.status(200).send("Request sent!");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/acceptFollowRequest
//@desc    Follow user
//access   Private

router.post('/acceptFollowRequest', auth, async (req, res) => {
    const { userId } = req.body;
    try {
        const session = neodriver.session();
        try {
            await session.run(`MATCH (follower),(you) WHERE follower.id = "${userId}" AND you.id = "${req.id}" CREATE (follower)-[:FOLLOWS]->(you) return you.name`);
            await session.run(`Match (follower:User{id : "${userId}"}),(you:User{id : "${req.id}"}),(g:Group{name:'All Followers'}) WHERE (you)-[:HAS_GROUP]->(g) CREATE (follower)-[:MEMBER_OF]->(g) return you.id`);
            await session.run(`Match (follower:User{id : "${userId}"}),(you:User{id : "${req.id}"}),(g:Group{name:'All Followers'}),(p:Post) WHERE ((you)-[:HAS_GROUP]->(g)-[:CONTAINS]-(p)) CREATE (follower)-[:IN_FEED]->(p) return you.id`);
            await session.run(`MATCH (follower:User{id : "${userId}"})-[hrf:HAS_REQUESTED_FOLLOW]-(you:User{id:"${req.id}"}) DELETE hrf`);
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to request' }]
            });
        } then = async () => {
            await session.close()
        }
        await User.findOneAndUpdate({ _id: req.id }, { $push: { followers: [userId] } });
        await User.findOneAndUpdate({ _id: userId }, { $push: { following: [req.id] } });
        const user = await User.findById(userId).select('notificationTokens');
        if (user.notificationTokens && user.notificationTokens.length > 0) {
            const sender = await User.findById(req.id).select('name');
            userPageNotification(user.notificationTokens, `${sender.name} has accepted your follow request`, "Click here to view their profile", "user", req.id);
        }
        const notification = new Notification({
            trigger: 'followingAccepted',
            sender: req.id,
        });
        await notification.save();
        await User.findOneAndUpdate({ _id: userId }, {
            $push: {
                notifications: {
                    $each: [notification._id],
                    $position: 0
                }
            }
        });
        await User.findByIdAndUpdate(userId, {
            newNotifications: true,
        });
        await User.findByIdAndUpdate(userId, { $inc: { numberOfNewNotifications: 1 } });
        res.status(200).send("done");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/rejectFollowRequest
//@desc    Follow user
//access   Private

router.post('/rejectFollowRequest', auth, async (req, res) => {
    const { userId } = req.body;
    try {
        const session = neodriver.session();
        try {
            await session.run(`MATCH (u1:User{id : "${userId}"})-[hrf:HAS_REQUESTED_FOLLOW]-(u2:User{id:"${req.id}"}) DELETE hrf`);
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to request' }]
            });
        } then = async () => {
            await session.close()
        }
        res.status(200).send("Deleted");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/unfollowUser
//@desc    Follow user
//access   Private

router.post('/unfollowUser', auth, async (req, res) => {
    const { userId } = req.body;
    try {
        const session = neodriver.session();
        try {
            await session.run(`MATCH (you)-[f:FOLLOWS]-(following) WHERE following.id = "${userId}" AND you.id = "${req.id}" DELETE f`);
            await session.run(`Match (you:User{id : "${req.id}"})-[m:MEMBER_OF]->(g:Group)<-[:HAS_GROUP]-(following:User{id : "${userId}"})  DELETE m`);
            await session.run(`Match (following:User{id : "${userId}"})-[:HAS_POST]->(p:Post)<-[i:IN_FEED]-(you:User{id : "${req.id}"})  DELETE i`);
            await session.run(`Match (following:User{id : "${userId}"})-[:HAS_ROOM]->(r:Room)<-[cer:CAN_ENTER_ROOM]-(you:User{id : "${req.id}"})  DELETE cer`);
            // Now remove all the posts too 
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to request' }]
            });
        } then = async () => {
            await session.close()
        }
        await User.findByIdAndUpdate(req.id,
            { $pullAll: { following: [userId] } },
            { new: true },
            function (err, data) { }
        );
        await User.findByIdAndUpdate(userId,
            { $pullAll: { followers: [req.id] } },
            { new: true },
            function (err, data) { }
        );
        res.status(200).send("Unfollowed");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/registerToken
//@desc    Register a new token
//access   Private

router.post('/registerToken', auth, async (req, res) => {
    const { token } = req.body;
    try {
        const user = await User.findById(req.id).select('notificationTokens');
        let tokenArray = user.notificationTokens ? user.notificationTokens : [];
        if (!tokenArray.includes(token)) {
            tokenArray.push(token);
            await User.findOneAndUpdate({ _id: req.id }, { $push: { notificationTokens: [token] } });
        }
        res.status(200).send("Done");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/changeUsername
//@desc    Change User Username
//access   Private

router.post('/changeUsername', auth, async (req, res) => {
    const { username } = req.body;
    if (username.trim() == "") {
        return res.status(403).send("Username cannot be empty");
    }
    if (!username.trim().match(/^[a-zA-Z0-9_.]+$/, 'i')) {
        return res.status(403).send("Username can only contain a-z A-Z 0-9, underscore (_) and full stop (.)");
    }
    try {
        const checkUser = await User.findOne({ username: username.toLowerCase() });
        if (checkUser) {
            return res.status(403).send("Username is taken. Please try another.");
        } else {
            const user = await User.findById(req.id).select('usernameModifiedDate');
            if (!user.usernameModifiedDate) {
                await User.findOneAndUpdate({ _id: req.id }, { username: username.toLowerCase() });
                await User.findOneAndUpdate({ _id: req.id }, { usernameModifiedDate: new Date() });
                const session = neodriver.session();
                try {
                    await session.run(`MATCH (u:User{id : "${req.id}"}) SET u.username = "${username}"`);
                } catch (e) {
                    console.log(e);
                    await session.close()
                    return res.status(500).send("Failed to update");
                } then = async () => {
                    await session.close()
                }
                return res.status(200).send();
            }
            let lastModifiedDate = new Date(user.usernameModifiedDate);
            let currentDate = new Date();
            let differenceInDays = (currentDate.getTime() - lastModifiedDate.getTime()) / (1000 * 3600 * 24);
            if (differenceInDays >= 14) {
                await User.findOneAndUpdate({ _id: req.id }, { username: username.toLowerCase() });
                await User.findOneAndUpdate({ _id: req.id }, { usernameModifiedDate: new Date() });
                const session = neodriver.session();
                try {
                    await session.run(`MATCH (u:User{id : "${req.id}"}) SET u.username = "${username}"`);
                } catch (e) {
                    console.log(e);
                    await session.close()
                    return res.status(500).send("Failed to update");
                } then = async () => {
                    await session.close()
                }
                return res.status(200).send();
            } else {
                return res.status(403).send("Username can only be changed once every 14 days.");
            }
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});
//@route   /api/users/changeName
//@desc    Change User Name
//access   Private

router.post('/changeName', auth, async (req, res) => {
    const { name } = req.body;
    if (name.trim() == "") {
        return res.status(403).send("Name cannot be empty");
    }
    if (name.length > 50) {
        return res.status(403).send("Name cannot be greater than 50 characters");
    }
    try {
        const user = await User.findById(req.id).select('nameModifiedDate');
        if (!user.nameModifiedDate) {
            await User.findOneAndUpdate({ _id: req.id }, { name });
            await User.findOneAndUpdate({ _id: req.id }, { nameModifiedDate: new Date() });
            const session = neodriver.session();
            try {
                await session.run(`MATCH (u:User{id : "${req.id}"}) SET u.name = "${name}"`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Failed to update");
            } then = async () => {
                await session.close()
            }
            return res.status(200).send();
        }
        let lastModifiedDate = new Date(user.nameModifiedDate);
        let currentDate = new Date();
        let differenceInDays = (currentDate.getTime() - lastModifiedDate.getTime()) / (1000 * 3600 * 24);
        if (differenceInDays >= 7) {
            await User.findOneAndUpdate({ _id: req.id }, { name });
            await User.findOneAndUpdate({ _id: req.id }, { nameModifiedDate: new Date() });
            const session = neodriver.session();
            try {
                await session.run(`MATCH (u:User{id : "${req.id}"}) SET u.name = "${name}"`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Failed to update");
            } then = async () => {
                await session.close()
            }
            return res.status(200).send();
        } else {
            return res.status(403).send("Name can only be changed once every 7 days.");
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/changeBio
//@desc    Change User Bio
//access   Private

router.post('/changeBio', auth, async (req, res) => {
    const { bio } = req.body;
    if (bio.trim() == "") {
        return res.status(403).send("Bio cannot be empty");
    }
    if (bio.length > 100) {
        return res.status(403).send("Bio cannot be greater than 100 characters");
    }
    try {

        await User.findOneAndUpdate({ _id: req.id }, { bio });
        return res.status(200).send();
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/getUserFriendSuggestions
//@desc    Get friend suggestions for user
//access   Private

router.post('/getUserFriendSuggestions', auth, async (req, res) => {
    try {
        let suggestions = [];
        const session = neodriver.session();
        try {
            const neo_suggestion = await session.run(`Match(u1:User{id :"${req.id}"})-[:FOLLOWS]-(u3:User)-[f:FOLLOWS]-(u2:User) WHERE NOT EXISTS((u1)-[:FOLLOWS]-(u2)) AND NOT u3.username="igloo" AND NOT u2.id = "${req.id}" return u2.id, u2.name,u2.username,u2.profilePicture, COUNT(f) ORDER BY COUNT(f) DESC`);
            neo_suggestion.records.map((suggestion) => suggestions.push(suggestion._fields));
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Failed to get suggestions");
        } then = async () => {
            await session.close()
        }
        console.log(suggestions);
        return res.status(200).send({ suggestions });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/forgotPassword
//@desc    Send a password reset mail for user
//access   Public

router.post('/forgotPassword',
    async (req, res) => {
        const { email } = req.body;
        validateEmail = (email) => {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(String(email).toLowerCase());
        }
        try {
            let user;
            if (validateEmail(email)) {
                user = await User.findOne({ email });
            } else {
                user = await User.findOne({ username: email.toLowerCase() });
            }
            if (!user) {
                return res.status(400).json({ errors: [{ msg: "User not found. Please check the information." }] });
            }
            const resetcode = Math.round((Math.pow(36, 9) - Math.random() * Math.pow(36, 8))).toString(36).slice(1).toUpperCase();
            await User.findOneAndUpdate({ username: user.username }, { resetcode });
            removeResetCode(user.username);
            resetPasswordMail(user.name, user.email, resetcode);
            res.status(200).send();
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({ errors: [{ msg: "Server Error" }] });
        }
    });
//@route   /api/users/resetPassword
//@desc    Reset a user's password
//access   Public

router.post('/resetPassword',
    async (req, res) => {
        const { password, confirmPassword, resetcode } = req.body;
        try {
            if (password.length < 6) {
                return res.status(403).json({ errors: [{ msg: "Password cannot be shorter than 6 characters" }] });
            }
            if (password !== confirmPassword) {
                return res.status(403).json({ errors: [{ msg: "Password do not match" }] });
            }
            const user = await User.findOne({ resetcode: resetcode.toUpperCase() }).select('_id');
            if (!user) {
                return res.status(403).json({ errors: [{ msg: "The code you have entered is incorrect or has expired" }] });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedpass = await bcrypt.hash(password, salt);
            console.log(user, password, hashedpass);
            await User.findByIdAndUpdate(user._id, { password: hashedpass });
            res.status(200).send();
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({ errors: [{ msg: "Server Error" }] });
        }
    });

//@route   /api/users/blockUser
//@desc    Block a user
//access   Private

router.post('/blockUser', auth,
    async (req, res) => {
        const { userId } = req.body;
        try {
            const session = neodriver.session();
            try {
                await session.run(`MATCH (u1)-[f:FOLLOWS]-(u2) WHERE u1.id = "${userId}" AND u2.id = "${req.id}" DELETE f`);
                await session.run(`Match (u:User{id : "${req.id}"})-[:HAS_GROUP]-(g:Group)-[m:MEMBER_OF]-(u2:User{id : "${userId}"})  DELETE m`);
                await session.run(`Match (u:User{id : "${userId}"})-[:HAS_GROUP]-(g:Group)-[m:MEMBER_OF]-(u2:User{id : "${req.id}"})  DELETE m`);
                await session.run(`Match (u:User{id : "${req.id}"})-[:HAS_POST]-(p:Post)-[i:IN_FEED]-(u2:User{id : "${userId}"})  DELETE i`);
                await session.run(`Match (u:User{id : "${userId}"})-[:HAS_POST]-(p:Post)-[i:IN_FEED]-(u2:User{id : "${req.id}"})  DELETE i`);
                await session.run(`Match (u:User{id : "${userId}"})-[:HAS_ROOM]-(r:Room)-[cer:CAN_ENTER_ROOM]-(u2:User{id : "${req.id}"})  DELETE cer`);
                await session.run(`Match (u2:User{id : "${userId}"}),(u:User{id : "${req.id}"}) CREATE (u)-[:HAS_BLOCKED]->(u2) return u.id`);
                console.log(`Match (u2:User{id : "${userId}"}),(u:User{id : "${req.id}"}) CREATE (u)-[:HAS_BLOCKED]->(u2) return u.id`);
                // Now remove all the posts too 
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).json({
                    errors: [{ msg: 'Unable to block' }]
                });
            } then = async () => {
                await session.close()
            }
            await User.findByIdAndUpdate(req.id,
                { $pullAll: { friends: [userId] } },
                { new: true },
                function (err, data) { }
            );
            await User.findByIdAndUpdate(userId,
                { $pullAll: { friends: [req.id] } },
                { new: true },
                function (err, data) { }
            );
            res.status(200).send();
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({ errors: [{ msg: "Server Error" }] });
        }
    });


//@route   /api/users/unblockUser
//@desc    Unblock a user
//access   Private
router.post('/unblockUser', auth,
    async (req, res) => {
        const { userId } = req.body;
        try {
            const session = neodriver.session();
            try {
                await session.run(`MATCH (u1)-[hb:HAS_BLOCKED]-(u2) WHERE u1.id = "${userId}" AND u2.id = "${req.id}" DELETE hb`);
                // Now remove all the posts too 
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).json({
                    errors: [{ msg: 'Unable to unblock' }]
                });
            } then = async () => {
                await session.close()
            }
            await User.findByIdAndUpdate(req.id,
                { $pullAll: { friends: [userId] } },
                { new: true },
                function (err, data) { }
            );
            await User.findByIdAndUpdate(userId,
                { $pullAll: { friends: [req.id] } },
                { new: true },
                function (err, data) { }
            );
            res.status(200).send();
        } catch (err) {
            console.log(err.message);
            return res.status(500).json({ errors: [{ msg: "Server Error" }] });
        }
    });

//@route   /api/users/updateProStatus
//@desc    Update Pro Status of user
//access   Private

router.post('/updateProStatus', auth, async (req, res) => {
    const { isPro, expiryDate } = req.body;
    try {
        await User.findByIdAndUpdate(req.id, { isPro, proExpiryDate: Date.parse(expiryDate) });
        return res.status(200).send();
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/checkPro
//@desc    Check Pro Status of user
//access   Private

router.post('/checkPro', auth, async (req, res) => {
    try {
        const user = await User.findById(req.id).select('isPro proExpiryDate');
        let { proExpiryDate, isPro } = user;
        if (isPro) {
            if (proExpiryDate > new Date()) {
                return res.status(200).send({ isPro: true, proExpiryDate });
            } else {
                await User.findByIdAndUpdate(req.id, { isPro: false });
                return res.status(200).send({ isPro: false, proExpiryDate });
            }
        } else {
            return res.status(200).send({ isPro: false, proExpiryDate });
        }

    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/getPrivacySettings
//@desc    Get user's privacy settings
//access   Private

router.post('/getPrivacySettings', auth, async (req, res) => {
    try {
        const user = await User.findById(req.id).select('isPublicProfile');
        let { isPublicProfile } = user;
        return res.status(200).send({ privacySettings: { isPublicProfile } })
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/updatePublicStatus
//@desc    Update user's public status
//access   Private

router.post('/updatePublicStatus', auth, async (req, res) => {
    const { isPublicProfile } = req.body;
    try {
        const user = await User.findById(req.id).select('isPro');
        if (isPublicProfile && !user.isPro) {
            return res.status(403).send("You need to be a pro user to enable this");
        }
        console.log(isPublicProfile, req.body);
        await User.findByIdAndUpdate(req.id, { isPublicProfile });
        return res.status(200).send();
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/getUserFollowers
//@desc    Get user details
//access   Private

router.post('/getUserFollowers', auth, async (req, res) => {
    let { userId, skip } = req.body;
    if (!userId) {
        userId = req.id;
    }
    if (!skip) {
        skip = 0;
    }
    try {
        const session = neodriver.session();
        let followers = [];
        try {
            const neo_res = await session.run(`MATCH (u1{id : "${userId}"})<-[:FOLLOWS]-(u2:User) RETURN u2.id, u2.name, u2.username, u2.profilePicture SKIP ${skip} LIMIT 30`);
            const numberOfFollowers = neo_res.records.length;
            for (let i = 0; i < numberOfFollowers; i++) {
                followers.push(neo_res.records[i]._fields);
            }
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to fetch user following details' }]
            });
        } then = async () => {
            await session.close()
        }
        res.status(200).send({ followers, skip: followers.length, end: followers.length === 0 });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/searchUserFollowers
//@desc    Get user details
//access   Private

router.post('/searchUserFollowers', auth, async (req, res) => {
    let { userId, search } = req.body;
    if (!userId) {
        userId = req.id;
    }
    try {
        const session = neodriver.session();
        let followers = [];
        try {
            const neo_res = await session.run(`MATCH (u1{id : "${userId}"})<-[:FOLLOWS]-(u2:User) WHERE u2.name =~ '(?i)^${search}.*' RETURN u2.id, u2.name, u2.username, u2.profilePicture`);
            const numberOfFollowers = neo_res.records.length;
            for (let i = 0; i < numberOfFollowers; i++) {
                followers.push(neo_res.records[i]._fields);
            }
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to fetch user following details' }]
            });
        } then = async () => {
            await session.close()
        }
        res.status(200).send({ followers });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/getUserFollowing
//@desc    Get user details
//access   Private

router.post('/getUserFollowing', auth, async (req, res) => {
    let { userId, skip } = req.body;
    if (!userId) {
        userId = req.id;
    }
    if (!skip) {
        skip = 0;
    }
    try {
        const session = neodriver.session();
        let following = [];
        try {
            const neo_res = await session.run(`MATCH (u1{id : "${userId}"})-[:FOLLOWS]->(u2:User) RETURN u2.id, u2.name, u2.username, u2.profilePicture SKIP ${skip} LIMIT 30`);
            const numberOfFollowing = neo_res.records.length;
            for (let i = 0; i < numberOfFollowing; i++) {
                following.push(neo_res.records[i]._fields);
            }
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to fetch user following details' }]
            });
        } then = async () => {
            await session.close()
        }
        res.status(200).send({ following, skip: following.length, end: following.length === 0 });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/users/getUserReferrals
//@desc    Get user's referral details
//access   Private

router.post('/getUserReferrals', auth, async (req, res) => {
    try {
        let { referralCode, redeemedInviteTenOffer } = await User.findById(req.id).select('referralCode redeemedInviteTenOffer');
        if (!referralCode) {
            while (!referralCode) {
                var token = '';
                const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                for (var i = 0; i < 6; i++) {
                    var randomPoz = Math.floor(Math.random() * 36);
                    token += charSet.substring(randomPoz, randomPoz + 1);
                }
                token = token.toUpperCase();
                const user = await User.findOne({ referralCode: token });
                if (!user) {
                    referralCode = token;
                    await User.findByIdAndUpdate(req.id, { referralCode });
                }
            }
        }
        const session = neodriver.session();
        let numberOfReferrals = 0;
        try {
            const neo_res = await session.run(`MATCH (u1{id : "${req.id}"})-[:REFERRED]->(u2:User) RETURN COUNT(u2)`);
            numberOfReferrals = neo_res.records[0]._fields[0].low;
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to fetch user following details' }]
            });
        } then = async () => {
            await session.close()
        }
        res.status(200).send({ referralCode, numberOfReferrals, redeemedInviteTenOffer });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/users/redeemTenInvites
//@desc    Redeem pro for ten invites
//access   Private

router.post('/redeemTenInvites', auth, async (req, res) => {
    try {
        const session = neodriver.session();
        try {
            const neo_res = await session.run(`MATCH (u1{id : "${req.id}"})-[:REFERRED]->(u2:User) RETURN COUNT(u2)`);
            const numberOfReferrals = neo_res.records[0]._fields[0].low;
            if (numberOfReferrals >= 10) {
                const today = new Date();
                const proExpiryDate = new Date(today.setMonth(today.getMonth() + 1));
                await User.findByIdAndUpdate(req.id, {
                    redeemedInviteTenOffer: true,
                    isPro: true,
                    proExpiryDate,
                });
                return res.status(200).send(proExpiryDate);
            } else {
                res.status(403).send();
            }
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to fetch user following details' }]
            });
        } then = async () => {
            await session.close()
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/users/logout
//@desc    Log a user out
//access   Private

router.post('/logout', auth, async (req, res) => {
    const { userId } = req.body;
    try {
        await User.findByIdAndUpdate(req.id,
            {
                $pull:
                    { 'notificationTokens': userId }
            }
        );
        res.status(200).send();
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;
