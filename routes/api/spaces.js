const path = require('path');
const axios = require('axios');
const config = require('config');
const express = require('express');
const User = require('../../models/User');
const Space = require('../../models/Space');
const auth = require('../../middleware/auth');
const semiAuth = require('../../middleware/semiAuth');
const neodriver = require('../../neo4jconnect');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const {
    removeBasicRoom,
    alertBasicRoomExpiry,
    removeProRoom,
    alertProRoomExpiry,
    removeRoomRestrictions
} = require('../../agenda/agendaFunctions');
const { sendRoomInvitationNotification } = require('../pushNotifications/roomInvitationNotification');

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
    const { name, description, selectedFriends, isGlobal, isTemplate } = req.body;
    try {
        if (!name) {
            return res.status(403).send("Room must need a name");
        }
        const user = await User.findById(req.id).select('isPro canCreateSpace');
        if (user.canCreateSpace == false && !user.isPro) {
            return res.status(403).send("You can only create one free room per day. You have already used up your free room for today. Upgrade to Pro to create unlimited rooms");
        }
        let uid = 0;
        let role = RtcRole.PUBLISHER;
        let expireTime = 24 * 3600;
        const currentTime = Math.floor(Date.now() / 1000);
        const privilegeExpireTime = currentTime + expireTime;
        const token = RtcTokenBuilder.buildTokenWithUid(config.get('agoraAppID'), config.get('agoraAppCertificate'), name, uid, role, privilegeExpireTime);
        const room = new Space({
            name,
            description,
            creator: req.id,
            roomType: 'discussion',
            roomToken: token,
            isGlobal,
            isTemplate,
            members: selectedFriends,
        });
        await room.save();
        const session = neodriver.session();
        try {
            await session.run(`CREATE (r:Room {id : "${room._id}", type : "discussion", publishDate:"${new Date().toISOString()}" , isGlobal : ${isGlobal}}) return r`);
            await session.run(`MATCH (u:User{id : "${req.id}"}),(r:Room {id : "${room._id}"}) CREATE (u)-[:HAS_ROOM]->(r) return u.name`);
            await session.run(`MATCH (u:User{id : "${req.id}"}), (r:Room{id:"${room._id}"}) MERGE (u)-[:CAN_ENTER_ROOM]->(r) return u.name`);
            selectedFriends.map(async (friend) => {
                const usersession = neodriver.session();
                await usersession.run(`MATCH (u:User{id : "${friend}"}), (r:Room{id:"${room._id}"}) MERGE (u)-[:CAN_ENTER_ROOM]->(r) return u.name`);
                await usersession.close()
            });
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create room");
        } then = async () => {
            await session.close()
        }
        sendRoomInvitationNotification({
            selectedUsers: selectedFriends,
            roomId: room._id,
            roomName: name,
            sender: req.id,
        });
        try {
            await axios.post(`${config.get('chatServerUrl')}/registerNewRoom`, {
                roomId: room._id,
            });
        } catch (err) {
            console.log("Failed to reach chat server");
            console.log(err);
        }
        if (user.isPro) {
            removeProRoom(room._id);
            alertProRoomExpiry(room._id);
        } else {
            removeBasicRoom(room._id);
            alertBasicRoomExpiry(room._id);
            await User.findByIdAndUpdate(req.id, { canCreateSpace: false });
            removeRoomRestrictions(req.id);
        }
        return res.status(200).send({
            roomId: room._id,
            roomToken: token,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/spaces/getRoomDetails
//@desc    Fetch all rooms
//access   Private

router.post('/getRoomDetails', semiAuth, async (req, res) => {
    const { roomId } = req.body;
    try {
        const room = await Space.findById(roomId)
            .populate('creator', 'name profilePicture')
            .select('name description creator roomToken isGlobal')
        if (room) {
            console.log()
            const memberDetails = await axios.post(`${config.get('chatServerUrl')}/getRoomMembers`, {
                roomId,
            });
            // console.log(memberDetails.data);
            // room.memberDetails = memberDetails.data;
            return res.status(200).send({ room, memberDetails: memberDetails.data });
        } else {
            return res.status(404).send("Room not found");
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/spaces/getGlobalRooms
//@desc    Fetch all rooms
//access   Private

router.post('/getGlobalRooms', auth, async (req, res) => {
    try {
        const session = neodriver.session();
        let rooms = [];
        try {
            const neo_res = await session.run(`MATCH (r:Room) WHERE r.isGlobal=true return r.id`);
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
//@route   POST /api/spaces/checkRoomPermission
//@desc    Check if user has permission to enter room
//access   Private

router.post('/checkRoomPermission', auth, async (req, res) => {
    const { roomId } = req.body;
    let response = {
        hasPermission: false,
        isSpeaker: false,
    }
    try {
        const session = neodriver.session();
        try {
            const neo_res = await session.run(`MATCH (r:Room{id : "${roomId}"}) return r.isGlobal, EXISTS((:User{id :"${req.id}"})-[:CAN_ENTER_ROOM]->(r)), r.type`);
            response.hasPermission = (neo_res.records[0]._fields[0] || neo_res.records[0]._fields[1]);
            response.isSpeaker = neo_res.records[0]._fields[1];
            response.roomType = neo_res.records[0]._fields[2];
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to fetch rooms");
        } then = async () => {
            await session.close()
        }
        let room;
        if (response.hasPermission) {
            room = await Space.findById(roomId).select('name roomToken isGlobal');
        }
        response.room = room;
        return res.status(200).send(response);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/spaces/getUserTemplates
//@desc    Fetch all user templates
//access   Private

router.post('/getUserTemplates', auth, async (req, res) => {
    try {
        let templates = [];
        templates = await Space.find({ isTemplate: true, creator: req.id, }).select('name description _id');
        console.log(templates);
        return res.status(200).send({ templates });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/spaces/createRoomFromTemplate
//@desc    Create a room from a template
//access   Private

router.post('/createRoomFromTemplate', auth, async (req, res) => {
    const { roomId } = req.body;
    try {
        const room = await Space.findById(roomId);
        const user = await User.findById(req.id).select('isPro canCreateSpace');
        if (user.canCreateSpace == false && !user.isPro) {
            return res.status(403).send("You can only create one free room per day. You have already used up your free room for today. Upgrade to Pro to create unlimited rooms");
        }
        let uid = 0;
        let role = RtcRole.PUBLISHER;
        let expireTime = 24 * 3600;
        const currentTime = Math.floor(Date.now() / 1000);
        const privilegeExpireTime = currentTime + expireTime;
        const token = RtcTokenBuilder.buildTokenWithUid(config.get('agoraAppID'), config.get('agoraAppCertificate'), room.name, uid, role, privilegeExpireTime);
        await Space.findByIdAndUpdate(roomId, { roomToken: token });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (r:Room {id : "${room._id}", type : "discussion", publishDate:"${new Date().toISOString()}" , isGlobal : ${room.isGlobal}}) return r`);
            await session.run(`MATCH (u:User{id : "${req.id}"}),(r:Room {id : "${room._id}"}) CREATE (u)-[:HAS_ROOM]->(r) return u.name`);
            await session.run(`MATCH (u:User{id : "${req.id}"}), (r:Room{id:"${room._id}"}) MERGE (u)-[:CAN_ENTER_ROOM]->(r) return u.name`);
            room.members.map(async (friend) => {
                const usersession = neodriver.session();
                await usersession.run(`MATCH (u:User{id : "${friend}"}), (r:Room{id:"${room._id}"}) MERGE (u)-[:CAN_ENTER_ROOM]->(r) return u.name`);
                await usersession.close()
            });
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create room");
        } then = async () => {
            await session.close()
        }
        try {
            await axios.post(`${config.get('chatServerUrl')}/registerNewRoom`, {
                roomId: room._id,
            });
        } catch (err) {
            console.log("Failed to reach chat server");
            console.log(err);
        }
        if (user.isPro) {
            removeProRoom(room._id);
            alertProRoomExpiry(room._id);
        } else {
            removeBasicRoom(room._id);
            alertBasicRoomExpiry(room._id);
            await User.findByIdAndUpdate(req.id, { canCreateSpace: false });
            removeRoomRestrictions(req.id);
        }
        sendRoomInvitationNotification({
            selectedUsers: room.members,
            roomId: room._id,
            roomName: room.name,
            sender: req.id,
        });
        return res.status(200).send({
            roomId: room._id,
            roomToken: token,
            name: room.name,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   POST /api/spaces/createWatchTogetherRoom
//@desc    Create a Watch Together room
//access   Private

router.post('/createWatchTogetherRoom', auth, async (req, res) => {
    const { name, description, selectedFriends, } = req.body;
    try {
        if (!name) {
            return res.status(403).send("Room must need a name");
        }
        const user = await User.findById(req.id).select('isPro');
        if (!user.isPro) {
            return res.status(403).send("Only Pro members can create Watch Together spaces. Upgrade today to create a watch together space");
        }
        let uid = 0;
        let role = RtcRole.PUBLISHER;
        let expireTime = 24 * 3600;
        const currentTime = Math.floor(Date.now() / 1000);
        const privilegeExpireTime = currentTime + expireTime;
        const token = RtcTokenBuilder.buildTokenWithUid(config.get('agoraAppID'), config.get('agoraAppCertificate'), name, uid, role, privilegeExpireTime);
        const room = new Space({
            name,
            description,
            creator: req.id,
            roomType: 'watchTogether',
            roomToken: token,
            members: selectedFriends,
        });
        await room.save();
        const session = neodriver.session();
        try {
            await session.run(`CREATE (r:Room {id : "${room._id}", type : "watchTogether", publishDate:"${new Date().toISOString()}" , isGlobal : ${false}}) return r`);
            await session.run(`MATCH (u:User{id : "${req.id}"}),(r:Room {id : "${room._id}"}) CREATE (u)-[:HAS_ROOM]->(r) return u.name`);
            await session.run(`MATCH (u:User{id : "${req.id}"}), (r:Room{id:"${room._id}"}) MERGE (u)-[:CAN_ENTER_ROOM]->(r) return u.name`);
            selectedFriends.map(async (friend) => {
                const usersession = neodriver.session();
                await usersession.run(`MATCH (u:User{id : "${friend}"}), (r:Room{id:"${room._id}"}) MERGE (u)-[:CAN_ENTER_ROOM]->(r) return u.name`);
                await usersession.close()
            });
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create room");
        } then = async () => {
            await session.close()
        }
        sendRoomInvitationNotification({
            selectedUsers: selectedFriends,
            roomId: room._id,
            roomName: name,
            sender: req.id,
        });
        try {
            await axios.post(`${config.get('chatServerUrl')}/registerNewRoom`, {
                roomId: room._id,
            });
        } catch (err) {
            console.log("Failed to reach chat server");
            console.log(err);
        }
        removeProRoom(room._id);
        alertProRoomExpiry(room._id);
        return res.status(200).send({
            roomId: room._id,
            roomToken: token,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;