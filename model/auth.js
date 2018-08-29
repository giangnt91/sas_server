var mongoose = require('mongoose');

//Connect db
mongoose.connect('mongodb://localhost:27017/sas');

//User
var user = new mongoose.Schema({
    Username: String,
    Fullname: String,
    Nickname: String,
    Email: String,
    Phone: String,
    Dayreg: String,
    Role: Array,
    Status_user: Array
}, { versionKey: false });

//create model based a schema
module.exports = mongoose.model('User', user);