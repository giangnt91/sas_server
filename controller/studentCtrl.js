var dateFormat = require('dateformat');
var mongoose = require('mongoose');
var moment = require('moment');

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
    return value.getFullYear() + "-" + _the_month + "-" + _the_day;
    // return _the_day + "/" + _the_month + "/" + value.getFullYear();
}

// compare day
function compareday(x) {
    var parts = x.split("/");
    return parts[2] + '' + parts[1] + '' + parts[0];
}

function getFirstDateOfMonth() {
    var date = new Date(), y = date.getFullYear(), m = date.getMonth();
    var firstDay = new Date(y, m, 1);

    firstDay = moment(firstDay).format('YYYY-MM-DD');
    return firstDay
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
                    date = new Date();
                    year = date.getFullYear();
                    month = date.getMonth() + 1;
                    dt = date.getDate();

                    if (dt < 10) {
                        dt = '0' + dt;
                    }
                    if (month < 10) {
                        month = '0' + month;
                    }
                    isoday = year + '-' + month + '-' + dt;
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
                    data.Dayenrollment = isoday;
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
                date = new Date();
                year = date.getFullYear();
                month = date.getMonth() + 1;
                dt = date.getDate();

                if (dt < 10) {
                    dt = '0' + dt;
                }
                if (month < 10) {
                    month = '0' + month;
                }
                isoday = year + '-' + month + '-' + dt;
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
                    Regdayiso: isoday,
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
                    Isupdate: false,
                    Duplicate: null
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
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");

        if (req.body.Fromday === null && req.body.Today === null) {
            query = {
                'Manager.id': req.body.Username,
                $and: [{
                    $or: [{
                        Regdayiso: {
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
                'Manager.id': req.body.Username,
                $and: [{
                    $or: [{
                        Regdayiso: {
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
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                'Manager.id': req.body.Username,
                $and: [{
                    $or: [{
                        Regdayiso: {
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
        if (req.body.Fromday !== null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                'Manager.id': req.body.Username,
                $and: [{
                    $or: [{
                        Regdayiso: {
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
    },
    GetdetailNotcall: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");

        if (req.body.Fromday === null && req.body.Today === null) {
            query = {
                'Manager.id': req.body.Username,
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                Isupdate: false
            }
        }
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                Isupdate: false
            }
        }
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                Isupdate: false
            }
        }
        if (req.body.Fromday !== null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                Isupdate: false
            }
        }

        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetdetailNotcall ' + err);
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 0, 'notcall': data };
                    res.status(200).json(response);
                } else {
                    var notcall = [];
                    response = { 'error_code': 0, 'notcall': notcall };
                    res.status(200).json(response);
                }
            }
        })
    },
    GetdetailRecall: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");

        if (req.body.Fromday === null && req.body.Today === null) {
            query = {
                'Manager.id': req.body.Username,
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                Recall: true
            }
        }
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                Recall: true
            }
        }
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                Recall: true
            }
        }
        if (req.body.Fromday !== null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                Recall: true
            }
        }

        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetdetailRecall ' + err);
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 0, 'recall': data };
                    res.status(200).json(response);
                } else {
                    var recall = [];
                    response = { 'error_code': 0, 'recall': recall };
                    res.status(200).json(response);
                }
            }
        })
    },
    Gettl: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");

        if (req.body.Fromday === null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
                },
                'Manager.id': req.body.Username
            }
        }
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }
        if (req.body.Fromday !== null && req.body.Today !== null) {
            today = req.body.Today;
            firstDay = req.body.Fromday;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('Gettl ' + err);
            } else {
                if (data.length > 0) {

                    var on = data;
                    var app = [];
                    var notapp = [];
                    var notreg = [];
                    data.forEach(element => {
                        if (element.Appointment_day !== null || element.Appointment_time !== null) {
                            if (element.Appointment_time[0].id !== null) {
                                app.push(element);
                            }
                        }
                        if (element.Appointment_day !== null) {
                            if (compareday(today) - compareday(element.Appointment_day) > 0) {
                                if (element.Status_student[0].id !== 3 && element.Status_student[0].id !== 4) {
                                    notapp.push(element);
                                }
                            }
                        }

                        if (element.Status_student[0].id === 2) {
                            notreg.push(element);
                        }
                    });
                    var tl = [
                        {
                            Fullname: data[0].Manager[0].id,
                            On: on,
                            App: app,
                            Notapp: notapp,
                            Notreg: notreg
                        }
                    ]
                    response = { 'error_code': 0, 'tl': tl };
                    res.status(200).json(response);
                } else {
                    response = { 'error_code': 2, 'tl': 'not found' };
                    res.status(200).json(response);
                }
            }
        })

    },
    GetHcd: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");

        if (req.body.Fromday === null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
                },
                'Manager.id': req.body.Username
            }
        }
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }
        if (req.body.Fromday !== null && req.body.Today !== null) {
            today = req.body.Today;
            firstDay = req.body.Fromday;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetHcd ' + err);
            } else {
                if (data.length > 0) {
                    var notapp = [];
                    data.forEach(element => {
                        if (element.Appointment_day !== null) {
                            if (compareday(today) - compareday(element.Appointment_day) > 0) {
                                if (element.Status_student[0].id !== 3 && element.Status_student[0].id !== 4) {
                                    notapp.push(element);
                                }
                            }
                        }
                    });
                    var hcd = notapp;
                    response = { 'error_code': 0, 'hcd': hcd };
                    res.status(200).json(response);
                } else {
                    response = { 'error_code': 0, 'hcd': [] };
                    res.status(200).json(response);
                }
            }
        })
    },
    GetDcdk: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");

        if (req.body.Fromday === null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 2
            }
        }
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 2
            }
        }
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 2
            }
        }
        if (req.body.Fromday !== null && req.body.Today !== null) {
            today = req.body.Today;
            firstDay = req.body.Fromday;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 2
            }
        }

        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetDcdk ' + err);
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 0, 'dcdk': data };
                    res.status(200).json(response);
                } else {
                    response = { 'error_code': 0, 'dcdk': [] };
                    res.status(200).json(response);
                }
            }
        })
    },
    GetCdk: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");

        if (req.body.Fromday === null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 0
            }
        }
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 0
            }
        }
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 0
            }
        }
        if (req.body.Fromday !== null && req.body.Today !== null) {
            today = req.body.Today;
            firstDay = req.body.Fromday;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 0
            }
        }

        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetCdk ' + err);
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 0, 'cdk': data };
                    res.status(200).json(response);
                } else {
                    response = { 'error_code': 0, 'cdk': [] };
                    res.status(200).json(response);
                }
            }
        })
    },
    GetKtn: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");

        if (req.body.Fromday === null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 1
            }
        }
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 1
            }
        }
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 1
            }
        }
        if (req.body.Fromday !== null && req.body.Today !== null) {
            today = req.body.Today;
            firstDay = req.body.Fromday;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username,
                'Status_student.id': 1
            }
        }

        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetKtn ' + err);
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 0, 'ktn': data };
                    res.status(200).json(response);
                } else {
                    response = { 'error_code': 0, 'ktn': [] };
                    res.status(200).json(response);
                }
            }
        })
    },
    GetLh: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");

        if (req.body.Fromday === null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
                },
                'Manager.id': req.body.Username,
            }
        }
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }
        if (req.body.Fromday !== null && req.body.Today !== null) {
            today = req.body.Today;
            firstDay = req.body.Fromday;
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), firstDay),
                    $lte: dateFormat(new Date(), today)
                },
                'Manager.id': req.body.Username
            }
        }

        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetLh ' + err);
            } else {
                if (data.length > 0) {
                    var dh = [];
                    var ddk = [];
                    var dcdk = [];
                    data.forEach(element => {
                        if (element.Appointment_day !== null && element.Appointment_time !== null) {
                            // if (element.Appointment_time[0].id !== null) {
                                dh.push(element);
                            // }
                        }
                        if (element.Status_student[0].id === 3) {
                            ddk.push(element);
                        }

                        if (element.Status_student[0].id === 2) {
                            dcdk.push(element);
                        }
                    });

                    var lh = [
                        {
                            Fullname: data[0].Manager[0].id,
                            DH: dh,
                            Ddk: ddk,
                            Dcdk: dcdk,
                        }
                    ]

                    response = { 'error_code': 0, 'lh': lh };
                    res.status(200).json(response);
                } else {
                    response = { 'error_code': 2, 'lh': 'not found' };
                    res.status(200).json(response);
                }
            }
        })
    }
}