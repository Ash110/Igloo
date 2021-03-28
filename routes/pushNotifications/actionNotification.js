
const config = require('config');
const OneSignal = require('onesignal-node');

const sendActionNotification = (registrationTokens, title, body, page,) => {
    if (registrationTokens && registrationTokens.length == 0) {
        return;
    } else {
        const client = new OneSignal.Client(config.get('oneSignalAppId'), config.get('oneSignalAPIKey'));
        let notification = {
            contents: {
                'en': `${body}`,
            },
            headings: {
                'en': `${title}`,
            },
            include_player_ids: registrationTokens,
            data: {
                page,
            },
        };
        client.createNotification(notification)
            .then(response => { })
            .catch(e => { console.log(e); });
    }
}

const userPageNotification = (registrationTokens, title, body, page, userId,) => {
    if (registrationTokens && registrationTokens.length == 0) {
        return;
    } else {
        const client = new OneSignal.Client(config.get('oneSignalAppId'), config.get('oneSignalAPIKey'));
        let notification = {
            contents: {
                'en': `${body}`,
            },
            headings: {
                'en': `${title}`,
            },
            include_player_ids: registrationTokens,
            data: {
                page,
                userId,
            },
        };
        client.createNotification(notification)
            .then(response => { })
            .catch(e => { console.log(e); });
    }
}

module.exports = { sendActionNotification, userPageNotification };