//group model
group_model = require('../model/groups');
center_model = require('../model/center');

//Api
module.exports = {
    // tạo group
    Cgroup: function (req, res) {
        let group = new group_model({
            Name: req.body.Name,
            Gtype: req.body.Gtype,
            Leader: req.body.Leader,
            Sheet: null,
            Tele: null,
            Total: 0
        })
        group.save(function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
            } else {
                response = { 'error_code': 0, 'message': data.id };
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
                // if (data.length > 0) {
                    response = { 'error_code': 0, 'groups': data };
                    res.status(200).json(response);
                // }
            }
        })
    },
    Del: function (req, res) {
        group_model.findById({ _id: req.body._id }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                group_model.remove({ _id: req.body._id }, function (err) {
                    if (err) {
                        response = { 'error_code': 1, 'message': 'error fetching data' };
                    } else {
                        response = { 'error_code': 0, 'message': 'delete success' };
                    }
                    res.status(200).json(response);
                })
            }
        })
    },
    Up: function (req, res) {
        group_model.findById({ _id: req.body.group._id }, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                var lead = null;
                if(req.body.group.Leader !== null){
                    if(req.body.group.Leader[0] !== null){
                        lead = req.body.group.Leader;
                    }
                }
                data.Name = req.body.group.Name;
                data.Gtype = req.body.group.Gtype;
                data.Sheet = req.body.group.Sheet;
                
                data.Leader = lead;
                data.Tele = req.body.group.Tele;
                data.save(function (err) {
                    if (err) {
                        response = { 'error_code': 1, 'message': 'error fetching data' };
                    } else {
                        response = { 'error_code': 0, 'message': 'update success' };
                    }
                    res.status(200).json(response);
                })
            }
        })
    },
	GetCenter: function(req, res){
		center_model.find({}, function (err, data) {
            if (err) {
                response = { 'error_code': 1, 'message': 'error fetching data' };
                res.status(200).json(response);
            } else {
                // if (data.length > 0) {
                    response = { 'error_code': 0, 'center': data };
                    res.status(200).json(response);
                // }
            }
        })
	}
}