const express = require('express');
const User = require('../../models/User');
const Page = require('../../models/Page');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/pages/getPages
//@desc    Get all pages of a user
//access   Private

router.post('/getPages', auth, async (req, res) => {
    const session = neodriver.session();
    try {
        const neo_res = await session.run(`MATCH (u:User {id : "${req.id}"})-[:HAS_PAGE]->(pg:Page) RETURN pg.id, pg.name, pg.description ORDER BY pg.id`);
        pages = [];
        neo_res.records.map((record) => pages.push(record._fields));
        res.status(200).send({ pages });
    } catch (e) {
        console.log(e);
        await session.close()
        return res.status(500).send("Unable to fetch pages");
    } then = async () => {
        await session.close()
    }
});

//@route   POST /api/pages/createPage
//@desc    Create a new page
//access   Private

router.post('/createPage', auth, async (req, res) => {
    const { name, description, category } = req.body;
    try {
        if (!(name.trim()) || !(description.trim()) || category === "Choose a topic") {
            return res.status(403).send("One or more fields are incomplete");
        }
        let page = new Page({
            name,
            description,
            creator: req.id,
            category,
        });
        await page.save();
        await User.findOneAndUpdate({ _id: req.id }, { $push: { pages: [page._id] } });
        const session = neodriver.session();
        try {
            await session.run(`CREATE (pg:Page {id : "${page._id}", name : "${name}", description: "${description ? description : ''}"}) RETURN pg`);
            await session.run(`MATCH (u:User {id : "${req.id}"}), (pg:Page{ id : "${page._id}"}) CREATE (u)-[:HAS_PAGE]->(pg) RETURN pg.id`);
            await session.run(`MATCH (u:User {id : "${req.id}"}), (pg:Page{ id : "${page._id}"}) CREATE (u)-[:SUBSCRIBED_TO]->(pg) RETURN pg.id`);
            res.status(200).send(page._id);
        } catch (e) {
            await session.run(`match (pg:Page) WHERE pg.id="${page._id}" detach delete pg`);
            await Page.findByIdAndDelete(page._id);
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to create page");
        } then = async () => {
            await session.close()
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal Error");
    }
});

module.exports = router;