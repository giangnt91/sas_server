var mongoose = require('mongoose');

//Connect db
// mongoose.createConnection('mongodb://localhost:19899/sas');
mongoose.createConnection('mongodb://sas_sa:91411902@localhost:19899/sas');

//Center
var center = new mongoose.Schema({
	SheetId: String,
    Name: String,
    Id: String,
	Info: String
}, { versionKey: false });

//create model based a schema
module.exports = mongoose.model('center', center);