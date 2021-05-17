const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');
const axios = require('axios');
const config = require('config');

const router = express.Router();

//@route   POST /api/feed/getFeed
//@desc    Get user's feed
//access   Private

router.post('/getFeed', auth, async (req, res) => {
    let { skip } = req.body;
    if (!skip) {
        skip = 0;
    }
    try {
        const session = neodriver.session();
        const b = new Date().toISOString();
        console.log(`MATCH (:User{id:"${req.id}"})-[:IN_FEED]->(p:Post) WHERE p.expiryDate > "${b}" RETURN p.id,EXISTS((:User{id:"${req.id}"})-[:LIKES]->(p:Post)) ORDER BY p.publishDate DESC SKIP ${skip} LIMIT 30`);
        const neo_res = await session.run(`MATCH (:User{id:"${req.id}"})-[:IN_FEED]->(p:Post) WHERE p.expiryDate > "${b}" RETURN p.id,EXISTS((:User{id:"${req.id}"})-[:LIKES]->(p:Post)) ORDER BY p.publishDate DESC SKIP ${skip} LIMIT 30`);
        let ids = [];
        let likesMap = {};
        for (const record of neo_res.records) {
            ids.push(record._fields[0]);
            likesMap[record._fields[0]] = record._fields[1];
        }
        const records = await Post.find({ '_id': { $in: ids } }).populate({ path: 'creator page', 'select': 'name profilePicture username' });
        let posts = [];
        for (let i = 0; i < records.length; i++) {
            try {
                const { isText, image, disableComments, caption, publishTime, comments, likes, creator, isMovie, isSong, songDetails, imdbId, isPagePost, page, resharedPostId, isReshare, _id } = records[i];
                var responsePost = { isText, image, disableComments, caption, publishTime, creator, isSong, songDetails, isMovie, isPagePost, page, resharedPostId, isReshare, _id };
                if (creator._id.toString() === req.id.toString()) {
                    responsePost.isCreator = true;
                } else {
                    responsePost.isCreator = false;
                }
                responsePost.comments = comments ? comments.length : 0;
                responsePost.likes = likes.length;
                responsePost.hasLiked = likesMap[records[i]._id];
                // console.log(`${ids[i]} is ${responsePost.hasLiked}`);
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
                posts.unshift(responsePost);
                // console.log(responsePost._id, responsePost.hasLiked);
            } catch (err) {
                console.log(err);
            }
        }
        const user = await User.findById(req.id).select('newNotifications numberOfNewNotifications');
        return res.status(200).send({ feed: posts, newNotifications: user.newNotifications, numberOfNewNotifications: user.numberOfNewNotifications, skip: posts.length, end: posts.length === 0 });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;

