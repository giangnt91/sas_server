var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var schedule = require('node-schedule');
var dateFormat = require('dateformat');
var mongoose = require('mongoose');

var express = require('express'), http = require('http');
var sas = express();
var http = http.Server(sas);
var io = require('socket.io')(http);
var moment = require('moment');



//model
var autosheet_model = require('../model/autoSheet');
var auth_model = require('../model/auth');
var group_model = require('../model/groups');
var center_model = require('../model/center');

// compare day
function compareday(x) {
    var parts = x.split("/");
    return parts[1] + '/' + parts[0] + '/' + parts[2];
}

function getYesterdaysDate() {
    var date = new Date();
    date.setDate(date.getDate() - 1);
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}
// kiểm tra và cập nhật khóa học cho học viên
function CheckAndUpdateCourse(id){
	var doc = new GoogleSpreadsheet(id);
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
                }, function (err, rows) {
                    if (rows !== undefined && rows !== null) {
                        if (rows.length > 0) {
									autosheet_model.find({'Status_student.id': 3}, function(err, data){
										if(err){
											console.log('Get reg student ' + err);
										}else{
											if(data.length > 0){											
												data.forEach(element => {
												let j = 0;
													rows.forEach( el => {
														if(element.Phone === el.phone){
															j ++;
															if(j >= 2){
																element.Course = 2;
																element.save(function(err){
																	if(err){
																		console.log(err);
																	}
																})
															}
														}
													})
												})
											}
										}
									})
                                // }, 1000 * i)
                            // }
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

// lấy user thấp nhất trong danh sách telesale
function get_telesale(student, _id, sheet_id, mid, mname) {
    var query = { 'Role.id': 1, 'Status_user.id': 1, 'Zone.id': _id };
    auth_model.find(query, function (err, data) {
        if (err) {
            console.log('get_telesale ' + err);
        } else {
            if (data.length > 0) {
                let _day = 0;
                if (data[0].TimeForAdmin !== null) {
                    if (data[0].TimeForAdmin[0].id === 1) {
                        _day = 30;
                    }
                    if (data[0].TimeForAdmin[0].id === 2) {
                        _day = 60;
                    }
                    if (data[0].TimeForAdmin[0].id === 3) {
                        _day = 90;
                    }
                }

                insertStudent(student, data[0], sheet_id, mid, mname, _day);
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
                        InByday: 0,
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
        _inbyday = data.Student_in_month[0].InByday;
        _out = data.Student_in_month[0].Out;
        _month = data.Student_in_month[0].Month;
        _in_month = {
            Total: _total,
            Waiting: _wai,
            Out: _in,
            In: _out,
            InByday: _inbyday,
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
function insertStudent(stude, tele, sheet_id, mid, mname, admin_time) {
    autosheet_model.find({ Phone: stude.sốđiệnthoại }, function (err, data) {
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
                    name: tele.Fullname,
                    sheetId: sheet_id,
					gtele: tele.Zone[0].id,
                    mid: mid,
                    mname: mname
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
                    SMS: null,
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
                    Duplicate: null,
					Course: 0,
					EditHistory: null
                });
                student.save(function (err) {
                    if (err) {
                        console.log('save student ' + err)
                    } else {
                        update_total_for_tele(tele.Username);
                    }
                })
            }

            else if (data.length === 1) {

                // case 1: đã đăng ký học
                if (data[0].Status_student[0].id === 3) {
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
                        id: data[0].Manager[0].id,
                        name: data[0].Manager[0].name,
                        sheetId: data[0].Manager[0].sheetId,
						gtele: data[0].Zone[0].id,
                        mid: data[0].Manager[0].mid,
                        mname: data[0].Manager[0].mname
                    }
                    let status_student = {
                        id: 0,
                        name: 'Chưa đăng ký'
                    }
                    let duplicate = {
                        preid: data[0].Manager[0].id,
                        prename: data[0].Manager[0].name,
                        premid: mid,
                        premname: mname,
                        msheetid: data[0].Manager[0].sheetId,
                        pretime: data[0].Regtime + ' ' + data[0].Regday,
                        alert: false,
                        time: null
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
                        Duplicate: duplicate,
						Course: 0,
						EditHistory: null
                    });
                    student.save(function (err) {
                        if (err) {
                            console.log('save student ' + err)
                        } else {
                            update_total_for_tele(tele.Username);
                        }
                    })
                }


                // case 2 và case 3
                else {
                    if (stude.id !== data[0].Id_sheet) {
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


                        // đếm số ngày với định dạng mm/dd/yyyy
                        var date1 = new Date(compareday(dayreg));
                        var date2 = new Date(compareday(data[0].Regday));
                        var diffDays = parseInt((date1 - date2) / (1000 * 60 * 60 * 24));

                        // case 2: thời gian trùng chưa quá cho phép
                        if (diffDays <= parseInt(admin_time)) {
                            let manager = {
                                id: data[0].Manager[0].id,
                                name: data[0].Manager[0].name,
                                sheetId: data[0].Manager[0].sheetId,
								gtele: data[0].Zone[0].id,
                                mid: mid,
                                mname: mname
                            }
                            let status_student = {
                                id: 0,
                                name: 'Chưa đăng ký'
                            }
                            let duplicate = {
                                preid: data[0].Manager[0].id,
                                prename: data[0].Manager[0].name,
                                premid: data[0].Manager[0].mid,
                                premname: data[0].Manager[0].mname,
                                msheetid: data[0].Manager[0].sheetId,
                                pretime: data[0].Regtime + ' ' + data[0].Regday,
                                alert: false,
                                time: diffDays
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
                                Duplicate: duplicate,
								Course: 0,
								EditHistory: null
                            });
                            student.save(function (err) {
                                if (err) {
                                    console.log('save student ' + err)
                                } else {
                                    update_total_for_tele(tele.Username);
                                }
                            })
                        }

                        // case 3: thời gian trùng đã quá phép
                        else {
                            let manager = {
                                id: data[0].Manager[0].id,
                                name: data[0].Manager[0].name,
                                sheetId: data[0].Manager[0].sheetId,
								gtele: data[0].Zone[0].id,
                                mid: mid,
                                mname: mname
                            }
                            let status_student = {
                                id: 0,
                                name: 'Chưa đăng ký'
                            }
                            let duplicate = {
                                preid: data[0].Manager[0].id,
                                prename: data[0].Manager[0].name,
                                premid: data[0].Manager[0].mid,
                                premname: data[0].Manager[0].mname,
                                msheetid: data[0].Manager[0].sheetId,
                                pretime: data[0].Regtime + ' ' + data[0].Regday,
                                alert: false,
                                time: diffDays
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
                                Duplicate: duplicate,
								Course: 0,
								EditHistory: null
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
                }
            }

        }
    });
}

//function auto check google sheet
function getSheet(list) {
    var _id = list.idgroup;
    var doc = new GoogleSpreadsheet(list.sheet);
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
                                        get_telesale(rows[i], _id.toString(), list.sheet, list.mid, list.mname);
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

// kiểm tra thông tin các group
function checkGroup() {
    group_model.find({ Sheet: { $ne: null } }, function (err, data) {
        if (err) {
            console.log('checkGroup ' + err);
        } else {
            if (data.length > 0) {
                let list_sheet = [];
                data.forEach(element => {
                    for (let i = 0; i < element.Sheet.length; i++) {
                        setTimeout(function () {
                            let tmp = {
                                idgroup: element._id,
                                sheet: element.Sheet[i].id,
                                mid: element.Sheet[i].muser,
                                mname: element.Sheet[i].name
                            }
                            getSheet(tmp);
                        }, i * 3000)
                    }
                });
            }
        }
    })
}

// kiểm tra số lượng học viên đăng ký của user theo tháng
function CheckStudentIn() {
    var query = { 'Role.id': 1, 'Status_user.id': 1 };
    auth_model.find(query, function (err, data) {
        if (err) {
            console.log('CheckStudentIn: ' + err)
        } else {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    setTimeout(function () {
                        autosheet_model.find({ 'Manager.id': data[i].Username, 'Status_student.id': 3 }, function (err, _data) {
                            if (err) {
                                console.log('Find Student: ' + err)
                            } else {

                                let _tmp = {
                                    Total: data[i].Student_in_month[0].Total,
                                    Waiting: data[i].Student_in_month[0].Waiting,
                                    Out: data[i].Student_in_month[0].Out,
                                    In: _data.length,
                                    InByday: data[i].Student_in_month[0].InByday,
                                    Month: data[i].Student_in_month[0].Month
                                }

                                data[i].Student_in_month = [_tmp]
                                data[i].save(function (err) { })
                            }
                        })

                    }, i * 2000)
                }
            }
        }
    })
}


// kiểm tra số lượng học viên đăng ký của user theo từng ngày
function CheckStudentInByday(last_day) {
    var query = {
        'Role.id': 1,
        'Status_user.id': 1
    };


    auth_model.find(query, function (err, data) {
        if (err) {
            console.log('CheckStudentIn: ' + err)
        } else {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    setTimeout(function () {
                        var query_2 = {
                            'Manager.id': data[i].Username,
                            'Status_student.id': 3,
                            'Dayenrollment': dateFormat(new Date(), last_day)
                        }
                        autosheet_model.find(query_2, function (err, _data) {
                            if (err) {
                                console.log('Find Student: ' + err)
                            } else {
                                let _tmp = {
                                    Total: data[i].Student_in_month[0].Total,
                                    Waiting: data[i].Student_in_month[0].Waiting,
                                    Out: data[i].Student_in_month[0].Out,
                                    In: data[i].Student_in_month[0].In,
                                    InByday: _data.length,
                                    Month: data[i].Student_in_month[0].Month
                                }

                                data[i].Student_in_month = [_tmp]
                                data[i].save(function (err) { })
                            }
                        })

                    }, i * 2000)
                }
            }
        }
    })
}


// thực hiện chia học viên sau ngày 5 hàng tháng

function get_list_tele_for_st(student, _id, sheet_id, mid, mname, index) {
    var query = { 'Role.id': 1, 'Status_user.id': 1, 'Zone.id': _id };
    auth_model.find(query, function (err, data) {
        if (err) {
            console.log('get_telesale ' + err);
        } else {
            if (data.length > 0) {
                let _day = 0;
                if (data[index].TimeForAdmin !== null) {
                    if (data[index].TimeForAdmin[0].id === 1) {
                        _day = 30;
                    }
                    if (data[index].TimeForAdmin[0].id === 2) {
                        _day = 60;
                    }
                    if (data[index].TimeForAdmin[0].id === 3) {
                        _day = 90;
                    }
                }

                insertStudent(student, data[index], sheet_id, mid, mname, _day);
            }
        }
    }).sort({ 'Student_in_month.InByday': -1 });
}

// lấy list user telesale
function get_list_tele_5() {
    var query = { 'Role.id': 1, 'Status_user.id': 1 };
    auth_model.find(query, function (err, data) {
        if (err) {
            console.log('get_telesale ' + err);
        } else {
            checkGroup5(data);
        }
    }).sort({ 'Student_in_month.In': -1 });
}


function checkGroup5(user) {
    group_model.find({ Sheet: { $ne: null } }, function (err, data) {
        if (err) {
            console.log('checkGroup ' + err);
        } else {
            if (data.length > 0) {
                let list_sheet = [];
                data.forEach(element => {
                    for (let i = 0; i < element.Sheet.length; i++) {
                        setTimeout(function () {
                            let tmp = {
                                idgroup: element._id,
                                sheet: element.Sheet[i].id,
                                mid: element.Sheet[i].muser,
                                mname: element.Sheet[i].name
                            }
                            getSheet5(tmp, user.length);
                        }, i * 3000)
                    }
                });
            }
        }
    })
}


//function auto check google sheet
function getSheet5(list, user) {
    var _id = list.idgroup;
    var doc = new GoogleSpreadsheet(list.sheet);
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
                            u = 0;
                            for (let i = 0; i < rows.length; i++) {
                                if (rows[i].move === "") {
                                    // rows[i].move = "moved";
                                    // rows[i].save();

                                    if (u <= Math.ceil(user)) {
                                        setTimeout(function () {
                                            rows[i].move = "moved";
                                            rows[i].save();
                                            get_list_tele_for_st(rows[i], _id.toString(), list.sheet, list.mid, list.mname, 0);
                                        }, 1000 * i)
                                        ++u
                                    }

                                    else if ((user * 2) > u && u < user) {
                                        index = Math.random() * (user - 0) + 0;
                                        setTimeout(function () {
                                            rows[i].move = "moved";
                                            rows[i].save();
                                            get_list_tele_for_st(rows[i], _id.toString(), list.sheet, list.mid, list.mname, index);
                                        }, 1000 * i)
                                        ++u;
                                    }

                                    else {
                                        setTimeout(function () {
                                            rows[i].move = "moved";
                                            rows[i].save();
                                            get_telesale(rows[i], _id.toString(), list.sheet, list.mid, list.mname);
                                        }, 1000 * i)
                                    }
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


// compare day
function compareday2(x) {
    var parts = x.split("-");
    return parts[0] + '' + parts[1] + '' + parts[2];;
}


// function cập nhật học viên đã đã đăng ký mỗi 15'
function getRegStudent(id) {
    var doc = new GoogleSpreadsheet(id);
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
                }, function (err, rows) {
                    if (rows !== undefined && rows !== null) {
                        if (rows.length > 0) {
                            //lấy danh sách học viên mới
                            for (let i = 0; i < rows.length; i++) {
                                setTimeout(function () {
									var today = dateFormat(new Date(), "yyyy-mm-dd");
									autosheet_model.findOne({Phone: rows[i].phone}, function(err, data){
										if(err){
											console.log('Get reg student ' + err);
										}else{
											if(data !== null){
												let _status = {
													name : "Đã đăng ký", 
													id: 3
												}
												if(data.Status_student[0].id !== 3){
													data.Status_student = [_status];
													data.Dayenrollment = today;
													data.Course = 1;
													data.save(function(err){
														if(err){
															console.log(err);
														}
													})
												}
											}
										}
									})
                                }, 1000 * i)
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


// function cập nhật trung tâm sas
function addCenter(id) {
    var doc = new GoogleSpreadsheet(id);
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
                }, function (err, rows) {
                    if (rows !== undefined && rows !== null) {
                        if (rows.length > 0) {
                            //lấy danh sách học viên mới
                            for (let i = 0; i < rows.length; i++) {
								setTimeout(function () {
									insertCenter(rows[i]);
								}, 1000 * i)
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


// thêm trung tâm sas vào db
function insertCenter(center) {
	center_model.find({SheetId: center.id}, function(err, data){
		if(err){
			console.log('insertcenter '+err);
		}else{
			if(data.length === 0){
				let thecenter = new center_model({
					SheetId: center.id,
					Name: center.tênđầyđủ,
					Id: center.viếttắt,
					Info: center.thôngtinchitiết
				});
				thecenter.save(function(err){
					if(err){
						console.log(err);
					}
				})
			}else{
				data[0].SheetId = center.id;
				data[0].Name= center.tênđầyđủ;
				data[0].Id= center.viếttắt;
				data[0].Info= center.thôngtinchitiết;
				
				data[0].save(function(err){
					if(err){
						console.log(err);
					}
				})
			}
		}
	})
}

/*
schedule automatic function
*/
// chạy kiểm tra mỗi 10 phút
schedule.scheduleJob('*/10 * * * *', function () {
	// lấy danh sách học viên đã đăng ký
	getRegStudent('142Jgjv9WAgJf9x6pJLgElR8p68ly4RmBCHZIzH4gl40');
})

// function chạy vào 12h đêm hàng ngày
schedule.scheduleJob('0 0 0 * * *', function () {
    let _the_month = dateFormat(new Date(), 'mm');
    reset_student(parseInt(_the_month));

    // cập nhật học viên đăng ký hàng tháng
    CheckStudentIn();

    // cập nhật học viên đăng ký hàng ngày
    var yesterday = getYesterdaysDate();
    CheckStudentInByday(yesterday);
	
	// lấy danh sách trung tâm từ sheet và cập nhật vào db
	addCenter('192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y');
	
	// kiểm tra và cập nhật số khóa học cho học viên
	CheckAndUpdateCourse('142Jgjv9WAgJf9x6pJLgElR8p68ly4RmBCHZIzH4gl40')
})


// chạy cập nhật data học viên mỗi 10 giây
schedule.scheduleJob('*/10 * * * * *', function () {

    var d = new Date();
    myday = d.getDate();

    if (myday > 5) {
        get_list_tele_5();
    } else {
        checkGroup();
    }
})

