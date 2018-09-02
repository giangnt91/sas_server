var dateFormat = require('dateformat');
var mongoose = require('mongoose');

//get model
var student_model = require('../model/autoSheet');

// Api
module.exports = {
    //get all student
    Getall: function (req, res) {
        student_model.find({}, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data.length > 0) {
                    let _role = req.body.Role;
                    let _user = req.body.Username;
                    var _list_student = [];
                    if (_role[0].id === 0) {
                        response = { 'error_code': 0, 'student': data };
                    } else {
                        data.forEach(student => {
                            if (_user === student.Manager[0].id) {
                                _list_student.push(student);
                            }
                        });
                        response = { 'error_code': 0, 'student': _list_student };
                    }
                    res.status(200).json(response);
                }
            }
        }).sort({ _id: -1 })
    },
    UpdateById: function (req, res) {
        student_model.findById({ _id: req.body.detail._id }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data) {
                    data.Fullname = req.body.detail.Fullname;
                    data.Email = req.body.detail.Email;
                    data.Phone = req.body.detail.Phone;
                    data.Sex = req.body.detail.Sex;
                    data.Address = req.body.detail.Address;
                    data.Regday2 = req.body.detail.Regday2;
                    data.Note = req.body.detail.Note;
                    data.Appointment_day = req.body.detail.Appointment_day;
                    data.Appointment_time = req.body.detail.Appointment_time;
                    data.Appointment_1st = req.body.detail.Appointment_1st;
                    data.Appointment_not_1st = req.body.detail.Appointment_not_1st;
                    data.unregistered = req.body.detail.unregistered;
                    data.Status_student = req.body.detail.Status_student;
                    data.Center = req.body.detail.Center;
                    data.Time_recall = req.body.detail.Time_recall;
                    data.ListFriend = req.body.detail.ListFriend;
                    data.save(function (err) {
                        if (err) {
                            console.log('UpdateById ' + err)
                        } else {
                            response = { 'error_code': 0, 'message': 'update data success' };
                            res.status(200).json(response);
                        }
                    })
                }
            }
        })
    },
    CreateStudent: function (req, res) {
        student_model.find({}, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                let timereg = dateFormat(new Date(), "HH:MM:ss")
                var IdforFrend = mongoose.Types.ObjectId();
                var new_student = new student_model({
                    IdforFrend: IdforFrend,
                    Id_sheet: null,
                    Fullname: req.body.Fullname,
                    Email: req.body.Email,
                    Phone: req.body.Phone,
                    Sex: req.body.Sex,
                    Address: req.body.Address,
                    Regday: req.body.Regday,
                    Regday2: null,
                    Regtime: timereg,
                    Note: req.body.Note,
                    Center: req.body.Center,
                    Time_recall: null,
                    Appointment_day: req.body.Appointment_day,
                    Appointment_time: req.body.Appointment_time,
                    Appointment_1st: false,
                    Appointment_not_1st: false,
                    unregistered: false,
                    Status_student: req.body.Status_student,
                    ListFriend: null,
                    Manager: req.body.Manager
                });

                new_student.save(function (err) {
                    if (err) {
                        response = { 'error_code': 1, 'message': 'error fetching data' }
                    } else {
                        response = { 'error_code': 0, '_id': IdforFrend }
                    }
                    res.status(200).json(response);
                })
            }
        })
    }
}