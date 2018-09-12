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
    Regdayiso: Date,
    Regday2: String,
    Regtime: String,
    Dayenrollment: Date,
    Note: String,
    SMS: Array,
    Center: Array,
    Time_recall: Array,
    Recall: Boolean,
    Appointment_day: String,
    Appointment_dayiso: Date,
    Appointment_time: Array,
    Status_student: Array,
    ListFriend: Array,
    Manager: Array,
    Isupdate: Boolean,
    Duplicate: Array
}, { versionKey: false });

//create model based a schema
module.exports = mongoose.model('Student', student);