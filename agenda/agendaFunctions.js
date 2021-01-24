const axios = require('axios');
const config = require('config');
const { agenda } = require('./agenda');
const neodriver = require('../neo4jconnect');


agenda.define('remove basic room', async job => {
    const { roomId } = job.attrs.data;
    const session = neodriver.session();
    console.log(`${roomId} being deleted`);
    try {
        await session.run(`MATCH (r:Room {id : "${roomId}"}) DETACH DELETE r`);
    } catch (e) {
        console.log(e);
        await session.close()
    } then = async () => {
        await session.close()
    }
    try {
        await axios.post(`${config.get('chatServerUrl')}/closeRoom`, {
            roomId: roomId,
        });
    } catch (err) {
        console.log("Failed to reach chat server");
        console.log(err);
    }
});

agenda.define('alert basic room expiry', async job => {
    const { roomId } = job.attrs.data;
    console.log(`${roomId} being alerted`);
    try {
        await axios.post(`${config.get('chatServerUrl')}/alertRoomExpiry`, {
            roomId: roomId,
        });
    } catch (err) {
        console.log("Failed to reach chat server");
        console.log(err);
    }
});

const removeBasicRoom = async (roomId) => {
    await agenda.start();
    await agenda.schedule('in 15 minutes', 'remove basic room', { roomId });
}

const alertBasicRoomExpiry = async (roomId) => {
    await agenda.start();
    await agenda.schedule('in 14 minutes', 'alert basic room expiry', { roomId });
}

module.exports = { removeBasicRoom, alertBasicRoomExpiry };