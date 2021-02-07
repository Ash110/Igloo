const User = require('../../models/User');
const { admin } = require('./firebaseInit');

const notification_options = {
    priority: "high",
    timeToLive: 60 * 60 * 24 * 7,
};

const sendCommentMentionNotification = async ({ mentionedUsernames, commentText, sender, options = notification_options }) => {
    const sendingUser = await User.findById(sender).select('name');
    var payload = {
        notification: {
            title: `${sendingUser.name} has mentioned you in a comment`,
            body: `${commentText}`,
            "click_action": "FLUTTER_NOTIFICATION_CLICK",
        },
        data: {
            page: "notifications",
        },
    };
    mentionedUsernames.map(async (user) => {
        const selectedUser = await User.findOne({ username: user }).select('notificationTokens');
        if (selectedUser) {
            admin.messaging().sendToDevice(selectedUser.notificationTokens, payload, options)
                .then(response => {
                    // console.log("NotifSuccessfully sent");
                })
                .catch(error => {
                    console.log(error);
                });
        }
    });
}

module.exports = { sendCommentMentionNotification };