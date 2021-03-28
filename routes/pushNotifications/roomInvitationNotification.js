const User = require('../../models/User');
const config = require('config');
const OneSignal = require('onesignal-node');

// const notification_options = {
//     priority: "high",
//     timeToLive: 60 * 60 * 24 * 7,
// };

// const sendRoomInvitationNotification = async ({ selectedUsers, roomId, roomName, sender, options = notification_options }) => {
//     const sendingUser = await User.findById(sender).select('name');
//     var payload = {
//         notification: {
//             title: `${sendingUser.name} has invited you to join a Space on Igloo`,
//             body: `Click here to join the Space - ${roomName} on Igloo before it expires!`,
//             "click_action": "FLUTTER_NOTIFICATION_CLICK",
//         },
//         data: {
//             roomId : roomId.toString(),
//         },
//     };
//     selectedUsers.map(async (user) => {
//         const selectedUser = await User.findById(user).select('notificationTokens');
//         admin.messaging().sendToDevice(selectedUser.notificationTokens, payload, options)
//             .then(response => {
//                 // console.log("NotifSuccessfully sent");
//             })
//             .catch(error => {
//                 console.log(error);
//             });
//     });
// }

const sendRoomInvitationNotification = async ({ selectedUsers, roomId, roomName, sender, }) => {
    const client = new OneSignal.Client(config.get('oneSignalAppId'), config.get('oneSignalAPIKey'));
    const sendingUser = await User.findById(sender).select('name');
    let notification = {
        contents: {
            'en': `Click here to join the Space - ${roomName} on Igloo before it expires!`,
        },
        headings: {
            'en': `${sendingUser.name} has invited you to join a Space on Igloo`,
        },
        data: {
            roomId: roomId.toString(),
        },
    };
    selectedUsers.map(async (user) => {
        const selectedUser = await User.findById(user).select('notificationTokens');
        if (selectedUser && selectedUser.notificationTokens && selectedUser.notificationTokens.length > 0) {
            notification.include_player_ids = selectedUser.notificationTokens;
            client.createNotification(notification)
                .then(response => { })
                .catch(e => { console.log(e); });
        }
    });
}


module.exports = { sendRoomInvitationNotification };