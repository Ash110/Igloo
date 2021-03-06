const cors = require('cors');
const path = require('path');
const config = require('config');
const express = require('express');
const bodyParser = require('body-parser')
const connectToDatabase = require('./db');
const agenda = require('./agenda/agenda');
const helmet = require("helmet");
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

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

// app.set('trust proxy', 1);

//Connect to DB
connectToDatabase();

//Setting up routes
app.use('/api/feed', require('./routes/api/feed'));
app.use('/api/users', require('./routes/api/users'));
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

app.get('*', (req, res) => {
    try {
        const resolvingPath = path.resolve(
            __dirname,
            'client',
            // 'build',
            'index.html'
        );
        return res.sendFile(resolvingPath);
    } catch (err) {
        console.log(err)
        if (err.code === 'ENOENT') {
            const resolvingPath = path.resolve(
                __dirname,
                'client',
                // 'build',
                'errorPage.html'
            );
            return res.sendFile(resolvingPath);
        } else {
            throw err;
        }

    }
});

//Port
const PORT = process.env.PORT || 5000;

//Starting server
app.listen(PORT, () => console.log(`The server is running on port ${PORT}`));