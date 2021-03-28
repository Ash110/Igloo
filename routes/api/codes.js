const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Code = require('../../models/Code');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/codes/getAllCodes
//@desc    Get all codes
//access   Private

router.post('/getAllCodes', async (req, res) => {
    const { } = req.body;
    try {
        let codes = await Codes.find();
        return res.status(200).send(codes);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/codes/createCode
//@desc    Create a new Code
//access   Private

router.post('/createCode', async (req, res) => {
    const { reasonForCode, durationInDays, expiryDate } = req.body;
    try {
        const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var token = '';
        for (var i = 0; i < 20; i++) {
            var randomPoz = Math.floor(Math.random() * charSet.length);
            token += charSet.substring(randomPoz, randomPoz + 1);
        }
        token = token.toUpperCase();
        const code = new Code({
            token, reasonForCode, durationInDays, expiryDate
        });
        await code.save();
        return res.status(200).send();
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;

