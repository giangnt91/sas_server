var mongoose = require('mongoose');

//Connect db
mongoose.createConnection('mongodb://localhost:27017/sas');

//Sms
var sms = new mongoose.Schema({
    Title: String,
    SMS: String
}, { versionKey: false });

//create model based a schema
module.exports = mongoose.model('sms', sms);