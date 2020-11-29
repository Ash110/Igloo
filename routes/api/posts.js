const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Group = require('../../models/Group');
const Post = require('../../models/Group');
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
    try {
        await Post.findOneAndUpdate({ _id: postId }, { caption, expiryDate, isText: false, disableComments, selectedGroups });
        await User.findOneAndUpdate({ _id: postId }, { $push : {posts : [postId]} });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (p:Post {id : "${postId}", type : "image"}) return p`);
            await session.run(`MATCH (u:User{id : "${req.id}"}),(p:Post {id : "${postId}"}) CREATE (u)-[:HAS_POST {expiryDate : "${expiryDate}", publishDate:"${new Date()}"}]->(p) return u.name`);
            selectedGroups.map(async (groupId) => {
                await session.run(`MATCH (g:Group{id : "${groupId}"}),(p:Post {id : "${postId}"}) CREATE (g)-[:CONTAINS]->(p) return g.id`);
                await session.run(`MATCH (u:User)-[:MEMBER_OF]->(g:Group{id: "${groupId}"})-[:CONTAINS]->(p:Post{id:"${postId}"}) CREATE (u)-[:IN_FEED {expiryDate : "${expiryDate}", publishDate:"${new Date()}"}]->(p) return u.name`);
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

module.exports = router;