const User = require('../../models/User');
const config = require('config');
const OneSignal = require('onesignal-node');

// const notification_options = {
//     priority: "high",
//     timeToLive: 60 * 60 * 24 * 7,
// };

// const sendCommentMentionNotification = async ({ mentionedUsernames, commentText, sender, options = notification_options }) => {
//     const sendingUser = await User.findById(sender).select('name');
//     var payload = {
//         notification: {
//             title: `${sendingUser.name} has mentioned you in a comment`,
//             body: `${commentText}`,
//             "click_action": "FLUTTER_NOTIFICATION_CLICK",
//         },
//         data: {
//             page: "notifications",
//         },
//     };
//     mentionedUsernames.map(async (user) => {
//         const selectedUser = await User.findOne({ username: user }).select('notificationTokens');
//         if (selectedUser) {
//             admin.messaging().sendToDevice(selectedUser.notificationTokens, payload, options)
//                 .then(response => {
//                     // console.log("NotifSuccessfully sent");
//                 })
//                 .catch(error => {
//                     console.log(error);
//                 });
//         }
//     });
// }


const sendCommentMentionNotification = async ({ mentionedUsernames, commentText, sender, }) => {
    const client = new OneSignal.Client(config.get('oneSignalAppId'), config.get('oneSignalAPIKey'));
    const sendingUser = await User.findById(sender).select('name');
    let notification = {
        contents: {
            'en': `${commentText}`,
        },
        headings: {
            'en': `${sendingUser.name} has mentioned you in a comment`,
        },
        data: {
            page: "notifications",
        },
    };
    mentionedUsernames.map(async (user) => {
        const selectedUser = await User.findOne({ username: user }).select('notificationTokens');
        if (selectedUser) {
            notification.include_player_ids = selectedUser.notificationTokens;
            client.createNotification(notification)
                .then(response => { })
                .catch(e => { console.log(e); });
        }
    });
}
module.exports = { sendCommentMentionNotification };