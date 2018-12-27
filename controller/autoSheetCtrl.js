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

function isoDay(day) {
	var parts = day.split("/");
	iday = parseInt(parts[0]) + 1;
	return parts[1] + '-' + parts[0] + '-' + parts[2];
}

function checkPhoneNumber(phone) {
	let phoneChecked;
	if (phone.charAt(0) === '0') {
		phoneChecked = phone.substr(1);
	} else {
		if (phone.substring(0, 2) === '84') {
			phoneChecked = phone.substr(2);
		} else {
			phoneChecked = phone;
		}
	}
	return phoneChecked;
}

function getFirstName(name) {
	return name.substring(0, name.lastIndexOf(" ") + 1);
}

function getLastName(name) {
	return name.substring(name.lastIndexOf(" ") + 1, name.length);
}

function getDayReg(day) {
	return day.substring(0, day.lastIndexOf(" ") + 1);
}

function getTimeReg(day) {
	return day.substring(day.lastIndexOf(" ") + 1, day.length);
}

function getYesterdaysDate() {
	var date = new Date();
	date.setDate(date.getDate() - 1);
	return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}
// kiểm tra và cập nhật khóa học cho học viên
function CheckAndUpdateCourse(id) {
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
								autosheet_model.find({
									'Status_student.id': 3
								}, function (err, data) {
									if (err) {
										console.log('Get reg student ' + err);
									} else {
										if (data.length > 0) {
											data.forEach(element => {
												let j = 0;
												rows.forEach(el => {
													if (element.Phone === el.phone) {
														j++;
														if (j >= 2) {
															element.Course = 2;
															element.save(function (err) {
																if (err) {
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
	var query = {
		'Role.id': 1,
		'Status_user.id': 1,
		'Zone.id': _id
	};
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

	}).sort({
		'Student_in_month.Total': 1
	});
}

// reset student trong tháng mỗi đầu tháng
function reset_student(_m) {
	auth_model.find({
		'Role.id': 1,
		'Status_user.id': 1
	}, function (err, data) {
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
	auth_model.findOne({
		Username: Username
	}, function (err, data) {
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
	let checkPhone = checkPhoneNumber(stude.sốđiệnthoại);
	let firstName = getFirstName(stude.họtên);
	let lastName = getLastName(stude.họtên);

	autosheet_model.find({
		Phone: checkPhone
	}, function (err, data) {
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
						Fistname: firstName,
						Lastname: lastName,
						Fullname: stude.họtên,
						Email: stude.email,
						Phone: checkPhone,
						Sex: null,
						Address: null,
						Regday: dayreg,
						Regdayiso: isoday,
						Regday2: null,
						Regtime: timereg,
						Dayenrollment: null,
						Note: stude.sốđiệnthoại,
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
			} else if (data.length === 1) {

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
						gtele: tele.Zone[0].id,
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
							Fistname: firstName,
							Lastname: lastName,
							Fullname: stude.họtên,
							Email: stude.email,
							Phone: checkPhone,
							Sex: null,
							Address: null,
							Regday: dayreg,
							Regdayiso: isoday,
							Regday2: null,
							Regtime: timereg,
							Dayenrollment: null,
							Note: stude.sốđiệnthoại,
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
								gtele: tele.Zone[0].id,
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
									Fistname: firstName,
									Lastname: lastName,
									Fullname: stude.họtên,
									Email: stude.email,
									Phone: checkPhone,
									Sex: null,
									Address: null,
									Regday: dayreg,
									Regdayiso: isoday,
									Regday2: null,
									Regtime: timereg,
									Dayenrollment: null,
									Note: stude.sốđiệnthoại,
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
								gtele: tele.Zone[0].id,
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
									Fistname: firstName,
									Lastname: lastName,
									Fullname: stude.họtên,
									Email: stude.email,
									Phone: checkPhone,
									Sex: null,
									Address: null,
									Regday: dayreg,
									Regdayiso: isoday,
									Regday2: null,
									Regtime: timereg,
									Dayenrollment: null,
									Note: stude.sốđiệnthoại,
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
	group_model.find({
		Sheet: {
			$ne: null
		}
	}, function (err, data) {
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
						autosheet_model.find({
							'Manager.id': data[i].Username,
							'Status_student.id': 3
						}, function (err, _data) {
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
								data[i].save(function (err) {})
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
								data[i].save(function (err) {})
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
	var query = {
		'Role.id': 1,
		'Status_user.id': 1,
		'Zone.id': _id
	};
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
	}).sort({
		'Student_in_month.InByday': -1
	});
}

// lấy list user telesale
function get_list_tele_5() {
	var query = {
		'Role.id': 1,
		'Status_user.id': 1
	};
	auth_model.find(query, function (err, data) {
		if (err) {
			console.log('get_telesale ' + err);
		} else {
			checkGroup5(data);
		}
	}).sort({
		'Student_in_month.In': -1
	});
}

function checkGroup5(user) {
	group_model.find({
		Sheet: {
			$ne: null
		}
	}, function (err, data) {
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
										} else if ((user * 2) > u && u < user) {
											index = Math.random() * (user - 0) + 0;
											setTimeout(function () {
												rows[i].move = "moved";
												rows[i].save();
												get_list_tele_for_st(rows[i], _id.toString(), list.sheet, list.mid, list.mname, index);
											}, 1000 * i)
											++u;
										} else {
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
	return parts[0] + '' + parts[1] + '' + parts[2]; ;
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
										autosheet_model.findOne({
											Phone: rows[i].phone
										}, function (err, data) {
											if (err) {
												console.log('Get reg student ' + err);
											} else {
												if (data !== null) {
													let _status = {
														name: "Đã đăng ký",
														id: 3
													}
													if (data.Status_student[0].id !== 3) {
														data.Status_student = [_status];
														data.Dayenrollment = today;
														data.Course = 1;
														data.save(function (err) {
															if (err) {
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
	center_model.find({
		SheetId: center.id
	}, function (err, data) {
		if (err) {
			console.log('insertcenter ' + err);
		} else {
			if (data.length === 0) {
				let thecenter = new center_model({
						SheetId: center.id,
						Name: center.tênđầyđủ,
						Id: center.viếttắt,
						Info: center.thôngtinchitiết
					});
				thecenter.save(function (err) {
					if (err) {
						console.log(err);
					}
				})
			} else {
				data[0].SheetId = center.id;
				data[0].Name = center.tênđầyđủ;
				data[0].Id = center.viếttắt;
				data[0].Info = center.thôngtinchitiết;

				data[0].save(function (err) {
					if (err) {
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
var a = false;
schedule.scheduleJob('*/10 * * * * *', function () {

	// var d = new Date();
	// myday = d.getDate();

	// if (myday > 5) {
		// get_list_tele_5();
	// } else {
		// checkGroup();
	// }
	if(a === false){
		getOldSheet('1QWR5sKiXeKIgg3ARUmj3ziqmzHpmDnhlurt03gOH3l0');
		a = true;
	}
})

// import from old data
function getOldSheet(idSheet) {
	var doc = new GoogleSpreadsheet(idSheet);
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
						sheet = info.worksheets[2];
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
											insertOldStudent(rows[i]);
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

function insertOldStudent(stude) {
	let checkPhone = checkPhoneNumber(stude.phone);
	let firstName = getFirstName(stude.fullname);
	let lastName = getLastName(stude.fullname);

	// autosheet_model.find({ Phone: checkPhone }, function (err, data) {
	// if (err) {
	// console.log('insertOldStudent ' + err);
	// } else {

	// if (data.length === 0) {
	// let dayreg = getDayReg(stude.ngaydangky);
	isoday = isoDay(stude.ngaydangky);
	let baodanhday = null;
	if(stude.ngaybaodanh !== ''){
		baodanhday = isoDay(stude.ngaybaodanh);
	}
	
	
	isodayHen = null;
	if(stude.ngayhen !== ''){
		isodayHen = isoDay(stude.ngayhen);
	}
	
	// let timereg = getTimeReg(stude.ngaydangky);
	let timereg = null;
	let manager = {
		id: stude.telesaleuser,
		name: stude.telesalename,
		sheetId: stude.sheetID,
		gtele: stude.groupid,
		mid: stude.makertinguser,
		mname: stude.makertingname
	}

	let status_student;
	switch (parseInt(stude.trangthai)) {
	case 1:
		status_student = {
			id: 1,
			name: 'Không tiềm năng'
		}
		break;
	case 2:
		status_student = {
			id: 2,
			name: 'Đến chưa đăng ký'
		}
		break;
	case 3:
		status_student = {
			id: 3,
			name: 'Đã đăng ký'
		}
		break;
	default:
		status_student = {
			id: 0,
			name: 'Chưa đăng ký'
		}
	}

	let sex;
	switch (parseInt(stude.gioitinh)) {
	case 1:
		sex = {
			id: 1,
			name: 'Nam'
		}
		break;
	default:
		sex = {
			id: 0,
			name: 'Nữ'
		}
	}

	// kiểm tra giờ hẹn
	let giohen = null;
	switch (parseInt(stude.giohen)) {
	case 1:
		giohen = {
			id: 1,
			name: '8:00'
		}
		break;
	case 2:
		giohen = {
			id: 2,
			name: '8:30'
		}
		break;
	case 3:
		giohen = {
			id: 3,
			name: '9:00'
		}
		break;
	case 4:
		giohen = {
			id: 4,
			name: '9:30'
		}
		break;
	case 5:
		giohen = {
			id: 5,
			name: '10:00'
		}
		break;
	case 6:
		giohen = {
			id: 6,
			name: '10:30'
		}
		break;
	case 7:
		giohen = {
			id: 7,
			name: '11:00'
		}
		break;
	case 8:
		giohen = {
			id: 8,
			name: '11:30'
		}
		break;
	case 9:
		giohen = {
			id: 9,
			name: '12:00'
		}
		break;
	case 10:
		giohen = {
			id: 10,
			name: '12:30'
		}
		break;
	case 11:
		giohen = {
			id: 11,
			name: '13:00'
		}
		break;
	case 12:
		giohen = {
			id: 12,
			name: '13:30'
		}
		break;
	case 13:
		giohen = {
			id: 13,
			name: '14:00'
		}
		break;
	case 14:
		giohen = {
			id: 14,
			name: '14:30'
		}
		break;
	case 15:
		giohen = {
			id: 15,
			name: '15:00'
		}
		break;
	case 16:
		giohen = {
			id: 16,
			name: '15:30'
		}
		break;
	case 17:
		giohen = {
			id: 17,
			name: '16:00'
		}
		break;
	case 18:
		giohen = {
			id: 18,
			name: '16:30'
		}
		break;
	case 19:
		giohen = {
			id: 19,
			name: '17:00'
		}
		break;
	case 20:
		giohen = {
			id: 20,
			name: '17:30'
		}
		break;
	case 21:
		giohen = {
			id: 21,
			name: '18:00'
		}
		break;
	case 22:
		giohen = {
			id: 22,
			name: '18:30'
		}
		break;
	case 23:
		giohen = {
			id: 23,
			name: '19:00'
		}
		break;
	case 24:
		giohen = {
			id: 24,
			name: '19:30'
		}
		break;
	case 25:
		giohen = {
			id: 25,
			name: '20:00'
		}
		break;
	case 26:
		giohen = {
			id: 26,
			name: '20:30'
		}
		break;
	default:
		giohen = {
			id: 27,
			name: '21:00'
		}
	}

	var trungtam = null;
	if (parseInt(stude.trungtam) === 1) {
		trungtam = [{
				_id: stude.trungtam_id,
				SheetId: stude.trungtamsheetid,
				Name: stude.trungtamname,
				Id: stude.trungtamId,
				Info: stude.trungtaminfo
			}
		]
	}

	var goilai = false;
	if (parseInt(stude.goilai) === 1) {
		goilai = true;
	}

	timeRecal = null;
	let giogoilai;
	switch (parseInt(stude.thoigiangoilai)) {
	case 1:
		giogoilai = {
			id: 1,
			name: '8:00'
		}
		break;
	case 2:
		giogoilai = {
			id: 2,
			name: '8:30'
		}
		break;
	case 3:
		giogoilai = {
			id: 3,
			name: '9:00'
		}
		break;
	case 4:
		giogoilai = {
			id: 4,
			name: '9:30'
		}
		break;
	case 5:
		giogoilai = {
			id: 5,
			name: '10:00'
		}
		break;
	case 6:
		giogoilai = {
			id: 6,
			name: '10:30'
		}
		break;
	case 7:
		giogoilai = {
			id: 7,
			name: '11:00'
		}
		break;
	case 8:
		giogoilai = {
			id: 8,
			name: '11:30'
		}
		break;
	case 9:
		giogoilai = {
			id: 9,
			name: '12:00'
		}
		break;
	case 10:
		giogoilai = {
			id: 10,
			name: '12:30'
		}
		break;
	case 11:
		giogoilai = {
			id: 11,
			name: '13:00'
		}
		break;
	case 12:
		giogoilai = {
			id: 12,
			name: '13:30'
		}
		break;
	case 13:
		giogoilai = {
			id: 13,
			name: '14:00'
		}
		break;
	case 14:
		giogoilai = {
			id: 14,
			name: '14:30'
		}
		break;
	case 15:
		giogoilai = {
			id: 15,
			name: '15:00'
		}
		break;
	case 16:
		giogoilai = {
			id: 16,
			name: '15:30'
		}
		break;
	case 17:
		giogoilai = {
			id: 17,
			name: '16:00'
		}
		break;
	case 18:
		giogoilai = {
			id: 18,
			name: '16:30'
		}
		break;
	case 19:
		giogoilai = {
			id: 19,
			name: '17:00'
		}
		break;
	case 20:
		giogoilai = {
			id: 20,
			name: '17:30'
		}
		break;
	case 21:
		giogoilai = {
			id: 21,
			name: '18:00'
		}
		break;
	case 22:
		giogoilai = {
			id: 22,
			name: '18:30'
		}
		break;
	case 23:
		giogoilai = {
			id: 23,
			name: '19:00'
		}
		break;
	case 24:
		giogoilai = {
			id: 24,
			name: '19:30'
		}
		break;
	case 25:
		giogoilai = {
			id: 25,
			name: '20:00'
		}
		break;
	case 26:
		giogoilai = {
			id: 26,
			name: '20:30'
		}
		break;
	default:
		giogoilai = {
			id: 27,
			name: '21:00'
		}
	}
	
	if (parseInt(stude.goilai) === 1) {
		timeRecal = [{
				day: stude.ngaygoilai,
				time: [giogoilai]
			}
		]
	}

	let trungdata = null;
	let diffDays = null;
	switch(parseInt(stude.thoigiantrung)){
		case 1: 
			diffDays = 30;
			break;
		case 2: 
			diffDays = 60;
			break;
		case 3: 
			diffDays = 90;
			break;
	}
	if (parseInt(stude.trung) === 1) {
		trungdata = {
			preid: stude.userteletruoc,
			prename: stude.nameteletruoc,
			premid: stude.usermarkettruoc,
			premname: stude.namemarkettruoc,
			msheetid: data[0].Manager[0].sheetId,
			pretime: stude.thoigiandangky,
			alert: true,
			time: diffDays
		}
	}

	let khoahoc;
	switch(parseInt(stude.khoahoc)){
		case 1: 
			khoahoc = 2;
			break;
		case 2: 
			khoahoc = 3;
			break;
		default:
			khoahoc = 0;
	}
	
	let diachi;
	switch (parseInt(stude.diachi)) {
	case 1:
		diachi = {
			id: 1,
			name: 'Quận 1'
		}
		break;
	case 2:
		diachi = {
			id: 2,
			name: 'Quận 2'
		}
		break;
	case 3:
		diachi = {
			id: 3,
			name: 'Quận 3'
		}
		break;
	case 4:
		diachi = {
			id: 4,
			name: 'Quận 4'
		}
		break;
	case 5:
		diachi = {
			id: 5,
			name: 'Quận 5'
		}
		break;
	case 6:
		diachi = {
			id: 6,
			name: 'Quận 6'
		}
		break;
	case 7:
		diachi = {
			id: 7,
			name: 'Quận 7'
		}
		break;
	case 8:
		diachi = {
			id: 8,
			name: 'Quận 8'
		}
		break;
	case 9:
		diachi = {
			id: 9,
			name: 'Quận 9'
		}
		break;
	case 10:
		diachi = {
			id: 10,
			name: 'Quận 10'
		}
		break;
	case 11:
		diachi = {
			id: 11,
			name: 'Quận 11'
		}
		break;
	case 12:
		diachi = {
			id: 12,
			name: 'Quận 12'
		}
		break;
	case 13:
		diachi = {
			id: 13,
			name: 'Quận Thủ Đức'
		}
		break;
	case 14:
		diachi = {
			id: 14,
			name: 'Quận Gò Vấp'
		}
		break;
	case 15:
		diachi = {
			id: 15,
			name: 'Quận Bình Thạnh'
		}
		break;
	case 16:
		diachi = {
			id: 16,
			name: 'Quận Tân Bình'
		}
		break;
	case 17:
		diachi = {
			id: 17,
			name: 'Quận Tân Phú'
		}
		break;
	case 18:
		diachi = {
			id: 18,
			name: 'Quận Phú Nhuận'
		}
		break;
	case 19:
		diachi = {
			id: 19,
			name: 'Quận Bình Tân'
		}
		break;
	case 20:
		diachi = {
			id: 20,
			name: 'Huyện Củ Chi'
		}
		break;
	case 21:
		diachi = {
			id: 21,
			name: 'Huyện Hóc Môn'
		}
		break;
	case 22:
		diachi = {
			id: 22,
			name: 'Huyện Bình Chánh'
		}
		break;
	case 23:
		diachi = {
			id: 23,
			name: 'Huyện Nhà Bè'
		}
		break;
	case 24:
		diachi = {
			id: 24,
			name: 'Huyện Cần Giờ'
		}
		break;
	case 25:
		diachi = {
			id: 25,
			name: 'Đồng Nai'
		}
		break;
	case 26:
		diachi = {
			id: 26,
			name: 'Bình Dương'
		}
		break;
	case 27:
		diachi = {
			id: 27,
			name: 'Đà Nẵng'
		}
		break;
	default:
		diachi = {
			id: 28,
			name: 'Khác'
		}
	}
	
	let student = new autosheet_model({
			IdforFrend: mongoose.Types.ObjectId(),
			Id_sheet: stude.sheetID,
			Fistname: firstName,
			Lastname: lastName,
			Fullname: stude.fullname,
			Email: stude.email,
			Phone: checkPhone,
			Sex: sex,
			Address: diachi,
			Regday: stude.ngaydangky,
			Regdayiso: isoday,
			Regday2: null,
			Regtime: timereg,
			Dayenrollment: baodanhday,
			Note: stude.note,
			SMS: null,
			Center: trungtam,
			Time_recall: timeRecal,
			Recall: goilai,
			Appointment_day: stude.ngayhen,
			Appointment_dayiso: isodayHen,
			Appointment_time: giohen,
			Status_student: status_student,
			ListFriend: null,
			Manager: manager,
			Isupdate: true,
			Duplicate: trungdata,
			Course: khoahoc,
			EditHistory: null
		});
	student.save(function (err) {
		if (err) {
			console.log('save student ' + err)
		} else {
			// update_total_for_tele(tele.nsername);
		}
	})
	// }
	// }
	// });
}
