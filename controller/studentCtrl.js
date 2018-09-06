var dateFormat = require('dateformat');
var mongoose = require('mongoose');

//get model
var student_model = require('../model/autoSheet');

function formatDate(value) {
    _the_month = value.getMonth() + 1;
    _the_day = value.getDate();
    if (_the_day < 10) {
        _the_day = '0' + _the_day;
    }
    if (_the_month < 10) {
        _the_month = '0' + _the_month;
    }
    return _the_day + "/" + _the_month + "/" + value.getFullYear();
}

// compare day
function compareday(x) {
    var parts = x.split("/");
    return parts[2] + '' + parts[1] + '' + parts[0];
}

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
    Getfornof: function (req, res) {
        student_model.find({ 'Appointment_time.name': req.body.Time, 'Appointment_day': req.body.Day }, function (err, data) {
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
                    data.Status_student = req.body.detail.Status_student;
                    data.Center = req.body.detail.Center;
                    data.Time_recall = req.body.detail.Time_recall;
                    data.Recall = req.body.detail.Recall;
                    data.ListFriend = req.body.detail.ListFriend;
                    data.Isupdate = true;
                    data.Manager = req.body.detail.Manager;
                    data.Dayenrollment = req.body.detail.Dayenrollment;
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
                    Dayenrollment: null,
                    Note: req.body.Note,
                    Center: req.body.Center,
                    Time_recall: null,
                    Recall: false,
                    Appointment_day: req.body.Appointment_day,
                    Appointment_time: req.body.Appointment_time,
                    Status_student: req.body.Status_student,
                    ListFriend: null,
                    Manager: req.body.Manager,
                    Isupdate: false
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
    },
    Search: function (req, res) {
        var date = new Date(), y = date.getFullYear(), m = date.getMonth();
        var firstDay = formatDate(new Date(y, m, 1));
        var today = dateFormat(new Date(), "dd/mm/yyyy");
        var query;

        if (req.body.Appointment_day !== '') {
            firstDay = req.body.Appointment_day;
        }

        if (req.body.Appointment_time2 !== '') {
            today = req.body.Appointment_time2;
        }

        if (req.body.Center === null) {
            query = {
                Appointment_day: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },

                'Appointment_time.id': {
                    $gte: parseInt(req.body.Appointment_time),
                    $lte: parseInt(req.body.Appointment_time2)
                }
            };
        } else {
            query = {
                Appointment_day: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },

                'Appointment_time.id': {
                    $gte: parseInt(req.body.Appointment_time),
                    $lte: parseInt(req.body.Appointment_time2)
                },
                'Center.id': req.body.Center
            };
        }


        student_model.find(query, function (err, data) {
            if (err) {
                console.log('Search ' + err);
                response = { 'error_code': 1, 'message': 'error fetching data' };
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 0, 'students': data };
                } else {
                    response = { 'error_code': 2, 'message': 'list is empty' };
                }
                res.status(200).json(response)
            }
        })
    },
    GetdetailForChart: function (req, res) {
        var query;
        var date = new Date(), y = date.getFullYear(), m = date.getMonth();
        var firstDay = formatDate(new Date(y, m, 1));
        var today = dateFormat(new Date(), "dd/mm/yyyy");

        if (req.body.Fromday === null && req.body.Today === null) {
            query = {
                'Manager.id': req.body.Username,
                $and: [{
                    $or: [{
                        Regday: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
                        }
                    }, {
                        Dayenrollment: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
                        }
                    }]
                }]
            }
        }
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regday: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regday: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }
        if (req.body.Fromday !== null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regday: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }

        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetdetailForChart ' + err);
            } else {
                if (data.length > 0) {
                    var _in = [];
                    var _out = [];
                    var _on = data;
                    var _fri = [];

                    data.forEach(element => {
                        if (element.Dayenrollment !== null) {
                            if (compareday(element.Regday) < compareday(today)) {
                                _out.push(element);
                            }
                        }
                        if (element.Status_student[0].id === 3) {
                            _in.push(element);
                        }
                        if (element.ListFriend !== null) {
                            _fri.push(element);
                        }
                    });
                    var student = [
                        {
                            On: _on,
                            In: _in,
                            Out: _out,
                            Fri: _fri
                        }
                    ];
                    response = { 'error_code': 0, 'student': student };
                    res.status(200).json(response);
                } else if (data.length === 0) {
                    var student = [
                        {
                            On: [],
                            In: [],
                            Out: [],
                            Fri: []
                        }
                    ];
                    response = { 'error_code': 0, 'student': student };
                    res.status(200).json(response);
                }
            }
        })
    }
}