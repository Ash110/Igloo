const express = require('express');
const connectToDatabase = require('./db');
const cors = require('cors');
const bodyParser = require('body-parser')
const path = require('path');
const config = require('config')

//Initialise the server
const app = express();

//Initialise Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
// app.use(function (req, res, next) { req.headers.origin = req.headers.origin || req.headers.host; next(); })

// var allowedOrigins = ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://192.168.0.103:5000',
// 'https://www.igloosocial.com','https://igloosocial.com','igloosocial.com', 'www.igloosocial.com'];

// app.use(cors({
//     origin: function (origin, callback) {
//         console.log(origin)
//         console.log(allowedOrigins.indexOf(origin))
//         if (!origin) return callback(null, true);
//         if (allowedOrigins.indexOf(origin) === -1 ) {
//             var msg = 'The CORS policy for this site does not ' +
//                 'allow access from the specified Origin.';
//             return callback(new Error(msg), false);
//         }
//         return callback(null, true);
//     },
//     credentials: true
// }));

// app.set('trust proxy', 1);

//Connect to DB
connectToDatabase();

//Setting up routes
app.use('/api/users', require('./routes/api/users'));
app.use('/api/files', require('./routes/api/files'));

//Static serving of images
app.use(express.static('client/build'));
app.use('/postimages', express.static('images/posts'));
app.use('/profilepictures', express.static('images/profilepictures'));

app.get('*', (req, res) => {
    try {
        const resolvingPath = path.resolve(
            __dirname,
            'client',
            'build',
            'index.html'
        );
        return res.sendFile(resolvingPath);
    } catch (err) {
        console.log(err)
        if (err.code === 'ENOENT') {
            const resolvingPath = path.resolve(
                __dirname,
                'client',
                'build',
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