//get model
var student_model = require('../model/autoSheet');

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
                            if (_user === student.Manager[0].Username) {
                                _list_student.push(student);
                            }
                        });
                        response = { 'error_code': 0, 'student': _list_student };
                    }
                    res.status(200).json(response);
                }
            }
        })
    }
}