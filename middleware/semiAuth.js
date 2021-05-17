const jwt = require('jsonwebtoken');
const config = require('config');

const semiAuth = (req, res, next) => {
    //Get the token from the header
    //Check if token exists

    const token = req.header('x-auth-token');
    if (token) {
        try {
            const decoded = jwt.verify(token, config.get('jwtSecret'));
            req.id = decoded.id.slice(0, decoded.id.length / 2);
            // req.user = decoded.user;
            next();
        } catch (err) {
            res.status(401).json({ msg: "Token is not valid" });
        }
    } else {
        req.id = null;
        next();
    }
}



module.exports = semiAuth;