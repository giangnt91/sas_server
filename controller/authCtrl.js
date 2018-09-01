var dateFormat = require('dateformat');

//user model
var users_model = require('../model/auth');

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
                        response = { 'error_code': 0, 'auth': data[0] }
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
    }
}