const isProduction = process.env.NODE_ENV === 'production';

let config = {
    "mongoURI":process.env.MONGO_URI,
    "mongoAgendaURI":process.env.MONGO_AGENDA_URI,
    "neo4juri":process.env.NEO4J_URI,
    "neo4juser":process.env.NEO4J_USER,
    "neo4jpassword":process.env.NEO4J_PASSWORD,
    "jwtSecret":process.env.JWT_SECRET,
    "mailgun-api":process.env.MAILGUN_API,
    "omdbAPIKey":process.env.OMDB_API,
    "agoraAppID":process.env.AGORA_APP_ID,
    "agoraAppCertificate":process.env.AGORA_APP_CERTIFICATE,
    "chatServerUrl":process.env.CHAT_SERVER_URL,
}

if (!isProduction) {
    const devConfig = require('./devConfig.json');
    for (let key in config)
        config[key] = devConfig[key];
}

module.exports = config;