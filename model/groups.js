var mongoose = require('mongoose');

//Connect db
mongoose.createConnection('mongodb://localhost:27017/sas');

//Groups
var group = new mongoose.Schema({
    Name: String,
    Leader: Array,
    Sheet: Array,
    Gtype: Array,
    Tele: Array,
    Total: Number
}, { versionKey: false });

//create model based a schema
module.exports = mongoose.model('Groups', group);