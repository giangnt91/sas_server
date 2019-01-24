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
	if (parseInt(parts[0]) < 30) {
		iday = parseInt(parts[0]) + 1;
	} else {
		iday = parts[0];
	}

	return parts[1] + '-' + iday + '-' + parts[2];
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

				setTimeout(() => {
					checkDuplication(student, data[0], sheet_id, mid, mname, _day);
				}, 1000)

				// insertStudent(student, data[0], sheet_id, mid, mname, _day);
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

				isoday = isoDay(dayreg);
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

					isoday = isoDay(dayreg);
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

						isoday = isoDay(dayreg);
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
				}, async function (err, rows) {
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
				data.forEach(async element => {
					for (let i = 0; i < element.Sheet.length; i++) {
						// setTimeout(function () {
						let tmp = {
							idgroup: element._id,
							sheet: element.Sheet[i].id,
							mid: element.Sheet[i].muser,
							mname: element.Sheet[i].name
						}
						await getSheet(tmp);
						// }, i * 3000)
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
	auth_model.find(query, async function (err, data) {
		if (err) {
			console.log('CheckStudentIn: ' + err)
		} else {
			if (data.length > 0) {
				for (let i = 0; i < data.length; i++) {
					// setTimeout(function () {
					await autosheet_model.find({
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
							data[i].save(function (err) { })
						}
					})

					// }, i * 2000)
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

	auth_model.find(query, async function (err, data) {
		if (err) {
			console.log('CheckStudentIn: ' + err)
		} else {
			if (data.length > 0) {
				for (let i = 0; i < data.length; i++) {
					// setTimeout(function () {
					var query_2 = {
						'Manager.id': data[i].Username,
						'Status_student.id': 3,
						'Dayenrollment': dateFormat(new Date(), last_day)
					}

					await autosheet_model.find(query_2, function (err, _data) {
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

					// }, i * 2000)
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
				setTimeout(() => {
					checkDuplication(student, data[index], sheet_id, mid, mname, _day);
				}, 1000)
				// checkDuplication(student, data[index], sheet_id, mid, mname, _day);
				// insertStudent(student, data[index], sheet_id, mid, mname, _day);
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
				data.forEach(async element => {
					for (let i = 0; i < element.Sheet.length; i++) {
						// setTimeout(function () {
						let tmp = {
							idgroup: element._id,
							sheet: element.Sheet[i].id,
							mid: element.Sheet[i].muser,
							mname: element.Sheet[i].name
						}
						await getSheet5(tmp, user.length);
						// }, i * 3000)
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
				}, async function (err, rows) {
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
				}, async function (err, rows) {
					if (rows !== undefined && rows !== null) {
						if (rows.length > 0) {
							//lấy danh sách học viên mới
							for (let i = 0; i < rows.length; i++) {
								// setTimeout(function () {
								var today = dateFormat(new Date(), "yyyy-mm-dd");
								await autosheet_model.findOne({
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
								// }, 1000 * i)
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
				}, async function (err, rows) {
					if (rows !== undefined && rows !== null) {
						if (rows.length > 0) {
							//lấy danh sách học viên mới
							for (let i = 0; i < rows.length; i++) {
								// setTimeout(function () {
								await insertCenter(rows[i]);
								// }, 1000 * i)
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

	var d = new Date();
	myday = d.getDate();

	if (myday > 5) {
		get_list_tele_5();
	} else {
		checkGroup();
	}
	if (a === false) {
		// getOldSheet('1cLJyvMeVExYspXt9agq9nZDPng4JLlunSGAJUe5jocg');
		// updateCenter();
		a = true;
	}
})

//update info trung tâm
function updateCenter() {
	autosheet_model.find({}, function (err, data) {
		data.forEach(function (element, index) {
			if (element.Appointment_day === '') {
				element.Appointment_day = null;
				element.save(function (err) {
					if (err) {
						console.log('update Appointment_day bi loi: ' + index);
					} else {
						console.log(index);
					}
				})

			}
			// if (element.Center !== null) {
			// switch (element.Center[0].SheetId) {
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d6ua4':
			// center = [{
			// _id: '5bae3d255cc51dfc0538a3ec',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d6ua4',
			// Name: '30/4 CT',
			// Info: '432 - 434 đường 30/4, phường Hưng Lợi, quận Ninh Kiều. Nếu gặp khó khăn trong việc tìm đường, vui lòng liên hệ hotline: 0902351898 - 0901301898',
			// Id: '304CT'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 1');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/clrrx':
			// center = [{
			// _id: '5bae3d165cc51dfc0538a3dd',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/clrrx',
			// Name: '79 DIS 7',
			// Info: '149 Đường 79, p Tân Quy, Q7. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0903166994 - 0902877885',
			// Id: 'DIS7'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 2');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cre1l':
			// center = [{
			// _id: '5bae3d125cc51dfc0538a3d9',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cre1l',
			// Name: 'bác ái',
			// Info: '19 Bác Ái, p Bình Thọ, Q. Thủ Đức. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0908886930 - 0965512160',
			// Id: 'BA'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 3');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cokwr':
			// center = [{
			// _id: '5bae3d105cc51dfc0538a3d7',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cokwr',
			// Name: 'bạch đằng',
			// Info: '234/3A Bạch Đằng, p24, Q. Bình Thạnh. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0901252121 - 0938561660.',
			// Id: 'BD'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 4');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d180g':
			// center = [{
			// _id: '5bae3d195cc51dfc0538a3e0',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d180g',
			// Name: 'Bàu Cát',
			// Info: '261 Bàu Cát, p12, Tân Bình ( phia ngoai logo English4u). Neu gap kho khan trong viec tim duong, vui long lien he hotline: 0906305898 - 0901371898',
			// Id: 'BC'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 5');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/db1zf':
			// center = [{
			// _id: '5bae3d205cc51dfc0538a3e7',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/db1zf',
			// Name: 'Biên Hòa',
			// Info: '314/37 Phạm Văn Thuận, Thống Nhất, Biên Hoà ( phia ngoai logo English4u) . Neu gap kho khan trong viec tim duong, vui long lien he hotline: 0902861898',
			// Id: 'PVT'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 6');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d9ney':
			// center = [{
			// _id: '5bae3d1f5cc51dfc0538a3e6',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d9ney',
			// Name: 'Chánh Nghĩa',
			// Info: '96 đường D3a, khu dân cư Chánh Nghĩa, tp.Thủ Dầu Một , Bình Dương. Neu gap kho khan trong viec tim duong, vui long lien he hotline: 0902550898 - 0962004647',
			// Id: 'CN'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 7');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dcgjs':
			// center = [{
			// _id: '5bae3d215cc51dfc0538a3e8',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dcgjs',
			// Name: 'Đà Nẵng',
			// Info: '84 Nguyễn Hữu Dật, phường Hoà Cường Bắc, Quận Hải Châu, Đa Nang. Neu gap kho khan trong viec tim duong, vui long lien he hotline: 090 198 38 80',
			// Id: 'HC'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 8');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cx0b9':
			// center = [{
			// _id: '5bae3d1e5cc51dfc0538a3e5',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cx0b9',
			// Name: 'Đại Lộ Bình Dương',
			// Info: '530 Đại lộ Bình Dương, tp.Thủ Dầu Một , Bình Dương. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0902723898 - 0902311898',
			// Id: 'DLBD'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 9');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d415a':
			// center = [{
			// _id: '5bae3d235cc51dfc0538a3ea',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d415a',
			// Name: 'Điện Biên Phủ',
			// Info: 'P2 Ung Van Khiem , phuong 25 quan Binh Thanh ( doan giao Ung Van Khiem - Dien Bien Phu, gan chan cau Sai Gon). Neu gap kho khan trong viec tim duong, vui long lien he 0903761898',
			// Id: 'DBP'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 10');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cssly':
			// center = [{
			// _id: '5bae3d1b5cc51dfc0538a3e2',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cssly',
			// Name: 'Hoa Lan',
			// Info: '82 Hoa Lan, Phường 02, Quận Phú Nhuận, TP Hồ Chí Minh. Nếu gặp khó khăn trong việc tìm dương, vui lòng liên hệ hotline 0906742898 - 0906834898',
			// Id: 'HL'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 11');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cpzh4':
			// center = [{
			// _id: '5bae3d115cc51dfc0538a3d8',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cpzh4',
			// Name: 'lạc long quân',
			// Info: '423/30 Lạc Long Quan, p5. Q11. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0902914115 - 0931461614',
			// Id: 'LLQ'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 12');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/chk2m':
			// center = [{
			// _id: '5bae3d135cc51dfc0538a3da',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/chk2m',
			// Name: 'Lê Hồng Phong',
			// Info: '781/A12 Lê Hồng Phong, p12, Q10. Neu gap kho khan trong viec tim duong, vui long lien he hotline: - 0963305178 - 0963241724',
			// Id: 'LHP'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 13');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cu76f':
			// center = [{
			// _id: '5bae3d1c5cc51dfc0538a3e3',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cu76f',
			// Name: 'Lê Văn Việt',
			// Info: '431A Lê Văn Việt, p Tăng Nhơn Phú, quận 9. Neu gap kho khan trong viec tim duong, vui long lien he hotline: 0902673898 - 0903125898',
			// Id: 'LVV'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 14');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d2mkx':
			// center = [{
			// _id: '5bae3d1a5cc51dfc0538a3e1',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d2mkx',
			// Name: 'Lý Chiêu Hoàng',
			// Info: '127D Lý Chiêu Hoàng, phường 10, Q6 ( phia ngoai logo English4u). Neu gap kho khan trong viec tim duong, vui long lien he hotline: 0909712898 - 0902916898',
			// Id: 'LCH'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 15');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cvlqs':
			// center = [{
			// _id: '5bae3d1d5cc51dfc0538a3e4',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cvlqs',
			// Name: 'Phạm Thị Tánh',
			// Info: '9/13-9/15 dường Phạm Thị Tánh, Phường 4, Quận 8 (gần ĐH Công nghệ Sài Gòn ) .Nếu gặp khó khăn trong việc tìm đường, vui lòng liên hệ hotline Hotline: 0901.471.898-0903.602.898',
			// Id: 'PTT'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 16');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d88ul':
			// center = [{
			// _id: '5bae3d265cc51dfc0538a3ed',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d88ul',
			// Name: 'Tân Sơn Nhì',
			// Info: '169 đường Tân Sơn Nhì, p Tân Sơn Nhì quận Tân Phú. Nếu gặp khó khăn trong việc tìm dương, vui lòng liên hệ hotline 0906613898 0906615898',
			// Id: 'TSN'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 17');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cyevm':
			// center = [{
			// _id: '5bae3d175cc51dfc0538a3de',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cyevm',
			// Name: 'Tây Thạnh',
			// Info: '84 Tây Thạnh,p Tây Thạnh, Q.Tân Phú. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0903622994 - 0906322995',
			// Id: 'TT'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 18');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/ddv49':
			// center = [{
			// _id: '5bae3d225cc51dfc0538a3e9',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/ddv49',
			// Name: 'Thanh Khê',
			// Info: '601 Điện Biên Phủ, phường Chính Gián, Quận Thanh Khê, Đà Nẵng .Neu gap kho khan trong viec tim duong, vui long lien he hotline:0906792898 - 0902652898',
			// Id: 'TK'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 19');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/ckd7g':
			// center = [{
			// _id: '5bae3d155cc51dfc0538a3dc',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/ckd7g',
			// Name: 'Trần Bình Trọng',
			// Info: '96 Trần Bình Trọng, p1, Q5. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0909676121 - 0907171845',
			// Id: 'TBT'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 20');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cztg3':
			// center = [{
			// _id: '5bae3d185cc51dfc0538a3df',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/cztg3',
			// Name: 'Trần Khánh Dư',
			// Info: '39 Trần Khánh Dư, Tân Định, Quận 1 ( phia ngoai logo English4u) . Neu gap kho khan trong viec tim duong, vui long lien he hotline 0909310898 - 0909838258',
			// Id: 'TKD'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 21');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/ciyn3':
			// center = [{
			// _id: '5bae3d145cc51dfc0538a3db',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/ciyn3',
			// Name: 'Trần Thị Nghỉ',
			// Info: '13 Trần Thị Nghỉ, p7, Q.Gò Vấp. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0903711882 - 0903755882',
			// Id: 'TTN'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 22');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d5fpr':
			// center = [{
			// _id: '5bae3d245cc51dfc0538a3eb',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/d5fpr',
			// Name: 'Trần Văn Hoài CT',
			// Info: '146Q, Trần Văn Hoài, Phường Xuân Khánh, Quận Ninh Kiều. TP. Cần Thơ . Neu gap kho khan trong viec tim duong, vui long lien he hotline: 0932105898 - 0938105898',
			// Id: 'TVH'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 23');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dkvya':
			// center = [{
			// _id: '5c2a4b29a1e6ad600fefd992',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dkvya',
			// Name: 'Trương Văn Bang (Vũng Tàu)',
			// Info: '16 Trương Văn Bang, Phường7, TP Vũng Tàu. Neu gap kho khan trong viec tim duong, vui long lien he hotline',
			// Id: 'TVB'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 24');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dmair':
			// center = [{
			// _id: '5c2a4b2aa1e6ad600fefd993',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dmair',
			// Name: 'Phong Châu (Huế)',
			// Info: '5B Phong Châu, Phường Phú Hội, TP Huế. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0906 765 828 || 0906 705 828',
			// Id: 'PC'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 25');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dnp34':
			// center = [{
			// _id: '5c2a4b2ba1e6ad600fefd994',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dnp34',
			// Name: 'Lê Hồng Phong (Nha Trang)',
			// Info: '7 Lê Hồng Phong, TP Nha trang, Tỉnh Khánh Hòa. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0909 571 898 || 0909 543 898',
			// Id: 'LHP (NT)'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 26');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dp3nl':
			// center = [{
			// _id: '5c2a4b2ca1e6ad600fefd995',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dp3nl',
			// Name: 'Nguyễn Đình Chiểu (Nha Trang)',
			// Info: '20 Nguyễn Đình Chiểu, Phường Vĩnh Phước, TP Nha Trang, Tỉnh Khánh Hòa. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0909 075 898 || 0909 003 898',
			// Id: 'NDC (NT)'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 27');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/df9om':
			// center = [{
			// _id: '5c2a4b2da1e6ad600fefd996',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/df9om',
			// Name: 'Phạm Tuấn Tài (Hà Nội)',
			// Info: '25 Phạm Tuấn Tài, P. Dịch Vọng Hậu, Q. Cầu Giấy, Tp. Hà Nội. Neu gap kho khan trong viec tim duong, vui long lien he hotline',
			// Id: 'PTT (HN)'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 28');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dgo93':
			// center = [{
			// _id: '5c2a4b2ea1e6ad600fefd997',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/dgo93',
			// Name: 'Chi Lăng',
			// Info: '80 Chi Lăng, Phường Hải Châu 2, Quận Hải Châu, TP Đà Nẵng. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0902 390 898',
			// Id: 'CL (DN)'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 29');
			// }
			// })
			// break;
			// case 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/di2tg':
			// center = [{
			// _id: '5c2a4b2fa1e6ad600fefd998',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/di2tg',
			// Name: 'Hà Huy Giáp',
			// Info: 'Hà Huy Giáp',
			// Id: 'HHG'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 30');
			// }
			// })
			// break;
			// default:
			// center = [{
			// _id: '5c2a4b30a1e6ad600fefd999',
			// SheetId: 'https://spreadsheets.google.com/feeds/list/192v0mC5dtpsuJOszkKdOEvR9oiLSWoU0ybSEoMmEk_Y/od6/djhdx',
			// Name: 'Trần Quang Diệu (Hà Nội)',
			// Info: '65 Trần Quang Diệu, Quận Đống Đa TP Hà Nội. Neu gap kho khan trong viec tim duong, vui long lien he hotline 0981.140.578.- 0981.270.578',
			// Id: 'TQD (HN)'
			// }
			// ]
			// element.Center = center;
			// element.save(function (err) {
			// if (err) {
			// console.log('update trung tam bi loi 31');
			// }
			// })
			// }
			// console.log(index);
			// }
		})
	});
}

// save dup data to sheet
function saveDupData(data) {
	var doc = new GoogleSpreadsheet('1KCi-0r8aHAkj5vd3P99yG0cLEhI_U6_SYXQ71ZUH-O8');
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
						// if (rows.length > 0) {
							var dupData = false;
							for (i = 0; i < rows.length; i++) {
								if (rows[i].phone === data.sốđiệnthoại) {
									dupData = true;
									break;
								}
							}

							if (dupData === false) {
								sheet.addRow({
									// time: data.ngaydangky,
									// Name: data.fullname,
									// Phone: data.phone,
									// Email: data.email
									Time: data.time,
									Name: data.họtên,
									Phone: data.sốđiệnthoại,
									Email: data.email
								}, function (err) {
									if (err) {
										console.log(err)
									}
								})
							}
						// }
					}
				})

			}
		}
	], function (err) {
		if (err) {
			console.log('Error: ' + err);
		}
	});
}

// check data from old crm
function checkDuplication(data, tele, sheet_id, mid, mname, admin_time) {
	var doc = new GoogleSpreadsheet('1rFX49ARfLmBBqxwj-S3H_Mt6regZmUeheNfiPisIu_w');
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
							var i = 0;
							var dupData = false;
							let checkPhone = checkPhoneNumber(data.sốđiệnthoại);

							for (i = 0; i < rows.length; i++) {
								if (rows[i].phone === checkPhone) {
									dupData = true;
									break;
								}
							}

							if (dupData === true) {
								saveDupData(data);
							} else {
								// insertOldStudent(data);
								insertStudent(data, tele, sheet_id, mid, mname, admin_time);
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
					sheet = info.worksheets[3];
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
				}, async function (err, rows) {
					if (rows !== undefined && rows !== null) {
						if (rows.length > 0) {
							//lấy danh sách học viên mới
							for (let i = 0; i < rows.length; i++) {
								// rows[i].move = "moved";
								// rows[i].save();
								if (i < 1000) {
									setTimeout(() => {
										checkDuplication(rows[i]);
										// console.log(i);
									}, i * 100)
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

	isoday = isoDay(stude.ngaydangky);
	let baodanhday = null;
	if (stude.ngaybaodanh !== '') {
		baodanhday = isoDay(stude.ngaybaodanh);
	}

	isodayHen = null;
	if (stude.ngayhen !== '0') {
		isodayHen = isoDay(stude.ngayhen);
	}

	appointmentDay = null;
	if (stude.ngayhen !== '0') {
		appointmentDay = stude.ngayhen;
	}

	email = '';
	if (stude.email !== '0') {
		email = stude.email;
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
		case 4:
			status_student = {
				id: 4,
				name: 'Hủy'
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
			_id: stude.trungtamid,
			SheetId: stude.trungtamsheetid,
			Name: stude.trungtamname,
			Id: stude.trungtamid_2,
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
	switch (parseInt(stude.thoigiantrung)) {
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
	switch (parseInt(stude.khoahoc)) {
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
		Email: email,
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
		Appointment_day: appointmentDay,
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
		}
	})
}
