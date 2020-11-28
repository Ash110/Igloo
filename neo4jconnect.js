const neo4j = require('neo4j-driver')
const config = require('config');
const neo4juri = config.get('neo4juri');
const neo4juser = config.get('neo4juser');
const neo4jpassword = config.get('neo4jpassword');

const driver = neo4j.driver(neo4juri, neo4j.auth.basic(neo4juser, neo4jpassword));

module.exports = driver;