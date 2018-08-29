var dateFormat = require('dateformat');

//user model
var users = require('../model/auth');

// Api
module.exports = {
    // sign up
    Signup: function (req, res) {
        var response;
        users.find({ Phone: req.body.Phone }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data !' };
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 2, 'message': 'phone number already exists, retry with another phone !' }
                } else {
                    let dayjoin = dateFormat(new Date(), "dd/mm/yyyy");
                    var new_status = {
                        id: 1,
                        name: 'Hoạt động'
                    }
                    let new_auth = users.model({
                        Username: req.body.Username,
                        Fullname: req.body.Fullname,
                        Nickname: req.body.Nickname,
                        Email: req.body.Email,
                        Phone: req.body.Phone,
                        Dayreg: dayjoin,
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
    }
}