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
    let { userId } = req.body;
    if (!userId) userId = req.id;
    const session = neodriver.session();
    try {
        const neo_res = await session.run(`MATCH (u:User {id : "${userId}"})-[:HAS_PAGE]->(pg:Page) RETURN pg.id, pg.name, pg.description ORDER BY pg.id`);
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
        const user = await User.findById(req.id).select('pages isPro');
        if (!user.isPro && user.pages.length >= 1) {
            return res.status(403).send("You can only create 1 page under the Free Plan. Upgrade to Pro to create unlimited Pages!",);
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

//@route   /api/pages/getPageDetails
//@desc    Get page details
//access   Private

router.post('/getPageDetails', auth, async (req, res) => {
    const { pageId } = req.body;
    try {
        const page = await Page.findById(pageId).populate('creator', 'name username');
        const { name, description, category, creator } = page;
        var pageDetails = { name, description, category, creator };
        const session = neodriver.session();
        try {
            const neo_res = await session.run(`MATCH (u),(pg) WHERE u.id = "${req.id}" AND pg.id = "${pageId}" RETURN EXISTS((u)-[:SUBSCRIBED_TO]->(pg))`);
            pageDetails.isSubscribed = neo_res.records[0]._fields[0];
            const neo_res_posts = await session.run(`MATCH (pg:Page{id:"${pageId}"})-[php:PAGE_HAS_POST]->(p:Post) RETURN p.id`);
            posts = [];
            neo_res_posts.records.map((record) => posts.push(record._fields[0]));
            pageDetails.posts = posts;
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to fetch page details' }]
            });
        } then = async () => {
            await session.close()
        }
        res.status(200).send({ pageDetails });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/pages/unsubscribePage
//@desc    Unsubscribe user from page
//access   Private

router.post('/unsubscribePage', auth, async (req, res) => {
    const { pageId } = req.body;
    try {
        const session = neodriver.session();
        try {
            await session.run(`MATCH (u{id : "${req.id}"})-[if:IN_FEED]->(p:Post)<-[:PAGE_HAS_POST]-(pg{id: "${pageId}"}) DELETE if`);
            await session.run(`MATCH (u{id : "${req.id}"})-[st:SUBSCRIBED_TO]->(pg{id: "${pageId}"}) DELETE st`);
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to unsubscribe from page' }]
            });
        } then = async () => {
            await session.close()
        }
        Page.findOneAndUpdate(
            { _id: pageId },
            { $pullAll: { subscribers: [req.id] } },
            { new: true },
            function (err, data) { }
        );
        res.status(200).send("Done");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/pages/subscribePage
//@desc    Subscribe user to page
//access   Private

router.post('/subscribePage', auth, async (req, res) => {
    const { pageId } = req.body;
    try {
        const session = neodriver.session();
        try {
            await session.run(`MATCH (u:User {id : "${req.id}"}), (pg:Page{ id : "${pageId}"}) CREATE (u)-[:SUBSCRIBED_TO]->(pg) RETURN pg.id`);
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to subscribe to page' }]
            });
        } then = async () => {
            await session.close()
        }
        await Page.findOneAndUpdate({ _id: pageId }, { $push: { subscribers: [req.id] } });
        res.status(200).send("Done");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/pages/getPageSettings
//@desc    Get page settings
//access   Private

router.post('/getPageSettings', auth, async (req, res) => {
    const { pageId } = req.body;
    try {
        const page = await Page.findById(pageId);
        const { name, description, category, creator } = page;
        var pageDetails = { name, description, category, creator, numberOfSubscribers: page.subscribers.length };
        const session = neodriver.session();
        try {
            const neo_res = await session.run(`MATCH (u:User)-[st:SUBSCRIBED_TO]->(pg:Page) WHERE pg.id = "${pageId}" RETURN u.id,u.name, u.username, u.profilePicture LIMIT 30`);
            subscribers = [];
            neo_res.records.map((record) => subscribers.push(record._fields));
            pageDetails.subscribers = subscribers;
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to fetch page details' }]
            });
        } then = async () => {
            await session.close()
        }
        res.status(200).send({ pageDetails });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});

//@route   /api/pages/savePageSettings
//@desc    Save page settings
//access   Private

router.post('/savePageSettings', auth, async (req, res) => {
    const { pageId, pageName, pageDescription } = req.body;
    try {
        await Page.findByIdAndUpdate(pageId, { name: pageName, description: pageDescription });
        const session = neodriver.session();
        try {
            await session.run(`MATCH (pg:Page {id : "${pageId}"}) SET pg.name ="${pageName}", pg.description = "${pageDescription}" RETURN pg.id`);
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).json({
                errors: [{ msg: 'Unable to update page details' }]
            });
        } then = async () => {
            await session.close()
        }
        res.status(200).send();
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server Error");
    }
});


module.exports = router;