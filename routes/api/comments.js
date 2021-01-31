const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const auth = require('../../middleware/auth');
const Comment = require('../../models/Comment');
const neodriver = require('../../neo4jconnect');
const { sendActionNotification } = require('../pushNotifications/actionNotification');

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
        const post = await Post.findById(parentPost);
        if (req.id !== post.creator.toString()) {
            const notification = new Notification({
                trigger: 'postComment',
                sender: req.id,
                triggerPost: parentPost,
                commentText: text,
            });
            await notification.save();
            await User.findOneAndUpdate({ _id: post.creator }, {
                $push: {
                    notifications: {
                        $each: [notification._id],
                        $position: 0
                    }
                }
            });
            await User.findByIdAndUpdate(post.creator, {
                newNotifications: true,
            });
            await User.findByIdAndUpdate(post.creator, { $inc: { numberOfNewNotifications: 1 } });
            const senderUser = await User.findById(req.id).select('name');
            let userNotificationTokens = await User.findById(post.creator).select('notificationTokens');
            userNotificationTokens = userNotificationTokens.notificationTokens;
            userNotificationTokens.map((token) => {
                sendActionNotification(token, `${senderUser.name} has commented your post`, text, "notifications");
            });
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
    let { commentId } = req.body;
    try {
        commentId = (commentId.replace(/\"/g, ""))
        const comment = await Comment.findById(commentId).populate('creator', 'name profilePicture').select('text creator isReply likes replies');
        let response = {
            text: comment.text,
            creator: comment.creator,
            isReply: comment.isReply,
            likes: comment.like ? comment.likes.length : 0,
            replies: comment.replies ? comment.replies : [],
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

//@route   POST /api/comments/likeComment
//@desc    Like a comment
//access   Private

router.post('/likeComment', auth, async (req, res) => {
    const { commentId } = req.body;
    try {
        const comment = await Comment.findById(commentId);
        if (comment) {
            const session = neodriver.session();
            try {
                await session.run(`MATCH (u:User{ id : "${req.id}" }), (c:Comment{id : "${commentId}"}) CREATE (u)-[:LIKES_COMMENT]->(c)`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Unable to like comment");
            } then = async () => {
                await session.close()
            }
            await Comment.findOneAndUpdate({ _id: commentId }, { $push: { likes: [req.id] } });
            return res.status(200).send("Done");
        }
        else {
            return res.status(404).send("Comment not found")
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/comments/unlikeComment
//@desc    Like a post
//access   Private

router.post('/unlikeComment', auth, async (req, res) => {
    const { commentId } = req.body;
    try {
        const comment = await Comment.findById(commentId);
        if (comment) {
            const session = neodriver.session();
            try {
                await session.run(`MATCH (:User{id : "${req.id}"})-[l:LIKES_COMMENT]->(c:Comment{id : "${commentId}"}) DELETE l`);
            } catch (e) {
                console.log(e);
                await session.close()
                return res.status(500).send("Unable to like comment");
            } then = async () => {
                await session.close()
            }
            Comment.findOneAndUpdate(
                { _id: commentId },
                { $pullAll: { likes: [req.id] } },
                { new: true },
                function (err, data) { }
            );
            return res.status(200).send("Done");
        }
        else {
            return res.status(404).send("Comment not found")
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/comments/createCommentReply
//@desc    Create a new comment
//access   Private

router.post('/createCommentReply', auth, async (req, res) => {
    let { parentComment, text, isReply } = req.body;
    parentComment = (parentComment.replace(/\"/g, ""))
    try {
        let comment = new Comment({
            parentComment,
            text,
            creator: req.id,
            isReply,
        });
        await comment.save();
        await Comment.findOneAndUpdate({ _id: parentComment }, { $push: { replies: [comment._id] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (c:Comment {id : "${comment._id}", creator : "${req.id}", text: "${text}"}) RETURN c`);
            await session.run(`Match (c1:Comment {id : "${comment._id}"}), (c2:Comment{id : "${parentComment}"}) MERGE (c2)-[:HAS_REPLY]->(c1) RETURN c1.id`);
            await session.close()
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create reply");
        }
        res.status(200).send(comment._id);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal Error");
    }
});

//@route   POST /api/comments/deleteComment
//@desc    Delete a comment
//access   Private

router.post('/deleteComment', auth, async (req, res) => {
    const { commentId, parentPost, isReply, parentComment } = req.body;
    try {
        if (isReply) {
            await Comment.findOneAndUpdate(
                { _id: parentComment },
                { $pullAll: { replies: [commentId] } },
                { new: true },
                function (err, data) { }
            );
            const replysession = neodriver.session();
            try {
                await replysession.run(`Match (c:Comment {id : "${commentId}"}) DETACH DELETE c`);
                await replysession.close()
            } catch (e) {
                console.log(e);
                await replysession.close()
            }
            await Comment.findByIdAndDelete(commentId);
            return res.status(200).send("Deleted");
        } else {
            const comment = await Comment.findById(commentId).select('replies');
            comment.replies.map(async (reply) => {
                await Comment.findOneAndUpdate(
                    { _id: commentId },
                    { $pullAll: { replies: [reply] } },
                    { new: true },
                    function (err, data) { }
                );
                await Comment.findByIdAndDelete(reply);
                const replysession = neodriver.session();
                try {
                    await replysession.run(`Match (c:Comment {id : "${reply}"}) DETACH DELETE c`);
                    await replysession.close()
                } catch (e) {
                    console.log(e);
                    await replysession.close()
                }
            });
            await Post.findOneAndUpdate(
                { _id: parentPost },
                { $pullAll: { comments: [commentId] } },
                { new: true },
                function (err, data) { }
            );
            const session = neodriver.session();
            try {
                await session.run(`Match (c:Comment {id : "${commentId}"}) DETACH DELETE c`);
                await session.close()
            } catch (e) {
                console.log(e);
                await session.close()
            }
            await Comment.findByIdAndDelete(commentId);
            return res.status(200).send(comment._id);
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal Error");
    }
});

module.exports = router;