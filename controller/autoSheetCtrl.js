var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var schedule = require('node-schedule');
var dateFormat = require('dateformat');
var mongoose = require('mongoose');


//model
var autosheet_model = require('../model/autoSheet');
var auth_model = require('../model/auth');

// lấy danh sách telesale
function get_telesale(student) {
    auth_model.find({ 'Role.id': 1, 'Status_user.id': 1 }, function (err, data) {
        if (err) {
            console.log('get_telesale ' + err);
        } else {
            if (data.length > 0) {
                insertStudent(student, data[0]);
            }
        }

    }).sort({ 'Student_in_month.Total': 1 });
}

// reset student trong tháng mỗi đầu tháng
function reset_student(_m) {
    auth_model.find({ 'Role.id': 1, 'Status_user.id': 1 }, function (err, data) {
        if (err) {
            console.log('reset_student ' + err);
        } else {
            if (data.length > 0) {
                if (_m > data[0].Student_in_month[0].Month) {
                    new_student_in_month = {
                        Total: 0,
                        Waiting: 0,
                        Out: 0,
                        In: 0,
                        Month: _m
                    }
                    data.forEach(element => {
                        element.Student_in_month = new_student_in_month;
                        element.save(function (err) {
                            if (err) {
                                console.log('save reset ' + err)
                            }
                        })
                    });
                }
            }
        }
    })
}

// cập nhật thông tin cho telesale
function update_total_for_tele(Username) {
    auth_model.findOne({ Username: Username }, function (err, data) {
        _total = parseInt(data.Student_in_month[0].Total) + 1;
        _wai = data.Student_in_month[0].Waiting;
        _in = data.Student_in_month[0].In;
        _out = data.Student_in_month[0].Out;
        _month = data.Student_in_month[0].Month;
        _in_month = {
            Total: _total,
            Waiting: _wai,
            Out: _in,
            In: _out,
            Month: _month
        }
        data.Student_in_month = _in_month;
        data.save(function (err) {
            if (err) {
                console.log('update for telesale ' + err);
            }
        })
    })

}

// thêm học viên và chia cho telesale
function insertStudent(stude, tele) {
    autosheet_model.find({ Id_sheet: stude.id }, function (err, data) {
        if (err) {
            console.log('insertStudent ' + err);
        } else {
            if (data.length === 0) {
                let dayreg = dateFormat(new Date(), "dd/mm/yyyy");
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
                let timereg = dateFormat(new Date(), "HH:MM:ss")
                let manager = {
                    id: tele.Username,
                    name: tele.Fullname
                }
                let status_student = {
                    id: 0,
                    name: 'Chưa đăng ký'
                }
                let student = new autosheet_model({
                    IdforFrend: mongoose.Types.ObjectId(),
                    Id_sheet: stude.id,
                    Fullname: stude.họtên,
                    Email: stude.email,
                    Phone: stude.sốđiệnthoại,
                    Sex: null,
                    Address: null,
                    Regday: dayreg,
                    Regdayiso: isoday,
                    Regday2: null,
                    Regtime: timereg,
                    Dayenrollment: null,
                    Note: null,
                    Center: null,
                    Time_recall: null,
                    Recall: false,
                    Appointment_day: null,
                    Appointment_dayiso: null,
                    Appointment_time: null,
                    Status_student: status_student,
                    ListFriend: null,
                    Manager: manager,
                    Isupdate: false,
                    Duplicate: null
                });
                student.save(function (err) {
                    if (err) {
                        console.log('save student ' + err)
                    } else {
                        update_total_for_tele(tele.Username);
                    }
                })
            }
        }
    });
}

//function auto check google sheet
function getSheet() {
    var doc = new GoogleSpreadsheet('1wP1ef6NS_eUixv4Vyz6VxLFISKNUP7GoRojsqu6dLiU');
    var sheet;
    async.series([
        function setAuth(step) {
            // see notes below for authentication instructions!
            var creds = require('../2i studio-fd2ce7d288b9.json');
            doc.useServiceAccountAuth(creds, step);
        },
        function getInfoAndWorksheets(step) {
            doc.getInfo(function (err, info) {
                if (info !== undefined) {
                    sheet = info.worksheets[0];
                }
                step();
            });
        },
        function workingWithRows(step) {
            // google provides some query options
            if (sheet !== undefined) {
                sheet.getRows({
                    offset: 1
                    // orderby: 'col2'
                }, function (err, rows) {
                    if (rows !== undefined && rows !== null) {
                        if (rows.length > 0) {
                            // var j = 0;
                            //lấy danh sách học viên mới
                            for (let i = 0; i < rows.length; i++) {
                                if (rows[i].move === "") {
                                    setTimeout(function () {
                                        rows[i].move = "moved";
                                        rows[i].save();
                                        get_telesale(rows[i]);
                                    }, 1000 * i)
                                }
                            }
                        }
                    }
                    step();
                });
            }
        }
    ], function (err) {
        if (err) {
            console.log('Error: ' + err);
        }
    });
}

/*
schedule function
1. function check student automatic every minute
*/
schedule.scheduleJob('0 0 0 * * *', function () {
    let _the_month = dateFormat(new Date(), 'mm');
    reset_student(parseInt(_the_month));
})

schedule.scheduleJob('*/30 * * * * *', function () {
    getSheet();
})

