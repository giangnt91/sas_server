var mongoose = require('mongoose');

//Connect db
mongoose.connect('mongodb://localhost:27017/sas');

//Student
var student = new mongoose.Schema({
    Id_sheet: String,
    Fullname: String,
    Email: String,
    Phone: String,
    Sex: Array,
    Address: String,
    Regday: String,
    Note: String,
    Center: String,
    Appointment_day: String,
    Appointment_time: String,
    Status_student: Array
}, { versionKey: false });

//create model based a schema
module.exports = mongoose.model('Student', student);