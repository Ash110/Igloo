const path = require('path');
const multer = require('multer');
const express = require('express');
const User = require('../../models/User');
const Group = require('../../models/Group');
const auth = require('../../middleware/auth');
const neodriver = require('../../neo4jconnect');

const router = express.Router();

//@route   POST /api/files/uploadProfilePicture
//@desc    Upload a new Profile Picture
//access   Private

router.post('/uploadProfilePicture', auth, (req, res) => {
    //Set storage engine
    var imageName='';
    const storage = multer.diskStorage({
        destination: './images/profilepictures/',
        filename: (req, file, callback) => {
            imageName = req.id + path.extname(file.originalname);
            callback(null, req.id + path.extname(file.originalname));
        }
    })

    //Initialise Upload
    const upload = multer({ storage }).single('profilepicture');

    //Start the upload
    upload(req,res,async(err) => {
        if(err){
            console.log(err);
            return res.status(500).send("Server Error");
        }else{
            console.log(req.file);
            await User.findOneAndUpdate({_id : req.id, profilePicture : imageName});
            return res.status(200).send(imageName);
        }
    });
});

module.exports = router;