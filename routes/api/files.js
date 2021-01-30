const path = require('path');
const multer = require('multer');
const express = require('express');
const User = require('../../models/User');
const Group = require('../../models/Group');
const Post = require('../../models/Post');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/files/uploadProfilePicture
//@desc    Upload a new Profile Picture
//access   Private

router.post('/uploadProfilePicture', auth, (req, res) => {
    //Set storage engine
    var imageName = '';
    const storage = multer.diskStorage({
        destination: './images/profilepictures/',
        filename: (req, file, callback) => {
            imageName = req.id + path.extname(file.originalname);
            callback(null, req.id + path.extname(file.originalname));
        }
    })

    //Initialise Upload
    const upload = multer({ storage }).single('profilepicture');
    //Start the upload
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        } else {
            console.log(req.file);
            console.log(`Match (u:User {id : "${req.id}"}) SET u.profilePicture = "${imageName}"`);
            await User.findOneAndUpdate({ _id: req.id }, { profilePicture: imageName });
            const session = neodriver.session();
            try {
                await session.run(`Match (u:User {id : "${req.id}"}) SET u.profilePicture = "${imageName}"`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Unable to update profile picture");
            } then = async () => {
                await session.close()
            }
            return res.status(200).send(imageName);
        }
    });
});

//@route   POST /api/files/uploadHeaderImage
//@desc    Upload a new Header Image
//access   Private

router.post('/uploadHeaderImage', auth, (req, res) => {
    //Set storage engine
    var imageName = '';
    const storage = multer.diskStorage({
        destination: './images/headerimages/',
        filename: (req, file, callback) => {
            imageName = req.id + path.extname(file.originalname);
            callback(null, req.id + path.extname(file.originalname));
        }
    })

    //Initialise Upload
    const upload = multer({ storage }).single('headerimage');
    //Start the upload
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        } else {
            console.log(req.file);
            console.log(`Match (u:User {id : "${req.id}"}) SET u.headerImage = "${imageName}"`);
            await User.findOneAndUpdate({ _id: req.id}, {headerImage: imageName });
            const session = neodriver.session();
            try {
                await session.run(`Match (u:User {id : "${req.id}"}) SET u.headerImage = "${imageName}"`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Unable to update profile picture");
            } then = async () => {
                await session.close()
            }
            return res.status(200).send(imageName);
        }
    });
});

//@route   POST /api/files/uploadImagePost
//@desc    Upload a new Image Post
//access   Private

router.post('/uploadImagePost', auth, (req, res) => {
    // Set storage engine
    var imageName = '';
    const storage = multer.diskStorage({
        destination: './images/posts/',
        filename: (req, file, callback) => {
            imageName = req.id + "_" + Date.now() + path.extname(file.originalname);
            callback(null, imageName);
        }
    })

    //Initialise Upload
    const upload = multer({ storage }).single('post');

    //Start the upload
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        } else {
            console.log(req.file);
            const post = new Post({
                creator: req.id,
                isText: false,
                image: imageName,
            });
            await post.save();
            return res.status(200).send({ imageName, postId: post._id });
        }
    });
});

//@route   POST /api/files/uploadPageImagePost
//@desc    Upload a new Page Image Post
//access   Private

router.post('/uploadPageImagePost', auth, (req, res) => {
    // Set storage engine
    var imageName = '';
    const storage = multer.diskStorage({
        destination: './images/pageposts/',
        filename: (req, file, callback) => {
            imageName = req.id + "_" + Date.now() + path.extname(file.originalname);
            callback(null, imageName);
        }
    })

    //Initialise Upload
    const upload = multer({ storage }).single('post');

    //Start the upload
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        } else {
            console.log(req.file);
            const post = new Post({
                creator: req.id,
                isText: false,
                image: imageName,
                isPagePost: true,
            });
            await post.save();
            return res.status(200).send({ imageName, postId: post._id });
        }
    });
});

module.exports = router;