const { admin } = require('./firebaseInit')

const notification_options = {
    priority: "high",
    timeToLive: 60 * 60 * 24 * 7,
};

const sendActionNotification = (registrationToken, title, body, page, options = notification_options) => {
    var payload = {
        notification: {
            title,
            body,
            "click_action": "FLUTTER_NOTIFICATION_CLICK",
        },
        data: {
            page,
        },
    };
    admin.messaging().sendToDevice(registrationToken, payload, options)
        .then(response => {
            // console.log("NotifSuccessfully sent");
        })
        .catch(error => {
            console.log(error);
        });
}

module.exports = { sendActionNotification };