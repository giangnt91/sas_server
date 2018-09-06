var dateFormat = require('dateformat');
var mongoose = require('mongoose');
var async = require('async');

//user model
var users_model = require('../model/auth');
var stutdent_model = require('../model/autoSheet');
var _list_auth = [];

// lấy telesale thấp nhất
function get_telesale(student, username) {
    users_model.find({ 'Role.id': 1, 'Status_user.id': 1 }, function (err, data) {
        if (err) {
            console.log('get_telesale ' + err);
        } else {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    if (data[i].Username === username) {
                        data.splice(i, 1);
                    }
                }
                if (data.length === 1) {
                    response = { 'error_code': 2, 'message': 'only 1 user online' };
                    response.status(200).json(response);
                } else {
                    updateStudent(student, data[0], username);
                }
            }
        }

    }).sort({ 'Student_in_month.Total': 1 });
}

// cập nhật trừ total của telesale
function update_sub_total_for_tele(data) {
    users_model.findOne({ Username: data }, function (err, data) {
        _total = data.Student_in_month[0].Total - 1;
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

// cập nhật thông tin cho telesale
function update_total_for_tele(data, total) {
    users_model.findById({ _id: data._id }, function (err, data) {
        _total = total;
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
function updateStudent(stude, tele, username) {
    stutdent_model.findById({ _id: stude._id }, function (err, data) {
        if (err) {
            console.log('insertStudent ' + err);
        } else {
            if (data) {
                let manager = {
                    id: tele.Username,
                    name: tele.Fullname
                }
                data.Manager = manager;
                data.save(function (err) {
                    if (err) {
                        console.log('save student ' + err)
                    } else {
                        tmp = tele.Student_in_month[0].Total + 1;
                        update_total_for_tele(tele, tmp);
                        update_sub_total_for_tele(username);
                    }
                })
            }
        }
    });
}

// Api
module.exports = {
    // sign up
    Signup: function (req, res) {
        var response;
        users_model.find({ Username: req.body.Username }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data !' };
                res.status(200).json(response);
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 2, 'message': 'Username already exists, retry with another Username !' }
                    res.status(200).json(response);
                } else {
                    let dayjoin = dateFormat(new Date(), "dd/mm/yyyy");
                    let _Month = dateFormat(new Date(), "mm");
                    var new_status = {
                        id: 1,
                        name: 'Hoạt động'
                    }
                    let student_in_month = {
                        Total: 0,
                        Waiting: 0,
                        Out: 0,
                        In: 0,
                        Month: _Month
                    }
                    let new_auth = new users_model({
                        Username: req.body.Username,
                        Password: req.body.Password,
                        Fullname: req.body.Fullname,
                        Email: req.body.Email,
                        Phone: req.body.Phone,
                        Dayreg: dayjoin,
                        Student_in_month: student_in_month,
                        Role: req.body.Role,
                        Status_user: new_status
                    });

                    new_auth.save(function (err) {
                        if (err) {
                            response = { 'error_code': 1, 'message': 'error fetching data' };
                        } else {
                            response = { 'error_code': 0, 'message': 'user is created !' };
                        }
                        res.status(200).json(response);
                    })
                }
            }
        });
    },
    Signin: function (req, res) {
        users_model.find({ Username: req.body.Username }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data.length > 0) {
                    if (req.body.Password === data[0].Password) {
                        if (data[0].Status_user[0].id === 0) {
                            response = { 'error_code': 4, 'message': 'user is offline' }
                        } else {
                            response = { 'error_code': 0, 'auth': data[0] }
                        }
                    } else {
                        response = { 'error_code': 2, 'message': 'username or password incorrect' }
                    }

                } else {
                    response = { 'error_code': 3, 'message': 'username not exits' }
                }
                res.status(200).json(response);
            }
        })
    },
    Update: function (req, res) {
        users_model.find({ Username: req.body.Username }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data.length > 0) {
                    data[0].Password = req.body.Password;
                    data[0].save(function (err) {
                        if (err) {
                            response = { 'error_code': 1, 'message': 'error fetching data' }
                        } else {
                            response = { 'error_code': 0, 'message': 'Update info success' }
                        }
                        res.status(200).json(response);
                    })
                }
            }
        })
    },
    UpdateStatus: function (req, res) {
        users_model.findById({ _id: req.body._id }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data) {
                    var _status;
                    if (req.body.value === false) {
                        _status = [{
                            id: 0,
                            name: 'Không hoạt động'
                        }]
                    } else if (req.body.value === true) {
                        _status = [{
                            id: 1,
                            name: 'Hoạt động'
                        }]
                    }
                    data.Status_user = _status;
                    data.save(function (err) {
                        if (err) {
                            response = { 'error_code': 1, 'message': 'error fetching data' }
                        } else {
                            response = { 'error_code': 0, 'message': 'Update info success' }
                        }
                        res.status(200).json(response);
                    })
                }
            }
        })
    },
    GetbySup: function (req, res) {
        users_model.find({ 'Role.id': 1 }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 0, 'users': data }
                    res.status(200).json(response);
                }
            }
        })
    },
    ShareStudent: function (req, res) {
        stutdent_model.find({ 'Manager.id': req.body.detail.Username, $and: [{ $or: [{ 'Status_student.id': 0 }, { 'Status_student.id': 1 }, { 'Status_student.id': 2 }] }] }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data.length > 0) {

                    for (let i = 0; i < data.length; i++) {
                        setTimeout(function () {
                            get_telesale(data[i], req.body.detail.Username);
                        }, 1000 * i)
                        if (i === data.length - 1) {
                            response = { 'error_code': 0, 'message': 'share student complete' };
                            res.status(200).json(response);
                        }
                    }


                } else {
                    response = { 'error_code': 3, 'message': 'not student for share' };
                    res.status(200).json(response);
                }
            }
        })
    }

}