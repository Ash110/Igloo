const axios = require('axios');
const config = require('config');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/search/searchUsers
//@desc    Search for a user
//access   Private

router.post('/searchUsers', auth, async (req, res) => {
    const { searchText } = req.body;
    try {
        const users = await User.find({ 'name': { '$regex': `^${searchText}`, '$options': 'i' }, '_id': { $ne: req.id } }, { name: 1, _id: 1, profilePicture: 1, username: 1, });
        console.log(users);
        return res.status(200).send(users);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Erro");
    }
});

//@route   POST /api/search/searchSpotify
//@desc    Search for spotify
//access   Private

let token;
let tokenLastRefresh;
const reqConfig = {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${config.get('spotifyAPIKey')}`
    }
}

router.post('/searchSpotify', auth, async (req, res) => {
    const { searchText } = req.body;
    try {
        if (!token || !tokenLastRefresh || ((Date.now() - tokenLastRefresh) / 1000) > 3500) {
            console.log("Need to get a new token");
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials')
            axios.post('https://accounts.spotify.com/api/token', params, reqConfig)
                .then((authResponse) => {
                    token = authResponse.data['access_token'];
                    console.log(token);
                    tokenLastRefresh = Date.now();
                    axios.get(`https://api.spotify.com/v1/search?q=${searchText}&type=track&limit=20`, { headers: { "Authorization": `Bearer ${token}` } })
                        .then((songsResponse) => {
                            // console.log(songsResponse.data['tracks']['items']);
                            let results = [];
                            songsResponse.data['tracks']['items'].map((item) => {
                                const song = {}
                                song.songImage = item['album']['images'][2]['url'];
                                song.previewUrl = item['preview_url'];
                                song.songName = item['name'].toString();
                                let songArtists = item['artists'].map((artist) => artist['name']);
                                song.songArtists = songArtists;
                                results.push(song);
                            });
                            // console.log(results);
                            res.status(200).send({results});
                        }).catch((err) => {
                            console.log(err);
                            res.status(500).send("Unable to fetch songs");
                        });
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send("Unable to reach spotify");
                })
        } else {
            axios.get(`https://api.spotify.com/v1/search?q=${searchText}&type=track&limit=20`, { headers: { "Authorization": `Bearer ${token}` } })
                .then((songsResponse) => {
                    // console.log(songsResponse.data['tracks']['items']);
                    let results = [];
                    songsResponse.data['tracks']['items'].map((item) => {
                        const song = {}
                        song.songImage = item['album']['images'][2]['url'];
                        song.previewUrl = item['preview_url'];
                        song.songName = item['name'].toString();
                        let songArtists = item['artists'].map((artist) => artist['name']);
                        song.songArtists = songArtists;
                        results.push(song);
                    });
                    res.status(200).send({results});
                }).catch((err) => {
                    console.log(err);
                    res.status(500).send("Unable to fetch songs");
                });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});



module.exports = router;