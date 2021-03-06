const mailgun = require("mailgun-js");
var mailcomposer = require('mailcomposer');
const template = require('./templates/newLogin');
const config = require('config');

sendNewLoginMail = (name, email, ipAddress) => {
    const DOMAIN = 'igloosocial.com';
    
    const mg = mailgun({ apiKey: config.get('mailgun-api'), domain: DOMAIN });
    const mail = mailcomposer({
        from: 'Igloo <noreply@igloosocial.com>',
        to: email,
        subject: 'New Login detected - Igloo',
        html: template(name, ipAddress),
    });

    mail.build(function (mailBuildError, message) {
        var dataToSend = {
            to: email,
            message: message.toString('ascii')
        };
        
        mg.messages().sendMime(dataToSend, function (sendError, body) {
            if (sendError) {
                console.log(sendError);
                return;
            }
        });
    });
}

module.exports = sendNewLoginMail