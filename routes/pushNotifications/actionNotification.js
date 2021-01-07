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

sendActionNotification(
    "dR8afX2ZSambtPGZ_X31m_:APA91bE4CS1_gNXG7zVcRBodIRixgiBVrJd-HBuVLLE61BPXTo3lmw0Tk4nMMqhuPOk70B6EzFOOTP2H7hmFsfDSCKf3U-LlvIM364-LE5PkFbjmi57T-n9Z5nHNt1Umlpqrh393yvwa",
    "Testing nodejs",
    "Hope this works",
    "notifications"
    )

module.exports = { sendActionNotification };