const mailgun = require("mailgun-js");
var mailcomposer = require('mailcomposer');
const template = require('./templates/welcome');
const config = require('config');

sendWelcomeEmail = (name, email) => {
    const DOMAIN = 'igloosocial.com';
    
    const mg = mailgun({ apiKey: config.get('mailgun-api'), domain: DOMAIN });
    const mail = mailcomposer({
        from: 'Igloo <noreply@igloosocial.com>',
        to: email,
        subject: 'Welcome to Igloo!',
        html: template(name),
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

sendWelcomeEmail("Ashwin", "ashwin.alaparthi@gmail.com")

module.exports = sendWelcomeEmail