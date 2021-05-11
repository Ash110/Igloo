const jwt = require('jsonwebtoken');
const config = require('config');

const auth = (req, res, next) => {
    //Get the token from the header
    //Check if token exists

    const token = req.header('x-admin-auth-token');
    try {
        if (token !== 'goodnewseveryone') throw "Wrong Token";
        // req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: "Token is not valid" });
    }
}


module.exports = auth;