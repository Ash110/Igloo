const path = require('path');
const axios = require('axios');
const config = require('config');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Page = require('../../models/Page');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');
const LocalIMDb = require('../../models/LocalIMDb');
const Notification = require('../../models/Notification');
const { sendActionNotification } = require('../pushNotifications/actionNotification');

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
                const localsession = neodriver.session();
                await localsession.run(`MATCH (g:Group{id : "${groupId}"}),(p:Post {id : "${postId}"}) CREATE (g)-[:CONTAINS]->(p) return g.id`);
                await localsession.run(`MATCH (u:User)-[:MEMBER_OF]->(g:Group{id: "${groupId}"})-[:CONTAINS]->(p:Post{id:"${postId}"}) MERGE (u)-[:IN_FEED]->(p) return u.name`);
                await localsession.close();
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

//@route   POST /api/posts/createPageImagePost
//@desc    Create the image post
//access   Private

router.post('/createPageImagePost', auth, async (req, res) => {
    const { caption, validity, selectedPage, disableComments, postId } = req.body;
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
        await Post.findOneAndUpdate({ _id: postId }, { caption, expiryDate, isText: false, disableComments, page: selectedPage, isPagePost: true, });
        await Page.findOneAndUpdate({ _id: selectedPage }, { $push: { posts: [postId] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (p:Post {id : "${postId}", type : "image", expiryDate : "${expiryDate}", publishDate:"${new Date().toISOString()}" }) return p`);
            await session.run(`MATCH (pg:Page{id : "${selectedPage}"}),(p:Post {id : "${post.id}"}) CREATE (pg)-[:PAGE_HAS_POST]->(p) return pg.id`);
            await session.run(`MATCH (u:User)-[:SUBSCRIBED_TO]->(pg:Page{id: "${selectedPage}"})-[:PAGE_HAS_POST]->(p:Post{id:"${postId}"}) MERGE (u)-[:IN_FEED]->(p) return u.id`);
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

//@route   POST /api/posts/createPageTextPost
//@desc    Create a Page Text post
//access   Private

router.post('/createPageTextPost', auth, async (req, res) => {
    const { caption, validity, selectedPage, disableComments } = req.body;
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
            caption,
            expiryDate,
            isText: true,
            disableComments,
            page: selectedPage,
            creator: req.id,
            isPagePost: true,
        });
        await post.save();
        await Page.findOneAndUpdate({ _id: selectedPage }, { $push: { posts: [post._id] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (p:Post {id : "${post._id}", type : "text", expiryDate : "${expiryDate}", publishDate:"${new Date().toISOString()}" }) return p`);
            await session.run(`MATCH (pg:Page{id : "${selectedPage}"}),(p:Post {id : "${post._id}"}) CREATE (pg)-[:PAGE_HAS_POST]->(p) return pg.id`);
            await session.run(`MATCH (u:User)-[:SUBSCRIBED_TO]->(pg:Page{id: "${selectedPage}"})-[:PAGE_HAS_POST]->(p:Post{id:"${post._id}"}) MERGE (u)-[:IN_FEED]->(p) return u.id`);
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

//@route   POST /api/posts/createSongPost
//@desc    Create a Song post
//access   Private

router.post('/createSongPost', auth, async (req, res) => {
    const { caption, validity, selectedGroups, disableComments, songDetails } = req.body;
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
            caption,
            expiryDate,
            isText: false,
            isSong: true,
            disableComments,
            selectedGroups,
            creator: req.id,
            songDetails
        });
        await post.save();
        await User.findOneAndUpdate({ _id: post._id }, { $push: { posts: [post._id] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (p:Post {id : "${post._id}", expiryDate : "${expiryDate}", publishDate:"${new Date().toISOString()}", type : "song"}) return p`);
            await session.run(`MATCH (u:User{id : "${req.id}"}),(p:Post {id : "${post._id}"}) CREATE (u)-[:HAS_POST]->(p) return u.name`);
            selectedGroups.map(async (groupId) => {
                const localsession = neodriver.session();
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

//@route   POST /api/posts/createPageSongPost
//@desc    Create a Song post
//access   Private

router.post('/createPageSongPost', auth, async (req, res) => {
    const { caption, validity, selectedPage, disableComments, songDetails } = req.body;
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
            caption,
            expiryDate,
            isText: false,
            isSong: true,
            disableComments,
            page: selectedPage,
            creator: req.id,
            songDetails,
            isPagePost: true,
        });
        await post.save();
        await Page.findOneAndUpdate({ _id: selectedPage }, { $push: { posts: [post._id] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (p:Post {id : "${post.id}", type : "text", expiryDate : "${expiryDate}", publishDate:"${new Date().toISOString()}" }) return p`);
            await session.run(`MATCH (pg:Post{id : "${selectedPage}"}),(p:Post {id : "${post.id}"}) CREATE (pg)-[:PAGE_HAS_POST]->(p) return pg.id`);
            await session.run(`MATCH (u:User)-[:SUBSCRIBED_TO]->(pg:Page{id: "${selectedPage}"})-[:PAGE_HAS_POST]->(p:Post{id:"${post.id}"}) MERGE (u)-[:IN_FEED]->(p) return u.id`);
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

//@route   POST /api/posts/createMoviePost
//@desc    Create a Movie or Show post
//access   Private

router.post('/createMoviePost', auth, async (req, res) => {
    const { caption, validity, selectedGroups, disableComments, imdbId } = req.body;
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
            caption,
            expiryDate,
            isMovie: true,
            disableComments,
            selectedGroups,
            creator: req.id,
            imdbId
        });
        await post.save();
        await User.findOneAndUpdate({ _id: post._id }, { $push: { posts: [post._id] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (p:Post {id : "${post._id}", expiryDate : "${expiryDate}", publishDate:"${new Date().toISOString()}", type : "movie"}) return p`);
            await session.run(`MATCH (u:User{id : "${req.id}"}),(p:Post {id : "${post._id}"}) CREATE (u)-[:HAS_POST]->(p) return u.name`);
            selectedGroups.map(async (groupId) => {
                const localsession = neodriver.session();
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

//@route   POST /api/posts/createPageMoviePost
//@desc    Create a Movie or Show post
//access   Private

router.post('/createPageMoviePost', auth, async (req, res) => {
    const { caption, validity, selectedPage, disableComments, imdbId } = req.body;
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
            caption,
            expiryDate,
            isMovie: true,
            disableComments,
            page: selectedPage,
            creator: req.id,
            imdbId,
            isPagePost: true,
        });
        await post.save();
        await Page.findOneAndUpdate({ _id: selectedPage }, { $push: { posts: [post._id] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (p:Post {id : "${post.id}", type : "text", expiryDate : "${expiryDate}", publishDate:"${new Date().toISOString()}" }) return p`);
            await session.run(`MATCH (pg:Post{id : "${selectedPage}"}),(p:Post {id : "${post.id}"}) CREATE (pg)-[:PAGE_HAS_POST]->(p) return pg.id`);
            await session.run(`MATCH (u:User)-[:SUBSCRIBED_TO]->(pg:Page{id: "${selectedPage}"})-[:PAGE_HAS_POST]->(p:Post{id:"${post.id}"}) MERGE (u)-[:IN_FEED]->(p) return u.id`);
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
        const checkSession = neodriver.session();
        try {
            const neo_res_check = await checkSession.run(`return EXISTS((:User{ id : "${req.id}" })-[:IN_FEED]->(:Post{id : "${postId}"}))`);
            const canView = neo_res_check.records[0]._fields[0];
            if (!canView) {
                return res.status(403).send("Cannot View the post");
            }
        } catch (e) {
            console.log(e);
            await checkSession.close()
            return res.status(500).send("Unable to get post");
        } then = async () => {
            await checkSession.close()
        }
        const post = await Post.findById(postId).populate({ path: 'creator page', 'select': 'name profilePicture username' });
        if (post) {
            const { isText, image, disableComments, caption, publishTime, likes, creator, comments, isMovie, isSong, songDetails, imdbId, isPagePost, page } = post;
            var responsePost = { isText, image, disableComments, caption, publishTime, creator, isSong, songDetails, isMovie, isPagePost, page };
            if (creator._id.toString() === req.id.toString()) {
                responsePost.isCreator = true;
            } else {
                responsePost.isCreator = false;
            }
            responsePost.comments = post.comments ? post.comments.length : 0;
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
            if (isMovie) {
                const localIMDbSearch = await LocalIMDb.findOne({ imdbId });
                if (localIMDbSearch) {
                    // console.log("Getting it locally");
                    const { Title, Year, Genre, Actors, Plot, Language, Country, Poster, imdbRating } = localIMDbSearch;
                    responsePost.movieDetails = { Title, Year, Genre, Actors, Plot, Language, Country, Poster, imdbRating };
                } else {
                    // console.log("Getting it from IMDB");
                    var imdbDetails = await axios.get(`http://www.omdbapi.com/?apikey=${config.get('omdbAPIKey')}&i=${imdbId}`);
                    // console.log(imdbDetails);
                    const { Title, Year, Genre, Actors, Plot, Language, Country, Poster, imdbRating } = imdbDetails.data;
                    responsePost.movieDetails = { Title, Year, Genre, Actors, Plot, Language, Country, Poster, imdbRating };
                    const localImdbItem = new LocalIMDb({
                        imdbId,
                        Title,
                        Year,
                        Genre,
                        Actors,
                        Plot,
                        Language,
                        Country,
                        Poster,
                        imdbRating
                    });
                    await localImdbItem.save();
                }
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
            await Post.findOneAndUpdate({ _id: postId }, { $push: { likes: [req.id] } });
            if (req.id !== post.creator.toString()) {
                const notification = new Notification({
                    trigger: 'postLike',
                    sender: req.id,
                    triggerPost: postId,
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
                    sendActionNotification(token, `${senderUser.name} has liked your post`, "", "notifications");
                });
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
            Post.findOneAndUpdate(
                { _id: postId },
                { $pullAll: { likes: [req.id] } },
                { new: true },
                function (err, data) { }
            );
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

//@route   POST /api/posts/deletePost
//@desc    Like a post
//access   Private

router.post('/deletePost', auth, async (req, res) => {
    const { postId } = req.body;
    try {
        const post = await Post.findById(postId);
        if (post && post.creator.toString() === req.id) {
            if (post.comments.length > 0) {
                post.comments.map(async (commentId) => {
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
                    const session = neodriver.session();
                    try {
                        await session.run(`Match (c:Comment {id : "${commentId}"}) DETACH DELETE c`);
                        await session.close()
                    } catch (e) {
                        console.log(e);
                        await session.close()
                    }
                    await Comment.findByIdAndDelete(commentId);
                });
            }
            const session = neodriver.session();
            await User.findOneAndUpdate(
                { _id: req.id },
                { $pullAll: { posts: [postId] } },
                { new: true },
                function (err, data) { }
            );
            try {
                await session.run(`Match (p:Post {id : "${postId}"}) DETACH DELETE p`);
                await session.close()
            } catch (e) {
                console.log(e);
                await session.close()
            }
            await Post.findByIdAndDelete(postId);
            return res.status(200).send("Deleted");
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