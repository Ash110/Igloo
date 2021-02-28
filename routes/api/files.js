const fs = require('fs');
var aws = require('aws-sdk')
const path = require('path');
const multer = require('multer');
var multerS3 = require('multer-s3')
const express = require('express');
const exifremove = require('exifremove');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

var s3 = new aws.S3({})


//@route   POST /api/files/uploadProfilePicture
//@desc    Upload a new Profile Picture
//access   Private

router.post('/uploadProfilePicture', auth, (req, res) => {
    //Set storage engine
    // var imageName = '';
    // const storage = multer.diskStorage({
    //     destination: './images/profilepictures/',
    //     filename: (req, file, callback) => {
    //         imageName = req.id + path.extname(file.originalname);
    //         callback(null, req.id + path.extname(file.originalname));
    //     }
    // })

    //Initialise Upload
    // const upload = multer({ storage }).single('profilepicture');
    const upload = multer({
        storage: multerS3({
            s3: s3,
            bucket: 'iglooprofilepictures',
            acl: 'public-read',
            metadata: function (req, file, cb) {
                const imageName = req.id + path.extname(file.originalname);
                cb(null, { fieldName: imageName });
            },
            key: function (req, file, cb) {
                const imageName = req.id + path.extname(file.originalname);
                cb(null, imageName);
            }
        })
    }).single('profilepicture');
    //Start the upload
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        } else {
            const imageUrl = req.file.location;
            console.log(`Match (u:User {id : "${req.id}"}) SET u.profilePicture = "${imageUrl}"`);
            await User.findOneAndUpdate({ _id: req.id }, { profilePicture: imageUrl });
            const session = neodriver.session();
            try {
                await session.run(`Match (u:User {id : "${req.id}"}) SET u.profilePicture = "${imageUrl}"`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Unable to update profile picture");
            } then = async () => {
                await session.close()
            }
            res.status(200).send(imageUrl);
        }
    });
});

//@route   POST /api/files/uploadHeaderImage
//@desc    Upload a new Header Image
//access   Private

router.post('/uploadHeaderImage', auth, (req, res) => {
    //Set storage engine
    // var imageName = '';
    // const storage = multer.diskStorage({
    //     destination: './images/headerimages/',
    //     filename: (req, file, callback) => {
    //         imageName = req.id + path.extname(file.originalname);
    //         callback(null, req.id + path.extname(file.originalname));
    //     }
    // })

    // //Initialise Upload
    // const upload = multer({ storage }).single('headerimage');

    const upload = multer({
        storage: multerS3({
            s3: s3,
            bucket: 'iglooheaderimages',
            acl: 'public-read',
            metadata: function (req, file, cb) {
                const imageName = req.id + path.extname(file.originalname);
                cb(null, { fieldName: imageName });
            },
            key: function (req, file, cb) {
                const imageName = req.id + path.extname(file.originalname);
                cb(null, imageName);
            }
        })
    }).single('headerimage');

    //Start the upload
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        } else {
            const imageUrl = req.file.location;
            await User.findOneAndUpdate({ _id: req.id }, { headerImage: imageUrl });
            const session = neodriver.session();
            try {
                await session.run(`Match (u:User {id : "${req.id}"}) SET u.headerImage = "${imageUrl}"`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Unable to update profile picture");
            } then = async () => {
                await session.close()
            }
            res.status(200).send(imageUrl);
        }
    });
});

//@route   POST /api/files/uploadImagePost
//@desc    Upload a new Image Post
//access   Private

router.post('/uploadImagePost', auth, (req, res) => {
    // Set storage engine
    // var imageName = '';
    // const storage = multer.diskStorage({
    //     destination: './images/posts/',
    //     filename: (req, file, callback) => {
    //         imageName = req.id + "_" + Date.now() + path.extname(file.originalname);
    //         callback(null, imageName);
    //     }
    // })

    // //Initialise Upload
    // const upload = multer({ storage }).single('post');

    const upload = multer({
        storage: multerS3({
            s3: s3,
            bucket: 'iglooposts',
            acl: 'public-read',
            metadata: function (req, file, cb) {
                const imageName = req.id + path.extname(file.originalname);
                cb(null, { fieldName: imageName });
            },
            key: function (req, file, cb) {
                const imageName = req.id + path.extname(file.originalname);
                cb(null, imageName);
            }
        })
    }).single('post');

    //Start the upload
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        } else {
            try {
                const imageUrl = req.file.location;
                const post = new Post({
                    creator: req.id,
                    isText: false,
                    image: imageUrl,
                });
                await post.save();
                res.status(200).send({ imageName: imageUrl, postId: post._id });
            } catch (err) {
                console.log(err);
            }
        }
    });
});

//@route   POST /api/files/uploadPageImagePost
//@desc    Upload a new Page Image Post
//access   Private

router.post('/uploadPageImagePost', auth, (req, res) => {
    // Set storage engine
    // var imageName = '';
    // const storage = multer.diskStorage({
    //     destination: './images/pageposts/',
    //     filename: (req, file, callback) => {
    //         imageName = req.id + "_" + Date.now() + path.extname(file.originalname);
    //         callback(null, imageName);
    //     }
    // })

    // //Initialise Upload
    // const upload = multer({ storage }).single('post');

    const upload = multer({
        storage: multerS3({
            s3: s3,
            bucket: 'iglooposts',
            acl: 'public-read',
            metadata: function (req, file, cb) {
                const imageName = req.id + path.extname(file.originalname);
                cb(null, { fieldName: imageName });
            },
            key: function (req, file, cb) {
                const imageName = req.id + path.extname(file.originalname);
                cb(null, imageName);
            }
        })
    }).single('post');

    //Start the upload
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        } else {
            const imageUrl = req.file.location;
            const post = new Post({
                creator: req.id,
                isText: false,
                image: imageUrl,
                isPagePost: true,
            });
            await post.save();
            res.status(200).send({ imageName: imageUrl, postId: post._id });
        }
    });
});

module.exports = router;