const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Comment = require('../../models/Comment');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');
const Post = require('../../models/Post');

const router = express.Router();

//@route   POST /api/comments/getComments
//@desc    Create a new comment
//access   Private

router.post('/getComments', auth, async (req, res) => {
    const { postId } = req.body;
    try {
        const post = await Post.findById(postId).select('comments');
        res.status(200).send(post.comments);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal Error");
    }
});

//@route   POST /api/comments/createComment
//@desc    Create a new comment
//access   Private

router.post('/createComment', auth, async (req, res) => {
    const { parentPost, text, isReply } = req.body;
    try {
        let comment = new Comment({
            parentPost,
            text,
            creator: req.id,
            isReply,
        });
        await comment.save();
        await Post.findOneAndUpdate({ _id: parentPost }, { $push: { comments: [comment._id] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (c:Comment {id : "${comment._id}", creator : "${req.id}", text: "${text}"}) RETURN c`);
            await session.run(`Match (c:Comment {id : "${comment._id}"}), (p:Post{id : "${parentPost}"}) MERGE (p)-[:HAS_COMMENT]->(c) RETURN c.id`);
            await session.close()
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create comment");
        }
        res.status(200).send(comment._id);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal Error");
    }
});

//@route   POST /api/comments/getCommentDetails
//@desc    Get a single ocmment
//access   Private

router.post('/getCommentDetails', auth, async (req, res) => {
    const { commentId } = req.body;
    try {
        const comment = await Comment.findById(commentId).populate('creator', 'name profilePicture').select('text creator isReply likes');
        let response = {
            text: comment.text,
            creator: comment.creator,
            isReply: comment.isReply,
            likes: comment.like ? comment.likes.length : 0,
            isCreator: req.id.toString() === comment.creator._id.toString(),
        }
        const session = neodriver.session();
        try {
            const neo_res = await session.run(`RETURN EXISTS ((:User{id : "${req.id}"})-[:LIKES_COMMENT]->(:Comment {id : "${comment._id}"}))`);
            response.hasLiked = neo_res.records[0]._fields[0];
            await session.close()
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create comment");
        }
        res.status(200).send(response);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal Error");
    }
});

module.exports = router;