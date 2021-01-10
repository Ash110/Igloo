const path = require('path');
const axios = require('axios');
const config = require('config');
const express = require('express');
const User = require('../../models/User');
const Post = require('../../models/Post');
const Group = require('../../models/Group');
const Space = require('../../models/Space');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/spaces/getAllRooms
//@desc    Fetch all rooms
//access   Private

router.post('/getAllRooms', auth, async (req, res) => {
    try {
        const session = neodriver.session();
        let rooms = [];
        try {
            const neo_res = await session.run(`MATCH (u:User{id : "${req.id}"})-[:CAN_ENTER_ROOM]->(r:Room) return r.id`);
            neo_res.records.map((room) => rooms.push(room._fields[0]));
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to fetch rooms");
        } then = async () => {
            await session.close()
        }
        return res.status(200).send({ rooms });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/spaces/createDiscussionRoom
//@desc    Create a discussion room
//access   Private

router.post('/createDiscussionRoom', auth, async (req, res) => {
    const { name, description, selectedGroups } = req.body;
    try {
        const room = new Space({
            name,
            description,
            creator: req.id,
            roomType: 'discussion',
        });
        await room.save();
        const session = neodriver.session();
        try {
            await session.run(`CREATE (r:Room {id : "${room._id}", type : "discussion", publishDate:"${new Date().toISOString()}" }) return r`);
            await session.run(`MATCH (u:User{id : "${req.id}"}),(r:Room {id : "${room._id}"}) CREATE (u)-[:HAS_ROOM]->(r) return u.name`);
            selectedGroups.map(async (groupId) => {
                await session.run(`MATCH (g:Group{id : "${groupId}"}),(r:Room {id : "${room._id}"}) CREATE (g)-[:CONTAINS_ROOM]->(r) return g.id`);
                await session.run(`MATCH (u:User)-[:MEMBER_OF]->(g:Group{id: "${groupId}"})-[:CONTAINS_ROOM]->(r:Room{id:"${room._id}"}) MERGE (u)-[:CAN_ENTER_ROOM]->(r) return u.name`);
            });
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create room");
        } then = async () => {
            await session.close()
        }
        return res.status(200).send("Done");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/spaces/getRoomDetails
//@desc    Fetch all rooms
//access   Private

router.post('/getRoomDetails', auth, async (req, res) => {
    const { roomId } = req.body;
    try {
        const room = await Space.findById(roomId)
            .populate('creator', 'name profilePicture')
            .select('name description creator')
        if (room) {
            return res.status(200).send({ room });
        } else {
            return res.status(404).send("Room not found");
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});


module.exports = router;