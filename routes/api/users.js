const config = require('config');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth')
const neodriver = require('../../neo4jconnect');
const sendWelcomeMail = require('../email/welcomeMail');
const { check, validationResult } = require('express-validator');

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
        const { name, email, password, confirmPassword, username } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        //Check if passwords are same
        if (!(password === confirmPassword)) {
            return res.status(400).json({ errors: [{ msg: 'Passwords are not the same' }] });
        }
        try {
            //Check if email exists
            let user = await User.findOne({ email });
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
                profilePicture: "user.png"
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
            const session = neodriver.session();
            try {
                await session.run(`CREATE (u:User {id : "${user._id}", name : "${user.name}"}) RETURN u`);
                await session.run(`CREATE (g:Group {id : "${group._id}", name : "${group.name}", description: "Share with everyone who follows you"}) RETURN g`);
                await session.run(`MATCH (u), (g) WHERE u.id = "${user._id}" AND g.id = "${group._id}" CREATE (u)-[:HAS_GROUP]->(g)`);
                await session.run(`MATCH (u), (g) WHERE u.id = "${user._id}" AND g.id = "${group._id}" CREATE (u)-[:MEMBER_OF]->(g)`);
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
                // newLogin(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
                // sendNewLoginMail(user.email, user.username, (req.headers['x-forwarded-for'] || req.connection.remoteAddress))
                //     .then(() => console.log("Email Sent"))
                //     .catch((err) => console.log(err));

                const { name, username, profilePicture } = user;
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
                // newLogin(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
                // sendNewLoginMail(user.email, user.username, (req.headers['x-forwarded-for'] || req.connection.remoteAddress))
                //     .then(() => console.log("Email Sent"))
                //     .catch((err) => console.log(err));
                const { name, username, profilePicture } = user;
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
//access   Private

router.post('/getUserDetails', auth, async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findById(userId);
        const { name, username, profilePicture, friends } = user;
        var userDetails = { name, username, profilePicture, friends: friends.length };
        const session = neodriver.session();
        try {
            const neo_res = await session.run(`MATCH (u1),(u2) WHERE u1.id = "${userId}" AND u2.id = "${req.id}" RETURN EXISTS((u1)-[:FOLLOWS]-(u2))`);
            userDetails.isFollowing = neo_res.records[0]._fields[0];
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to create account. Please try again later.' }]
            });
        } then = async () => {
            await session.close()
        }
        console.log(userDetails);
        res.status(200).send(userDetails);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;
