var dateFormat = require('dateformat');

//user model
var users_model = require('../model/auth');
var stutdent_model = require('../model/autoSheet');
var one = 0;

// lấy telesale thấp nhất
function get_telesale(student, username) {
    users_model.find({ 'Role.id': 1, 'Status_user.id': 1 }, function (err, data) {
        if (err) {
            console.log('get_telesale ' + err);
        } else {
            if (data.length > 0) {
                if (data.length === 1) {
                    one = 1;
                } else {
                    one = 0;
                    for (let i = 0; i < data.length; i++) {
                        if (data[i].Username === username) {
                            data.splice(i, 1);
                        }
                    }
                    updateStudent(student, data[0], username);
                }
            }
        }
    }).sort({ 'Student_in_month.Total': 1 });
}

// cập nhật trừ total của telesale
function update_sub_total_for_tele(data) {
    users_model.findOne({ Username: data }, function (err, data) {
        if (data.Student_in_month[0].Total === 0) {
            _total = 0;
        } else {
            _total = data.Student_in_month[0].Total - 1;
        }
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
function update_total_for_tele(data) {
    users_model.findById({ _id: data._id }, function (err, data) {
        _total = data.Student_in_month[0].Total + 1;
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
                        update_total_for_tele(tele);
                        update_sub_total_for_tele(username);
                    }
                })
            }
        }
    });
}

// Api
module.exports = {
    Without: function (req, res) {
        users_model.findById({_id: req.body._id}, function(err, data){
            if(err){
                response = { 'error_code': 1, 'message': 'error fetching data !' };
                res.status(200).json(response);
            }else{
                response = { 'error_code': 2, 'user': data }
                res.status(200).json(response);
            }
        })
    },
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
                        Phone: '0' + req.body.Phone,
                        Dayreg: dayjoin,
                        Birthday: req.body.Birthday,
                        Student_in_month: student_in_month,
                        Role: req.body.Role,
                        Leader: false,
                        SheetID: null,
                        GroupSheet: null,
                        Zone: req.body.Zone,
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
    UpdateInfoUser: function (req, res) {
        users_model.findById({ _id: req.body._detail._id }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' }
                res.status(200).json(response);
            } else {
                if (data !== null) {
                    data.Username = req.body._detail.Username;
                    data.Fullname = req.body._detail.Fullname;
                    data.Email = req.body._detail.Email;
                    data.Phone = req.body._detail.Phone;
                    data.Birthday = req.body._detail.Birthday;
                    data.Zone = req.body._detail.Zone;
                    data.Leader = req.body._detail.Leader;
                    data.Role = req.body._detail.Role;
                    data.SheetID = req.body._detail.SheetID;
                    data.GroupSheet = req.body._detail.GroupSheet;
                    data.Student_in_month = req.body._detail.Student_in_month;

                    data.save(function (err) {
                        if (err) {
                            response = { 'erorr_code': 2, 'message': 'error fetching data' }
                        } else {
                            response = { 'error_code': 0, 'mesaage': 'update success' }
                        }
                        res.status(200).json(response);
                    })
                }
            }
        })
    },
    UpdatezoneUser: function (req, res) {
        users_model.findOne({ Username: req.body._id }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                data.Zone = req.body.Zone;
                data.Leader = true;
                data.save(function (err) {
                    if (err) {
                        response = { 'error_code': 1, 'message': 'error fetching data' }
                    } else {
                        response = { 'error_code': 0, 'message': 'Update info success' }
                    }
                    res.status(200).json(response);
                })
            }
        })
    },
    UpdateRemoveLeader: function (req, res) {
        users_model.findOne({ Username: req.body._id }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data !== null) {
                    data.Leader = false;
                    data.save(function (err) {
                        if (err) {
                            response = { 'error_code': 1, 'message': 'error fetching data' }
                        } else {
                            response = { 'error_code': 0, 'message': 'Update info success' }
                        }
                        res.status(200).json(response);
                    })

                    // data.Leader = false;
                    // data.save(function (err) {
                    //     if (err) {
                    //         response = { 'error_code': 1, 'message': 'error fetching data' }
                    //     } else {
                    //         response = { 'error_code': 0, 'message': 'Update info success' }
                    //     }
                    //     res.status(200).json(response);
                    // })
                }
            }
        })
    },
    DeleteUser: function (req, res) {
        users_model.findById({ _id: req.body._id }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                users_model.remove({ _id: req.body._id }, function (err) {
                    if (err) {
                        response = { 'error_code': 1, 'message': 'error fetching data' };
                    } else {
                        response = { 'error_code': 0, 'message': 'delete success' };
                    }
                })
                res.status(200).json(response);
            }
        });
    },
    ResetUser: function (req, res) {
        users_model.findById({ _id: req.body._id }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                data.Password = req.body.new_pass;
                data.save(function (err) {
                    if (err) {
                        response = { 'error_code': 1, 'message': 'error fetching data' }
                    } else {
                        response = { 'error_code': 0, 'message': 'Update info success' }
                    }
                    res.status(200).json(response);
                })
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
    UpdateSheetStatus: function (req, res) {
        users_model.findById({ _id: req.body._id }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data) {
                    var SheetID;
                    if (req.body.value === false) {
                        SheetID = [{
                            name: data.SheetID[0].name,
                            id: data.SheetID[0].id,
                            urlads: data.SheetID[0].urlads,
                            note: data.SheetID[0].note,
                            isready: false
                        }]
                    } else if (req.body.value === true) {
                        SheetID = [{
                            name: data.SheetID[0].name,
                            id: data.SheetID[0].id,
                            urlads: data.SheetID[0].urlads,
                            note: data.SheetID[0].note,
                            isready: true
                        }]
                    }
                    data.SheetID = SheetID;
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
    GetAllforgroup: function (req, res) {
        users_model.find({ $or: [{ 'Role.id': 1 }, { 'Role.id': 2 }] }, function (err, data) {
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
    GetforGroup: function (req, res) {
        var query;
        if (req.body.Role[0].id !== 0) {
            query = {
                'Zone.id': req.body.id,
                'Role.id': req.body.Role[0].id
            }
        } else {
            query = {
                $or: [{
                    'Role.id': 1
                }, {
                    'Role.id': 2
                }]
            }
        }
        users_model.find(query, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                // if (data.length > 0) {
                response = { 'error_code': 0, 'users': data };
                res.status(200).json(response);
                // }
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
                    }

                    setTimeout(function () {
                        if (one === 1) {
                            response = { 'error_code': 2, 'message': 'only 1 user online' };
                        } else {
                            response = { 'error_code': 0, 'message': 'share student complete' };
                        }
                        res.status(200).json(response);
                    }, 3000);

                } else {
                    response = { 'error_code': 3, 'message': 'not student for share' };
                    res.status(200).json(response);
                }
            }
        })
    },
    GetallMakerting: function (req, res) {
        users_model.find({ 'Role.id': 2 }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 0, 'makert': data }
                    res.status(200).json(response);
                }
            }
        })
    },
    RmGroup: function (req, res) {
        users_model.find({ 'Zone.id': req.body._id }, function (err, data) {
            if (err) {
                console.log('RmGroup :' + err);
            } else {
                if (data.length > 0) {
                    data.forEach(element => {
                        element.Zone = null;
                        element.save(function (err) {
                            if (err) {
                                console.log(err)
                            }
                        })
                    });
                    response = { 'error_code': 0, 'message': 'delete group success' };
                    res.status(200).json(response);
                }
            }
        })
    }
}