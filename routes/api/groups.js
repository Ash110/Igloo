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
            res.status(200).send({friends, groupMembers});
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

module.exports = router;