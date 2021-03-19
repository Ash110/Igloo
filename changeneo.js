const config = require('config')
const mongoose = require('mongoose')
const User = require('./models/User');
const neodriver = require('./neo4jconnect');


const changeProfilePictures = async () => {
    const db = config.get('mongoURI');
    mongoose.set('useCreateIndex', true)
    await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, });
    console.log("DB connected");
    const session = neodriver.session();
    try {
        const neo_res = await session.run(`MATCH (u:User) return u.id`);
        console.log(neo_res.records);
        for (let i = 0; i < neo_res.records.length; i++) {
            const userId = neo_res.records[i]._fields[0];
            if (userId) {
                const user = await User.findById(userId).select('profilePicture headerImage');
                await session.run(`Match (u:User {id : "${userId}"}) SET u.profilePicture = "${user.profilePicture}" SET u.headerImage = "${user.headerImage}"`);
            }
        }
    } catch (e) {
        console.log(e);
        await session.close()
        return res.status(500).send("Unable to create post");
    } then = async () => {
        await session.close()
    }
}

// changeProfilePictures();

const followBothWays = async () => {

    const session = neodriver.session();
    try {
        await session.run(`Match (u1:User)-[:FOLLOWS]->(u2:User) CREATE (u2)-[:FOLLOWS]->(u1)`);
    } catch (e) {
        console.log(e);
        await session.close()
        return res.status(500).send("Unable to follow");
    } then = async () => {
        await session.close()
    }
}

// followBothWays();

const addFollowersToMongo = async () => {
    const db = config.get('mongoURI');
    console.log(db);
    mongoose.set('useCreateIndex', true)
    await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, });
    console.log("DB connected");
    const users = await User.find().select('_id name');
    console.log(users);
    for (let u of users) {
        const id = u._id;
        console.log(u.name);
        const session = neodriver.session();
        try {
            const neo_res = await session.run(`Match (u:User{id : "${id}"})-[:FOLLOWS]->(u2:User) RETURN u2.id, u2.name`);
            for (let j of neo_res.records) {
                console.log(j._fields[0]);
                await User.findOneAndUpdate({ _id: id }, { $push: { followers: [j._fields[0]] } });
                await User.findOneAndUpdate({ _id: id }, { $push: { following: [j._fields[0]] } });
            }
        } catch (e) {
            console.log(e);
            await session.close()
            return res.status(500).send("Unable to follow");
        } then = async () => {
            await session.close()
        }
    }
}

addFollowersToMongo();