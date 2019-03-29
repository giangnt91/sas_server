var mongoose = require('mongoose');

//Connect db
// mongoose.createConnection('mongodb://localhost:19899/sas');
mongoose.createConnection('mongodb://sas_sa:91411902@localhost:19899/sas');

//Sms
var sms = new mongoose.Schema({
    Title: String,
    SMS: String
}, { versionKey: false });

//create model based a schema
module.exports = mongoose.model('sms', sms);