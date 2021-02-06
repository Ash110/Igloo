const User = require('../../models/User');
const { admin } = require('./firebaseInit');

const notification_options = {
    priority: "high",
    timeToLive: 60 * 60 * 24 * 7,
};

const sendRoomInvitationNotification = async ({ selectedUsers, roomId, roomName, sender, options = notification_options }) => {
    const sendingUser = await User.findById(sender).select('name');
    var payload = {
        notification: {
            title: `${sendingUser.name} has invited you to join a Space on Igloo`,
            body: `Click here to join the Space - ${roomName} on Igloo before it expires!`,
            "click_action": "FLUTTER_NOTIFICATION_CLICK",
        },
        data: {
            roomId : roomId.toString(),
        },
    };
    selectedUsers.map(async (user) => {
        const selectedUser = await User.findById(user).select('notificationTokens');
        admin.messaging().sendToDevice(selectedUser.notificationTokens, payload, options)
            .then(response => {
                // console.log("NotifSuccessfully sent");
            })
            .catch(error => {
                console.log(error);
            });
    });
}

module.exports = { sendRoomInvitationNotification };