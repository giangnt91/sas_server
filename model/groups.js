var mongoose = require('mongoose');

//Connect db
// mongoose.createConnection('mongodb://localhost:19899/sas');
mongoose.createConnection('mongodb://sas_sa:91411902@localhost:19899/sas');

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