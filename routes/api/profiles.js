const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/profiles/getUserPosts
//@desc    Create the Text post
//access   Private

router.post('/getUserPosts', auth, async (req, res) => {
    var { userId, isUser, skip } = req.body;
    if (!userId) {
        userId = req.id;
    }
    if (!skip) {
        skip = 0;
    }
    if (isUser) {
        try {
            const session = neodriver.session();
            const neo_res = await session.run(`MATCH (:User{id:"${userId}"}) -[:HAS_POST]->(p:Post) RETURN p.id,EXISTS((:User{id:"${req.id}"})-[:LIKES]->(p:Post)) ORDER BY p.publishDate DESC SKIP ${skip} LIMIT 30`);
            posts = [];
            for (const record of neo_res.records) {
                console.log(record._fields[0]);
                try {
                    const post = await Post.findById(record._fields[0]).populate({ path: 'creator page', 'select': 'name profilePicture username' });
                    const { isText, image, disableComments, caption, publishTime, likes, creator, comments, isMovie, isSong, songDetails, imdbId, isPagePost, page, resharedPostId, isReshare, _id } = post;
                    var responsePost = { isText, image, disableComments, caption, publishTime, creator, isSong, songDetails, isMovie, isPagePost, page, resharedPostId, isReshare, _id };
                    if (creator._id.toString() === req.id.toString()) {
                        responsePost.isCreator = true;
                    } else {
                        responsePost.isCreator = false;
                    }
                    responsePost.comments = post.comments ? post.comments.length : 0;
                    responsePost.likes = likes.length;
                    responsePost.hasLiked = record._fields[1];
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
                    posts.push(responsePost);
                } catch (err) {
                    console.log(err);
                }
            }
            return res.status(200).send({ posts, skip: posts.length, end: posts.length === 0 });
        } catch (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        }
    } else {
        try {
            const session = neodriver.session();
            const b = new Date().toISOString();
            const neo_res = await session.run(`MATCH (:User{id:"${userId}"})-[:HAS_POST]->(p:Post)<-[:IN_FEED]-(:User{id:"${req.id}"}) WHERE p.expiryDate > "${b}" RETURN p.id,EXISTS((:User{id:"${req.id}"})-[:LIKES]->(p:Post)) ORDER BY p.publishDate DESC SKIP ${skip} LIMIT 30`);
            posts = [];
            for (const record of neo_res.records) {
                console.log(record._fields[0]);
                try {
                    const post = await Post.findById(record._fields[0]).populate({ path: 'creator page', 'select': 'name profilePicture username' });
                    const { isText, image, disableComments, caption, publishTime, likes, creator, comments, isMovie, isSong, songDetails, imdbId, isPagePost, page, resharedPostId, isReshare, _id } = post;
                    var responsePost = { isText, image, disableComments, caption, publishTime, creator, isSong, songDetails, isMovie, isPagePost, page, resharedPostId, isReshare, _id };
                    if (creator._id.toString() === req.id.toString()) {
                        responsePost.isCreator = true;
                    } else {
                        responsePost.isCreator = false;
                    }
                    responsePost.comments = post.comments ? post.comments.length : 0;
                    responsePost.likes = likes.length;
                    console.log(record._fields[1]);
                    responsePost.hasLiked = record._fields[1];
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
                    posts.push(responsePost);
                } catch (err) {
                    console.log(err);
                }
            }
            return res.status(200).send({ posts, skip: posts.length, end: posts.length === 0 });
        } catch (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        }
    }
});

module.exports = router;