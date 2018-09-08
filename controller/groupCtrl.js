//group model
group_model = require('../model/groups');

//Api
module.exports = {
    // tạo group
    Cgroup: function (req, res) {
        let group = new group_model({
            Name: req.body.Name,
            Gtype: req.body.Gtype,
            Leader: req.body.Leader,
            Sheet: null,
            Total: 0
        })
        group.save(function (err) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
            } else {
                response = { 'error_code': 0, 'message': 'create group success' };
            }
            res.status(200).json(response);
        })
    },
    GetAll: function (req, res) {
        group_model.find({}, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                if (data.length > 0) {
                    response = { 'error_code': 0, 'groups': data };
                    res.status(200).json(response);
                }
            }
        })
    }
}