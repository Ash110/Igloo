const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/groups/getGroups
//@desc    Get all groups of a user
//access   Private

router.post('/getGroups', auth, async (req, res) => {
    const session = neodriver.session();
    try {
        const neo_res = await session.run(`MATCH (u:User {id : "${req.id}"})-[:HAS_GROUP]->(g:Group) RETURN g.id, g.name, g.description ORDER BY g.id`);
        groups = [];
        neo_res.records.map((record) => groups.push(record._fields));
        res.status(200).send({ groups });
    } catch (e) {
        console.log(e);
        await session.close()
        return res.status(500).send("Unable to fetch groups");
    } then = async () => {
        await session.close()
    }
});

//@route   POST /api/groups/createGroup
//@desc    Create a new group
//access   Private

router.post('/createGroup', auth, async (req, res) => {
    const { groupName, groupDescription } = req.body;
    try {
        let group = new Group({
            name: groupName,
            description: groupDescription ? groupDescription : "",
            creator: req.id,
        });
        await group.save();
        await User.findOneAndUpdate({ _id: req.id }, { $push: { groups: [group._id] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (g:Group {id : "${group._id}", name : "${group.name}", description: "${groupDescription ? groupDescription : ''}"}) RETURN g`);
            await session.run(`MATCH (u:User {id : "${req.id}"}), (g:Group{ id : "${group._id}"}) CREATE (u)-[:HAS_GROUP]->(g) RETURN g.id`);
            await session.run(`MATCH (u:User {id : "${req.id}"}), (g:Group{ id : "${group._id}"}) CREATE (u)-[:MEMBER_OF]->(g) RETURN g.id`);
            res.status(200).send(group._id);
        } catch (e) {
            await session.run(`match (g:Group) WHERE g.id="${group._id}" detach delete g`);
            await Group.findByIdAndDelete(group._id);
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create group");
        } then = async () => {
            await session.close()
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal Error");
    }
});

//@route   POST /api/groups/getGroupMembers
//@desc    Get friends of user and members of a group
//access   Private

router.post('/getGroupMembers', auth, async (req, res) => {
    const { groupID } = req.body;
    try {
        var friends = [];
        var groupMembers = [];
        const session = neodriver.session();
        try {
            var neo_res = await session.run(`MATCH (u1:User {id : "${req.id}"})-[:FOLLOWS]-(u2:User) RETURN u2.id, u2.name, u2.profilePicture`);
            neo_res.records.map((friend) => friends.push(friend._fields));
            neo_res = await session.run(`MATCH (u:User)-[:MEMBER_OF]-(g:Group{id : "${groupID}"}) RETURN u.id, u.name, u.profilePicture`);
            neo_res.records.map((member) => groupMembers.push(member._fields[0]));
            res.status(200).send({ friends, groupMembers });
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to fetch members");
        } then = async () => {
            await session.close()
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal Error");
    }
});

//@route   POST /api/groups/updateGroup
//@desc    Get friends of user and members of a group
//access   Private

router.post('/updateGroup', auth, async (req, res) => {
    const { groupId, groupMembers, nameHasChanged, descHasChanged, groupName, groupDesc } = req.body;
    try {
        console.log(nameHasChanged, descHasChanged);
        const session = neodriver.session();
        try {
            if (nameHasChanged) {
                await Group.findOneAndUpdate({ _id: groupId }, { name: groupName });
                await session.run(`MATCH (g:Group {id : "${groupId}"}) SET g.name = "${groupName}"`);
            }
            if (descHasChanged) {
                await Group.findOneAndUpdate({ _id: groupId }, { description: groupDesc });
                await session.run(`MATCH (g:Group {id : "${groupId}"}) SET g.description = "${groupDesc}"`);
            }
            var existingMembers = []
            neo_res = await session.run(`MATCH (u:User)-[:MEMBER_OF]-(g:Group{id : "${groupId}"}) RETURN u.id, u.name, u.profilePicture`);
            neo_res.records.map((member) => existingMembers.push(member._fields[0]));
            var membersToRemove = existingMembers.filter((member) => !groupMembers.includes(member));
            membersToRemove.map(async (member) => {
                await session.run(`MATCH (u:User{id : "${member}"})-[mo:MEMBER_OF]-(g:Group{id : "${groupId}"}) DELETE mo`);
                await session.run(`MATCH (u:User{id : "${member}"})-[if:IN_FEED]-(p:Post)-[c:CONTAINS]-(g:Group{id : "${groupId}"}) DELETE if`);
            });
            var membersToAdd = groupMembers.filter((member) => !existingMembers.includes(member));
            membersToAdd.push(req.id);
            console.log(membersToAdd);
            membersToAdd.map(async (member) => {
                await session.run(`MATCH (u:User{id : "${member}"}), (g:Group{id : "${groupId}"}) MERGE(u)-[:MEMBER_OF]->(g)`);
                await session.run(`MATCH (u:User{id : "${member}"}),(p:Post)-[c:CONTAINS]-(g:Group{id : "${groupId}"}) MERGE (u)-[:IN_FEED]->(p)`);
            });
            res.status(200).send("Done");
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to update members");
        } then = async () => {
            await session.close()
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal Error");
    }
});

module.exports = router;