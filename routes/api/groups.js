const path = require('path');
const express = require('express');
const User = require('../../models/User');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/groups/getGroups
//@desc    Upload a new Profile Picture
//access   Private

router.post('/getGroups', auth, async(req, res) => {
    const session = neodriver.session();
    try {
        const neo_res = await session.run(`MATCH (u:User {id : "${req.id}"})-[:HAS_GROUP]->(g:Group) RETURN g.id, g.name`);
        groups = [];
        neo_res.records.map((record) => groups.push(record._fields));
        return res.status(200).send({groups});
    } catch (e) {
        console.log(e);
        await session.close()
        return res.status(500).send("Unable to fetch groups");
    } then = async () => {
        await session.close()
    }
});

module.exports = router;