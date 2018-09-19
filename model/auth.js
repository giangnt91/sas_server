var mongoose = require('mongoose');

//Connect db
// mongoose.createConnection('mongodb://localhost:19899/sas');
mongoose.createConnection('mongodb://sas_sa:91411902@localhost:19899/sas');

//User
var user = new mongoose.Schema({
    Username: String,
    Password: String,
    Fullname: String,
    Email: String,
    Phone: String,
    Dayreg: String,
    Birthday: String,
    Student_in_month: Array,
    Role: Array,
    Leader: Boolean,
    SheetID: Array,
    GroupSheet: Array,
    Zone: Array,
    Status_user: Array,
    TimeForAdmin: Array
}, { versionKey: false });

//create model based a schema
module.exports = mongoose.model('Users', user);