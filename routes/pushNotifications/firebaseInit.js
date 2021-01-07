
var admin = require("firebase-admin");

var serviceAccount = require("../../config/igloosocial-firebase-adminsdk-b0e4c-555a9eaf53.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports.admin = admin;