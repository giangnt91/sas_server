var dateFormat = require('dateformat');
var mongoose = require('mongoose');
var moment = require('moment');

//get model
var student_model = require('../model/autoSheet');
var sms_model = require('../model/sms');
var auth_model = require('../model/auth');


// compare day
function compareday(x) {
    var parts = x.split("/");
    return parts[2] + '' + parts[1] + '' + parts[0];
}

// compare day
function compareday2(x) {
    var parts = x.split("-");
    return parts[0] + '' + parts[1] + '' + parts[2];;
}

function getFirstDateOfMonth() {
    var date = new Date(), y = date.getFullYear(), m = date.getMonth();
    var firstDay = new Date(y, m, 1);
	
    firstDay = moment(firstDay).format('YYYY-MM-DD');
    return firstDay
}

// Api
module.exports = {
    Csms: function (req, res) {
        var _sms = new sms_model({
            Title: req.body.Title,
            SMS: req.body.SMS
		});
        _sms.save(function (err) {
            if (err) {
                console.log('CSMS ' + err)
                response = { 'error_code': 1, 'message': 'error fetching data' }
				} else {
                response = { 'error_code': 0, 'message': 'create sms success' }
			}
            res.status(200).json(response);
		})
	},
    Gsms: function (req, res) {
        sms_model.find({}, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' }
                res.status(200).json(response);
				} else {
                response = { 'error_code': 0, 'sms': data }
                res.status(200).json(response);
			}
		}).sort({ _id: -1 });
	},
	
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
    GetallQuery: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Fromday !== null && req.body.Today !== null) {
            firstDay = req.body.Fromday;
            today = req.body.Today;
		}
		
        if (req.body.Fromday !== null && req.body.Today === null) {
            firstDay = req.body.Fromday
		}
		
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
		}
		
        if (req.body.Role[0].id === 0) {
			
            if (req.body._status === null && req.body.form === null) {
                query = {
                    Regdayiso: {
                        $gte: dateFormat(new Date(), firstDay),
                        $lte: dateFormat(new Date(), today)
					}
				}
			}
			
            if (req.body._status !== null && req.body.form === null) {
                // online không trùng
                if (req.body._status === 1) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Duplicate': null
					}
				}
				
                //đã đăng ký
                if (req.body._status === 2) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Status_student.id': 3
					}
				}
				
                // trùng
                if (req.body._status === 3) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Duplicate': { $ne: null }
					}
				}
				
                // không tiềm năng
                if (req.body._status === 4) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Status_student.id': 1
					}
				}
				
			}
			
            if (req.body._status === null && req.body.form !== null) {
                query = {
                    Regdayiso: {
                        $gte: dateFormat(new Date(), firstDay),
                        $lte: dateFormat(new Date(), today)
					},
                    'Manager.sheetId': req.body.form
				}
			}
			
            if (req.body._status !== null && req.body.form !== null) {
				
                // online không trùng
                if (req.body._status === 1) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Manager.sheetId': req.body.form,
                        'Duplicate': null
					}
				}
				
                //đã đăng ký
                if (req.body._status === 2) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Manager.sheetId': req.body.form,
                        'Status_student.id': 3
					}
				}
				
                // trùng
                if (req.body._status === 3) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Manager.sheetId': req.body.form,
                        'Duplicate': { $ne: null }
					}
				}
				
                // không tiềm năng
                if (req.body._status === 4) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Manager.sheetId': req.body.form,
                        'Status_student.id': 1
					}
				}
			}
			} else {
			
            if (req.body._status === null && req.body.form === null) {
                query = {
                    Regdayiso: {
                        $gte: dateFormat(new Date(), firstDay),
                        $lte: dateFormat(new Date(), today)
					},
                    'Manager.mid': req.body.Username
				}
			}
			
            if (req.body._status !== null && req.body.form === null) {
                // online không trùng
                if (req.body._status === 1) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Duplicate': null,
                        'Manager.mid': req.body.Username
					}
				}
				
                //đã đăng ký
                if (req.body._status === 2) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Status_student.id': 3,
                        'Manager.mid': req.body.Username
					}
				}
				
                // trùng
                if (req.body._status === 3) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Duplicate': { $ne: null },
                        'Manager.mid': req.body.Username
					}
				}
				
                // không tiềm năng
                if (req.body._status === 4) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Status_student.id': 1,
                        'Manager.mid': req.body.Username
					}
				}
				
			}
			
            if (req.body._status === null && req.body.form !== null) {
                query = {
                    Regdayiso: {
                        $gte: dateFormat(new Date(), firstDay),
                        $lte: dateFormat(new Date(), today)
					},
                    'Manager.sheetId': req.body.form,
                    'Manager.mid': req.body.Username
				}
			}
			
            if (req.body._status !== null && req.body.form !== null) {
				
                // online không trùng
                if (req.body._status === 1) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Manager.sheetId': req.body.form,
                        'Duplicate': null,
                        'Manager.mid': req.body.Username
					}
				}
				
                //đã đăng ký
                if (req.body._status === 2) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Manager.sheetId': req.body.form,
                        'Status_student.id': 3,
                        'Manager.mid': req.body.Username
					}
				}
				
                // trùng
                if (req.body._status === 3) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Manager.sheetId': req.body.form,
                        'Duplicate': { $ne: null },
                        'Manager.mid': req.body.Username
					}
				}
				
                // không tiềm năng
                if (req.body._status === 4) {
                    query = {
                        Regdayiso: {
                            $gte: dateFormat(new Date(), firstDay),
                            $lte: dateFormat(new Date(), today)
						},
                        'Manager.sheetId': req.body.form,
                        'Status_student.id': 1,
                        'Manager.mid': req.body.Username
					}
				}
			}
			
		}
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetallQuery ' + err);
				} else {
                response = { 'error_code': 0, 'student': data };
                res.status(200).json(response);
			}
		})
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
                if (data !== null) {
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
					
                    var _isupdate;
                    if (data.Isupdate === false) {
                        if (req.body.detail.Note !== data.Note &&
						data.Fullname === req.body.detail.Fullname &&
						data.Email === req.body.detail.Email &&
						data.Sex === req.body.detail.Sex &&
						data.Address === req.body.detail.Address &&
						data.Reday2 === req.body.detail.Regday2 &&
						data.Appointment_day === req.body.detail.Appointment_day &&
						data.Appointment_dayiso === req.body.detail.Appointment_dayiso &&
						data.Appointment_time === req.body.detail.Appointment_time &&
						data.Status_student === req.body.detail.Status_student &&
						data.Center === req.body.detail.Center &&
						data.Time_recall === req.body.detail.Time_recall &&
						data.Recall === req.body.detail.Recall &&
						data.ListFriend === req.body.detail.ListFriend &&
						data.Manager === req.body.detail.Manager &&
						data.Dayenrollment === isoday &&
						data.SMS === req.body.detail.SMS) {
                            _isupdate = false;
							} else {
                            _isupdate === true;
						}
						} else {
                        _isupdate === true;
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
                    data.Appointment_dayiso = req.body.detail.Appointment_dayiso;
                    data.Appointment_time = req.body.detail.Appointment_time;
                    data.Status_student = req.body.detail.Status_student;
                    data.Center = req.body.detail.Center;
                    data.Time_recall = req.body.detail.Time_recall;
                    data.Recall = req.body.detail.Recall;
                    data.ListFriend = req.body.detail.ListFriend;
                    data.Isupdate = _isupdate;
                    data.Manager = req.body.detail.Manager;
                    data.Dayenrollment = isoday;
                    data.SMS = req.body.detail.SMS;
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
        student_model.find({ Phone: req.body.Phone }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
				} else {
                if (data.length > 0) {
                    response = { 'error_code': 2, 'message': 'Phone is exit' }
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
                        SMS: null,
                        Center: req.body.Center,
                        Time_recall: null,
                        Recall: false,
                        Appointment_day: req.body.Appointment_day,
                        Appointment_dayiso: req.body.Appointment_dayiso,
                        Appointment_time: req.body.Appointment_time,
                        Status_student: req.body.Status_student,
                        ListFriend: null,
                        Manager: req.body.Manager,
                        Isupdate: false,
                        Duplicate: null,
						Course: 0
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
			}
		})
	},
	
    // Tìm kiếm
    SearchH: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Regday !== null) {
            firstDay = req.body.Regday;
		}
		
        if (req.body.Regday2 !== null) {
            today = req.body.Regday2;
		}
		
        // tìm kiếm cho admin
        if (req.body.Role[0].id === 0) {
			
            if (req.body.Center === null && req.body.Status === null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					}
				}
			}
			
            if (req.body.Center !== null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    'Center._id': req.body.Center
				}
			}
			
            if (req.body.Status !== null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    'Status_student.id': req.body.Status
				}
			}
			
            if (req.body.Center !== null && req.body.Status !== null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    'Status_student.id': req.body.Status,
                    'Center._id': req.body.Center
				}
			}
			
		}
		
        // tìm kiếm cho user thường
        if (req.body.Role[0].id !== 0) {
			
            if (req.body.Center === null && req.body.Status === null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    'Manager.id': req.body.Username
				}
			}
			
            if (req.body.Center !== null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    'Center._id': req.body.Center,
                    'Manager.id': req.body.Username
				}
			}
			
            if (req.body.Status !== null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    'Status_student.id': req.body.Status,
                    'Manager.id': req.body.Username
				}
			}
			
            if (req.body.Center !== null && req.body.Status !== null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    'Status_student.id': req.body.Status,
                    'Center._id': req.body.Center,
                    'Manager.id': req.body.Username
				}
			}
			
		}
		
		
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('SearchH ' + err);
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response)
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
    SearchN: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Regday !== null) {
            firstDay = req.body.Regday;
		}
		
        if (req.body.Regday2 !== null) {
            today = req.body.Regday2;
		}
		
        // lọc cho user khác
        if (req.body.Role[0].id !== 0) {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
				},
                'Manager.id': req.body.Username,
                Isupdate: false
			}
			} else {
            // lọc cho admin 
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
				},
                Isupdate: false
			}
		}
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('SearchN ' + err);
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response)
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
    SearchR: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Reday !== null) {
            firstDay = req.body.Reday;
		}
		
        if (req.body.Reday2 !== null) {
            today = req.body.Reday2;
		}
		
        // lọc cho admin
        if (req.body.Role[0].id === 0) {
			
            if (req.body.Sale !== null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    $and: [{
                        $or: [{
                            'Time_recall.time.id': {
                                $gte: req.body.Retime,
                                $lte: req.body.Retime2
							}
							}, {
                            Recall: true
						}]
					}],
                    'Manager.id': req.body.Sale,
					
				}
				} else {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    $and: [{
                        $or: [{
                            'Time_recall.time.id': {
                                $gte: req.body.Retime,
                                $lte: req.body.Retime2
							}
							}, {
                            Recall: true
						}]
					}]
				}
			}
			
			} else {
            // lọc cho user khác
			
            if (req.body.Sale !== null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    $and: [{
                        $or: [{
                            'Time_recall.time.id': {
                                $gte: req.body.Retime,
                                $lte: req.body.Retime2
							}
							}, {
                            Recall: true
						}]
					}],
                    // 'Manager.id': req.body.Sale,
                    'Manager.id': req.body.Username,
				}
				} else {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    $and: [{
                        $or: [{
                            'Time_recall.time.id': {
                                $gte: req.body.Retime,
                                $lte: req.body.Retime2
							}
							}, {
                            Recall: true
						}]
					}],
                    'Manager.id': req.body.Username,
				}
			}
			
		}
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('SearchR ' + err);
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response)
				} else {
                if (data.length > 0) {
                    var recal = [];
                    data.forEach(element => {
						if(element.Time_recall !== null){
							if(element.Center === null){
								if (compareday2(firstDay) <= compareday(element.Time_recall[0].day) <= compareday2(today)) {
									recal.push(element);
								}
								}else{
								if(element.Center[0].id === null){
									recal.push(element);
								}
							}
							}else{
							if(element.Center === null){
								recal.push(element);
								}else{
								if(element.Center[0].id === null){
									recal.push(element);
								}
							}
						}
					});
                    response = { 'error_code': 0, 'students': recal };
					} else {
                    response = { 'error_code': 2, 'message': 'list is empty' };
				}
                res.status(200).json(response)
			}
		})
	},
    SearchSch: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Regday !== null) {
            firstDay = req.body.Regday;
		}
		
        if (req.body.Regday2 !== null) {
            today = req.body.Regday2;
		}
		
        // tìm cho admin
        if (req.body.Role[0].id === 0) {
            if (req.body.Sale !== null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    'Manager.id': req.body.Sale,
                    Appointment_day: { $ne: null }
				}
				} else {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    Appointment_day: { $ne: null }
				}
			}
			} else {
            // tìm cho user khác
            // if (req.body.Sale !== null) {
            //     query = {
            //         Regdayiso: {
            //             $gte: firstDay,
            //             $lte: today
            //         },
            //         'Manager.id': req.body.Sale,
            //         Appointment_day: { $ne: null },
            //         'Manager.id': req.body.Username
            //     }
            // } else {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
				},
                Appointment_day: { $ne: null },
                'Manager.id': req.body.Username
			}
            // }
			
		}
		
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('SearchSch ' + err);
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response)
				} else {
                if (data.length > 0) {
                    var schedule = [];
                    data.forEach(element => {
                        if (compareday(element.Appointment_day) < compareday2(today)) {
                            if (element.Status_student[0].id !== 3) {
                                schedule.push(element);
							}
						}
					});
                    response = { 'error_code': 0, 'students': schedule };
					} else {
                    response = { 'error_code': 2, 'message': 'list is empty' };
				}
                res.status(200).json(response)
			}
		})
	},
    SearchUn: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Regday !== null) {
            firstDay = req.body.Regday;
		}
		
        if (req.body.Regday2 !== null) {
            today = req.body.Regday2;
		}
		
        // lọc cho user thường
        if (req.body.Role[0].id !== 0) {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
				},
                'Manager.id': req.body.Username
			}
			} else {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
				}
			}
		}
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('SearchUn ' + err);
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response)
				} else {
                if (data.length > 0) {
                    var unreg = [];
                    data.forEach(element => {
                        if (element.Status_student[0].id === 2) {
                            unreg.push(element);
						}
					});
					
                    response = { 'error_code': 0, 'students': unreg };
					} else {
                    response = { 'error_code': 2, 'message': 'list is empty' };
				}
                res.status(200).json(response)
			}
		})
	},
    SearchS: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Regday !== null) {
            firstDay = req.body.Regday;
		}
		
        if (req.body.Regday2 !== null) {
            today = req.body.Regday2;
		}
		
        // lọc cho admin
        if (req.body.Role[0].id === 0) {
            if (req.body.Sale !== null) {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    'Manager.id': req.body.Sale,
                    Center: { $ne: null }
				}
				} else {
                query = {
                    Regdayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    Center: { $ne: null }
				}
			}
			} else {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
				},
                'Manager.id': req.body.Username,
                Center: { $ne: null }
			}
		}
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('SearchS ' + err);
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response)
				} else {
                if (data.length > 0) {
                    var send = [];
                    data.forEach(element => {
                        if (element.Center[0].id !== null) {
                            send.push(element);
						}
					});
                    response = { 'error_code': 0, 'students': send };
					} else {
                    response = { 'error_code': 2, 'message': 'list is empty' };
				}
                res.status(200).json(response)
			}
		})
	},
    SearchC: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Cday !== null) {
            firstDay = req.body.Cday;
		}
		
        if (req.body.Cday2 !== null) {
            today = req.body.Cday2;
		}
		
        // kiểm tra cho admin
        if (req.body.Role[0].id === 0) {
            if (req.body.Sale !== null) {
                query = {
                    Appointment_dayiso: {
                        $gte: firstDay,
                        $lte: today
					},
                    'Manager.id': req.body.Sale
				}
				} else {
                query = {
                    Appointment_dayiso: {
                        $gte: firstDay,
                        $lte: today
					}
				}
			}
			} else {
            // cho user khác
            query = {
                Appointment_dayiso: {
                    $gte: firstDay,
                    $lte: today
				},
                'Manager.id': req.body.Username
			}
		}
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('SearchS ' + err);
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response)
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
	
    //kết thúc tìm kiếm
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
			firstDay = req.body.Fromday;
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
			firstDay =  req.body.Fromday;
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
                Isupdate: false,
                'Duplicate': null
			}
		}
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
				},
                'Manager.id': req.body.Username,
                Isupdate: false,
                'Duplicate': null
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
                Isupdate: false,
                'Duplicate': null
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
                Isupdate: false,
                'Duplicate': null
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
                $and: [{
                        $or: [{
                            'Time_recall': {
                               $ne:null
							}
							}, {
                            Recall: true
						}]
					}]
			}
		}
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
				},
                'Manager.id': req.body.Username,
                $and: [{
                        $or: [{
                            'Time_recall': {
                               $ne:null
							}
							}, {
                            Recall: true
						}]
					}]
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
                $and: [{
                        $or: [{
                            'Time_recall': {
                               $ne:null
							}
							}, {
                            Recall: true
						}]
					}]
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
                $and: [{
                        $or: [{
                            'Time_recall': {
                               $ne:null
							}
							}, {
                            Recall: true
						}]
					}]
			}
		}
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetdetailRecall ' + err);
				} else {
                if (data.length > 0) {
					var recall = [];
					data.forEach( element => {
						if(element.Center === null){
							recall.push(element);
						}else{
							if(element.Center[0].id === null){
								recall.push(element);
							}
						}
					})

                    response = { 'error_code': 0, 'recall': recall };
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
                'Manager.id': req.body.Username,
                'Duplicate': null
			}
		}
        if (req.body.Fromday !== null && req.body.Today === null) {
            query = {
                Regdayiso: {
                    $gte: dateFormat(new Date(), req.body.Fromday),
                    $lte: dateFormat(new Date(), today)
				},
                'Manager.id': req.body.Username,
                'Duplicate': null
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
                'Duplicate': null
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
                'Duplicate': null
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
	},
    Gettq: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Fromday !== null && req.body.Today !== null) {
            firstDay = req.body.Fromday;
            today = req.body.Today;
		}
		
        if (req.body.Fromday !== null && req.body.Today === null) {
            firstDay = req.body.Fromday
		}
		
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
		}
		
        if (req.body.TheForm !== null) {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
				},
                'Manager.mid': req.body.Username,
                'Manager.sheetId': req.body.TheForm
			}
			} else {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
				},
                'Manager.mid': req.body.Username
			}
		}
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetLh ' + err);
				} else {
				var Teamname;
				function getUsers(user, callback){
					var data = '';
					auth_model.findOne({Username:user},function(err, success){
						if (err){}
						if (!success){
							//when data not found
							data = 'null';
							}else{
							//when data found
							data = 'found'; 
						}
						callback && callback(success);
					});
				}
				
				getUsers(req.body.Username, function(data) {
					Teamname = data.Zone;
				});
				
				setTimeout(function () {
					
					if (data.length > 0) {
						
						let _on = data.length;
						let _reg = [];
						let _dup = [];
						let _ktn = [];
						
						data.forEach(element => {
							if (element.Status_student[0].id === 3) {
								_reg.push(element);
							}
							
							if (element.Duplicate !== null) {
								_dup.push(element);
							}
							
							if (element.Status_student[0].id === 1) {
								_ktn.push(element);
							}
						});
						
						
						let mkt =
						{
							Name: data[0].Manager[0].mname,
							User: data[0].Manager[0].mid,
							Team: Teamname,
							On: _on,
							Reg: _reg,
							Dup: _dup,
							Ktn: _ktn
						}
						
						response = { 'error_code': 0, 'mkt': mkt };
						res.status(200).json(response);
						} else {
						
						let mkt =
						{
							Name: req.body.Fullname,
							User: req.body.Username,
							Team: Teamname,
							On: 0,
							Reg: [],
							Dup: [],
							Ktn: []
						}
						
						response = { 'error_code': 0, 'mkt': mkt };
						res.status(200).json(response);
					}
					
				}, 200)
			}
		})
	},
    Getrating: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Fromday !== null && req.body.Today !== null) {
            firstDay = req.body.Fromday;
            today = req.body.Today;
		}
		
        if (req.body.Fromday !== null && req.body.Today === null) {
            firstDay = req.body.Fromday
		}
		
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
		}
		
		query = {
			Regdayiso: {
				$gte: firstDay,
				$lte: today
			},
			'Center._id': req.body.Center._id
		}
		
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetLh ' + err);
				} else {

					if (data.length > 0) {
						
						let _on = data.length;
						let _reg = [];
						let _ktn = [];
						
						data.forEach(element => {
							if (element.Status_student[0].id === 3) {
								_reg.push(element);
							}
							
							
							if (element.Status_student[0].id === 1) {
								_ktn.push(element);
							}
						});
						
						
						let mkt =
						{
							Name: data[0].Manager[0].mname,
							User: data[0].Manager[0].mid,
							Team: req.body.Center.Name,
							On: _on,
							Reg: _reg,
							Ktn: _ktn
						}
						
						response = { 'error_code': 0, 'mkt': mkt };
						res.status(200).json(response);
						} else {
						
						let mkt =
						{
							Name: req.body.Fullname,
							User: req.body.Username,
							Team: req.body.Center.Name,
							On: 0,
							Reg: [],
							Ktn: []
						}
						
						response = { 'error_code': 0, 'mkt': mkt };
						res.status(200).json(response);
					}

			}
		})
	},
	GetSrating: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Fromday !== null && req.body.Today !== null) {
            firstDay = req.body.Fromday;
            today = req.body.Today;
		}
		
        if (req.body.Fromday !== null && req.body.Today === null) {
            firstDay = req.body.Fromday
		}
		
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
		}
		
        if (req.body.Username !== null) {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
				},
                'Manager.id': req.body.Username,
			}
			} else {
            query = {
                Regdayiso: {
                    $gte: firstDay,
                    $lte: today
				},
                'Manager.id': req.body.Username
			}
		}
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetSrating ' + err);
				} else {
				var Teamname;
				function getUsers(user, callback){
					var data = '';
					auth_model.findOne({Username:user},function(err, success){
						if (err){}
						if (!success){
							//when data not found
							data = 'null';
							}else{
							//when data found
							data = 'found'; 
						}
						callback && callback(success);
					});
				}
				
				getUsers(req.body.Username, function(data) {
					Teamname = data.Zone;
				});
				
				setTimeout(function () {
					
					if (data.length > 0) {
						
						let _on = data.length;
						let _reg = [];
						let _ktn = [];
						let _khoa = 0;
						
						data.forEach(element => {
							if (element.Status_student[0].id === 3) {
								_reg.push(element);
							}
							
							
							if (element.Status_student[0].id === 1) {
								_ktn.push(element);
							}
							
							if(element.Course !== undefined){
								if(element.Course !== null){
									_khoa = _khoa + element.Course;
								}
							}
						});
						
						
						let user =
						{
							Name: data[0].Manager[0].name,
							User: data[0].Manager[0].id,
							Team: Teamname,
							On: _on,
							Reg: _reg,
							Ktn: _ktn,
							Khoa: _khoa
						}
						
						response = { 'error_code': 0, 'user': user };
						res.status(200).json(response);
						} else {
						
						let user =
						{
							Name: req.body.Fullname,
							User: req.body.Username,
							Team: Teamname,
							On: 0,
							Reg: [],
							Ktn: [],
							Khoa: 0
						}
						
						response = { 'error_code': 0, 'user': user };
						res.status(200).json(response);
					}
					
				}, 200)
			}
		})
	},
	GetSCenter: function (req, res) {
        var query;
        var firstDay = getFirstDateOfMonth();
        var today = dateFormat(new Date(), "yyyy-mm-dd");
		
        if (req.body.Fromday !== null && req.body.Today !== null) {
            firstDay = req.body.Fromday;
            today = req.body.Today;
		}
		
        if (req.body.Fromday !== null && req.body.Today === null) {
            firstDay = req.body.Fromday
		}
		
        if (req.body.Fromday === null && req.body.Today !== null) {
            today = req.body.Today;
		}
		
		query = {
			Regdayiso: {
				$gte: firstDay,
				$lte: today
			},
			'Center._id': req.body.Center._id
		}
		
        student_model.find(query, function (err, data) {
            if (err) {
                console.log('GetSrating ' + err);
				} else {
				// var Teamname;
				// function getUsers(user, callback){
				// var data = '';
				// auth_model.findOne({Username:user},function(err, success){
				// if (err){}
				// if (!success){
				// //when data not found
				// data = 'null';
				// }else{
				// //when data found
				// data = 'found'; 
				// }
				// callback && callback(success);
				// });
				// }
				
				// getUsers(req.body.Username, function(data) {
				// Teamname = data.Zone[0].name;
				// });
				
				// setTimeout(function () {
				
				if (data.length > 0) {
					
					let _on = data.length;
					let _reg = [];
					let _ktn = [];
					let _khoa = 0;
					
					data.forEach(element => {
						if (element.Status_student[0].id === 3) {
							_reg.push(element);
						}
						
						
						if (element.Status_student[0].id === 1) {
							_ktn.push(element);
						}
						
						if(element.Course !== undefined){
							if(element.Course !== null){
								_khoa = _khoa + element.Course;
							}
						}
					});
					
					
					let user =
					{
						Name: data[0].Manager[0].name,
						User: data[0].Manager[0].id,
						Team: req.body.Center.Name,
						On: _on,
						Reg: _reg,
						Ktn: _ktn,
						Khoa: _khoa
					}
					
					response = { 'error_code': 0, 'user': user };
					res.status(200).json(response);
					} else {
					
					let user =
					{
						Name: req.body.Fullname,
						User: req.body.Username,
						Team: req.body.Center.Name,
						On: 0,
						Reg: [],
						Ktn: [],
						Khoa: 0
					}
					
					response = { 'error_code': 0, 'user': user };
					res.status(200).json(response);
				}
				
				// }, 200)
				
			}
		})
	}
}