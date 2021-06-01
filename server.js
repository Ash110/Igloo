const fs = require('fs');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require("helmet");
const xss = require('xss-clean');
const express = require('express');
const initSentry = require('./sentry');
const connectToDatabase = require('./db');
const mongoSanitize = require('express-mongo-sanitize');

//Initialise the server
const app = express();

//Initialise Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(helmet());

// Data Sanitization against NoSQL Injection Attacks
app.use(mongoSanitize());

// Data Sanitization against XSS attacks
app.use(xss());

//Setting up CORS
app.use(cors());
// const allowedOrigins = ["http://localhost:3000",];
// app.use(function (req, res, next) {
//     let origin = req.headers.origin;
//     if (allowedOrigins.includes(origin)) {
//         res.header("Access-Control-Allow-Origin", origin); // restrict it to the required domain
//     }

//     res.header(
//         "Access-Control-Allow-Headers",
//         "Origin, X-Requested-With, Content-Type, Accept"
//     );
//     next();
// });

//Morgan for logging
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'reqs.log'), { flags: 'a' })
app.use(morgan('(:remote-addr - [:date[iso]]) (":method :url HTTP/:http-version" :status) (TIME : :response-time[3] ms) (":user-agent" :req[x-auth-token])', { stream: accessLogStream }))


app.set('trust proxy', 1);

//Connect to DB
connectToDatabase();

//Setup Sentry
// initSentry();

//Setting up routes
app.use('/api/feed', require('./routes/api/feed'));
app.use('/api/users', require('./routes/api/users'));
app.use('/api/admin', require('./routes/api/admin'));
app.use('/api/codes', require('./routes/api/codes'));
app.use('/api/files', require('./routes/api/files'));
app.use('/api/pages', require('./routes/api/pages'));
app.use('/api/posts', require('./routes/api/posts'));
app.use('/api/groups', require('./routes/api/groups'));
app.use('/api/search', require('./routes/api/search'));
app.use('/api/spaces', require('./routes/api/spaces'));
app.use('/api/reports', require('./routes/api/reports'));
app.use('/api/comments', require('./routes/api/comments'));
app.use('/api/profiles', require('./routes/api/profiles'));
app.use('/api/notifications', require('./routes/api/notifications'));

//Static serving of images
app.use(express.static('client/build'));
app.use('/posts', express.static('images/posts'));
app.use('/profilepictures', express.static('images/profilepictures'));
app.use('/headerimages', express.static('images/headerimages'));

app.get('/', (req, res) => {
    try {
        
        return res.status(200).send("v1.0");
    } catch (err) {
        console.log(err)
        return res.status(500).send("Failed")
    }
});

//Port
const PORT = process.env.PORT || 5000;

//Starting server
app.listen(PORT, () => console.log(`The server is running on port ${PORT}`));