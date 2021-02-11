const axios = require('axios');
const config = require('config');
const { agenda } = require('./agenda');
const User = require('../models/User');
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
            isPro: false,
        });
    } catch (err) {
        console.log("Failed to reach chat server");
        console.log(err);
    }
});

agenda.define('remove reset code', async job => {
    const { username } = job.attrs.data;
    console.log(`${roomId} being alerted`);
    try {
        await User.findOneAndUpdate({ username }, { resetcode: null });
    } catch (err) {
        console.log("Failed to reach chat server");
        console.log(err);
    }
});

agenda.define('remove room restriction', async job => {
    const { userId } = job.attrs.data;
    try {
        await User.findByIdAndUpdate(userId, { canCreateSpace: true });
    } catch (err) {
        console.log(err);
    }
});

agenda.define('remove pro room', async job => {
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

agenda.define('alert pro room expiry', async job => {
    const { roomId } = job.attrs.data;
    console.log(`${roomId} being alerted`);
    try {
        await axios.post(`${config.get('chatServerUrl')}/alertRoomExpiry`, {
            roomId: roomId,
            isPro: true,
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

const removeProRoom = async (roomId) => {
    await agenda.start();
    await agenda.schedule('in 2 hours', 'remove pro room', { roomId });
}

const alertProRoomExpiry = async (roomId) => {
    await agenda.start();
    await agenda.schedule('in 105 minutes', 'alert pro room expiry', { roomId });
}

const removeResetCode = async (username) => {
    await agenda.start();
    await agenda.schedule('in 30 minutes', 'remove reset code', { username });
}

const removeRoomRestrictions = async (userId) => {
    await agenda.start();
    await agenda.schedule('at 12am', 'remove room restriction', { userId });
}

module.exports = {
    removeBasicRoom, alertBasicRoomExpiry, removeResetCode, removeProRoom, alertProRoomExpiry, removeRoomRestrictions
};