var mongoose = require('mongoose');

//Connect db
mongoose.connect('mongodb://localhost:27017/sas');

//Student
var student = new mongoose.Schema({
    IdforFrend: String,
    Id_sheet: String,
    Fullname: String,
    Email: String,
    Phone: String,
    Sex: Array,
    Address: Array,
    Regday: String,
    Regday2: String,
    Regtime: String,
    Dayenrollment: String,
    Note: String,
    Center: Array,
    Time_recall: Array,
    Recall: Boolean,
    Appointment_day: String,
    Appointment_time: Array,
    Status_student: Array,
    ListFriend: Array,
    Manager: Array,
    Isupdate: Boolean
}, { versionKey: false });

//create model based a schema
module.exports = mongoose.model('Student', student);