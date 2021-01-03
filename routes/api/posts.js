const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/posts/createImagePost
//@desc    Create the image post
//access   Private

router.post('/createImagePost', auth, async (req, res) => {
    const { caption, validity, selectedGroups, disableComments, postId } = req.body;
    var expiryDate = new Date();
    if (validity == 0) {
        expiryDate.setHours(expiryDate.getHours() + 1);
    }
    if (validity == 1) {
        expiryDate.setDate(expiryDate.getDate() + 1);
    }
    if (validity == 2) {
        expiryDate.setDate(expiryDate.getDate() + 7);
    }
    if (validity == 3) {
        expiryDate.setFullYear(expiryDate.getFullYear() + 99);
    }
    expiryDate = expiryDate.toISOString();
    try {
        await Post.findOneAndUpdate({ _id: postId }, { caption, expiryDate, isText: false, disableComments, selectedGroups });
        await User.findOneAndUpdate({ _id: req.id }, { $push: { posts: [postId] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (p:Post {id : "${postId}", type : "image", expiryDate : "${expiryDate}", publishDate:"${new Date().toISOString()}" }) return p`);
            await session.run(`MATCH (u:User{id : "${req.id}"}),(p:Post {id : "${postId}"}) CREATE (u)-[:HAS_POST]->(p) return u.name`);
            selectedGroups.map(async (groupId) => {
                await session.run(`MATCH (g:Group{id : "${groupId}"}),(p:Post {id : "${postId}"}) CREATE (g)-[:CONTAINS]->(p) return g.id`);
                await session.run(`MATCH (u:User)-[:MEMBER_OF]->(g:Group{id: "${groupId}"})-[:CONTAINS]->(p:Post{id:"${postId}"}) MERGE (u)-[:IN_FEED]->(p) return u.name`);
            });
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create post");
        } then = async () => {
            await session.close()
        }
        return res.status(200).send("Done");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/posts/createTextPost
//@desc    Create the Text post
//access   Private

router.post('/createTextPost', auth, async (req, res) => {
    const { caption, validity, selectedGroups, disableComments } = req.body;
    var expiryDate = new Date();
    if (validity == 0) {
        expiryDate.setHours(expiryDate.getHours() + 1);
    }
    if (validity == 1) {
        expiryDate.setDate(expiryDate.getDate() + 1);
    }
    if (validity == 2) {
        expiryDate.setDate(expiryDate.getDate() + 7);
    }
    if (validity == 3) {
        expiryDate.setFullYear(expiryDate.getFullYear() + 99);
    }
    expiryDate = expiryDate.toISOString();
    try {
        const post = new Post({
            caption, expiryDate, isText: true, disableComments, selectedGroups, creator: req.id,
        });
        await post.save();
        await User.findOneAndUpdate({ _id: post._id }, { $push: { posts: [post._id] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (p:Post {id : "${post._id}", expiryDate : "${expiryDate}", publishDate:"${new Date().toISOString()}", type : "text"}) return p`);
            await session.run(`MATCH (u:User{id : "${req.id}"}),(p:Post {id : "${post._id}"}) CREATE (u)-[:HAS_POST]->(p) return u.name`);
            selectedGroups.map(async (groupId) => {
                const localsession = neodriver.session();
                console.log(groupId);
                await localsession.run(`MATCH (g:Group{id : "${groupId}"}),(p:Post {id : "${post._id}"}) CREATE (g)-[:CONTAINS]->(p) return g.id`);
                await localsession.run(`MATCH (u:User)-[:MEMBER_OF]->(g:Group{id: "${groupId}"})-[:CONTAINS]->(p:Post{id:"${post._id}"}) MERGE (u)-[:IN_FEED]->(p) return u.name`);
                await localsession.close()
            });
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create post");
        } then = async () => {
            await session.close()
        }
        return res.status(200).send("Done");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/posts/getPostDetails
//@desc    Get post details
//access   Private

router.post('/getPostDetails', auth, async (req, res) => {
    const { postId } = req.body;
    try {
        const post = await Post.findById(postId).populate({ path: 'creator', 'select': 'name profilePicture username' });
        if (post) {
            const { isText, image, disableComments, caption, publishTime, likes, creator } = post;
            var responsePost = { isText, image, disableComments, caption, publishTime, creator, }
            if (creator._id.toString() === req.id.toString()) {
                responsePost.isCreator = true;
            } else {
                responsePost.isCreator = false;
            }
            responsePost.likes = likes.length;
            responsePost.hasLiked = false;
            const session = neodriver.session();
            try {
                const neo_res = await session.run(`return EXISTS((:User{ id : "${req.id}" })-[:LIKES]->(:Post{id : "${postId}"}))`);
                responsePost.hasLiked = neo_res.records[0]._fields[0];
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Unable to get post");
            } then = async () => {
                await session.close()
            }
            return res.status(200).send(responsePost);
        }
        else {
            return res.status(404).send("Post not found")
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/posts/likePost
//@desc    Like a post
//access   Private

router.post('/likePost', auth, async (req, res) => {
    const { postId } = req.body;
    try {
        const post = await Post.findById(postId);
        console.log(`MATCH (:User{ id : "${req.id}" }), (:Post{id : "${postId}"}) CREATE (u)-[:LIKES]->(p)`)
        if (post) {
            const session = neodriver.session();
            try {
                await session.run(`MATCH (u:User{ id : "${req.id}" }), (p:Post{id : "${postId}"}) CREATE (u)-[:LIKES]->(p)`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Unable to like post");
            } then = async () => {
                await session.close()
            }
            return res.status(200).send("Done");
        }
        else {
            return res.status(404).send("Post not found")
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/posts/unlikePost
//@desc    Like a post
//access   Private

router.post('/unlikePost', auth, async (req, res) => {
    const { postId } = req.body;
    try {
        const post = await Post.findById(postId);
        if (post) {
            const session = neodriver.session();
            try {
                await session.run(`MATCH (:User{id : "${req.id}"})-[l:LIKES]->(:Post{id : "${postId}"}) DELETE l`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Unable to like post");
            } then = async () => {
                await session.close()
            }
            return res.status(200).send("Done");
        }
        else {
            return res.status(404).send("Post not found")
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;