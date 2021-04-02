var AWS = require("aws-sdk");
var uuid = require('uuid');
const fs = require('fs');
const User = require('./models/User');
const Post = require('./models/Post');
const s3 = new AWS.S3();
const config = require('config')
const mongoose = require('mongoose')

const getUsers = async () => {
    try {
        const db = config.get('mongoURI');
        mongoose.set('useCreateIndex', true)
        await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, });
        console.log("DB connected");
        const users = await User.find().select('_id profilePicture headerImage');
        for (let i of users) {
            if (i.profilePicture != 'user.png') {
                const fileContent = fs.readFileSync(`./images/profilepictures/${i.profilePicture}`);

                // Setting up S3 upload parameters
                const params = {
                    Bucket: "iglooprofilepictures",
                    Key: i.profilePicture, // File name you want to save as in S3
                    Body: fileContent,
                    ACL: 'public-read'
                };

                // Uploading files to the bucket
                s3.upload(params, async (err, data) => {
                    if (err) {
                        throw err;
                    }
                    console.log(`File uploaded successfully. ${data.Location}`);
                    await User.findByIdAndUpdate(i._id, { profilePicture: data.Location });
                });
            } else {
                await User.findByIdAndUpdate(i._id, { profilePicture: "https://iglooprofilepictures.s3.ap-south-1.amazonaws.com/user.png" });
            }
            if (i.headerImage != 'default.png') {
                const fileContent = fs.readFileSync(`./images/headerimages/${i.headerImage}`);

                // Setting up S3 upload parameters
                const params = {
                    Bucket: "iglooheaderimages",
                    Key: i.headerImage, // File name you want to save as in S3
                    Body: fileContent,
                    ACL: 'public-read'
                };

                // Uploading files to the bucket
                s3.upload(params, async (err, data) => {
                    if (err) {
                        throw err;
                    }
                    console.log(`File uploaded successfully. ${data.Location}`);
                    await User.findByIdAndUpdate(i._id, { headerImage: data.Location });
                });
            } else {
                await User.findByIdAndUpdate(i._id, { headerImage: "https://iglooheaderimages.s3.ap-south-1.amazonaws.com/default.png" });
            }
        }
    } catch (err) {
        console.log(err);
    }
}


const getPosts = async () => {
    try {
        const db = config.get('mongoURI');
        mongoose.set('useCreateIndex', true)
        await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, });
        console.log("DB connected");
        const posts = await Post.find().select('_id image isPagePost');
        for (let i of posts) {
            if (i.image) {
                const fileContent = fs.readFileSync(`./images/posts/${i.image}`);

                // Setting up S3 upload parameters
                const params = {
                    Bucket: "iglooposts",
                    Key: i.image, // File name you want to save as in S3
                    Body: fileContent,
                    ACL: 'public-read'
                };

                // Uploading files to the bucket
                s3.upload(params, async (err, data) => {
                    if (err) {
                        throw err;
                    }
                    console.log(`File uploaded successfully. ${data.Location}`);
                    await Post.findByIdAndUpdate(i._id, { image: data.Location });
                });
            }
        }
    } catch (err) {
        console.log(err);
    }
}

// getUsers();


// getPosts();

// const setTokensToEmpty = async () => {
//     try {
//         const db = config.get('mongoURI');
//         mongoose.set('useCreateIndex', true)
//         await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, });
//         console.log("DB connected");
//         const users = await User.find().select('_id name');
//         for (let i of users) {
//             console.log(`Changing for ${i.name}`)
//             await User.findByIdAndUpdate(i._id, { notificationTokens : []})
//         }
//     } catch (err) {
//         console.log(err);
//     }
// }

// setTokensToEmpty();

const setUsersToPro = async () => {
    try {
        const db = config.get('mongoURI');
        mongoose.set('useCreateIndex', true)
        await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, });
        console.log("DB connected");
        const users = await User.find().select('_id name');
        for (let i of users) {
            console.log(i.name);
            await User.findByIdAndUpdate(i._id, { isPro: true, proExpiryDate: "2029-02-10T08:53:21.000+00:00" })
        }
    } catch (err) {
        console.log(err);
    }
}

setUsersToPro();