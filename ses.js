// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Set the region 

// Create sendEmail params 
var params = {
    Destination: { /* required */
        CcAddresses: [
            
            /* more items */
        ],
        ToAddresses: [
            'ashwin.alaparthi@gmail.com',
            /* more items */
        ]
    },
    Message: { /* required */
        Body: { /* required */
            Html: {
                Charset: "UTF-8",
                Data: 
            },
        },
        Subject: {
            Charset: 'UTF-8',
            Data: 'Test email'
        }
    },
    Source: 'SENDER_EMAIL_ADDRESS', /* required */
    ReplyToAddresses: [
        'EMAIL_ADDRESS',
        /* more items */
    ],
};

// Create the promise and SES service object
var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

// Handle promise's fulfilled/rejected states
sendPromise.then(
    function (data) {
        console.log(data.MessageId);
    }).catch(
        function (err) {
            console.error(err, err.stack);
        });
