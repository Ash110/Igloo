const mailgun = require("mailgun-js");
var mailcomposer = require('mailcomposer');
const template = require('./templates/resetPassword');
const config = require('config');

resetPasswordMail = (name, email, code) => {
    const DOMAIN = 'igloosocial.com';

    const mg = mailgun({ apiKey: config.get('mailgun-api'), domain: DOMAIN });
    const mail = mailcomposer({
        from: 'Igloo <noreply@igloosocial.com>',
        to: email,
        subject: 'Password Reset Instructions',
        html: template(name, code),
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

module.exports = resetPasswordMail