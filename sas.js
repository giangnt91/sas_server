var express = require('express'), http = require('http');
var sas = express();
var bodyParser = require('body-parser');
port = process.env.port || 191;
var http = http.Server(sas);
var io = require('socket.io')(http);
var schedule = require('node-schedule');
var dateFormat = require('dateformat');

sas.use(bodyParser.urlencoded({
    extended: true
}));
sas.use(bodyParser.json());
sas.use(express.static('./node_modules/socket.io-client/dist/'));

sas.use(function (req, res, next) {
    //allow connect
    // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    var allowedOrigins = ['http://35.240.165.98:199', 'http://localhost:8080'];
    var origin = req.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', false);

    // Pass to next layer of middleware
    next();
})

//get model
var student_model = require('./model/autoSheet');

/*
schedule function
1. function remove expired automatic every minute
*/
schedule.scheduleJob('*/1 * * * * *', function () {
    var _time = dateFormat(new Date(), "HH:MM");

    // student_model.find({ 'Appointment_time.name': _time }, function (err, data) {
    //     if (err) {
    //         console.log('Appointment_time sas ' + err);
    //     }else{

    //     }
    // })
})

//-- Socket IO --/
io.on('connection', function (socket) {
    setInterval(function () {
        var _time = dateFormat(new Date(), "HH:MM");
        var _day = dateFormat(new Date(), "dd/mm/yyyy");

        student_model.find({ 'Appointment_time.name': _time, 'Appointment_day': _day }, function (err, data) {
            if (err) {
                console.log('Appointment_time sas ' + err);
            } else {
                if (data.length > 0) {
                    var _list_user = [];
                    data.forEach(element => {
                        if (_list_user.includes(element.Manager[0].id) === false) {
                            tmp = {
                                time: _time,
                                day: _day,
                                user: element.Manager[0].id
                            }
                            _list_user.push(tmp);
                        }
                    });
                    if (_list_user.length > 0) {
                        socket.broadcast.emit('alert', _list_user);
                    }
                }
            }
        })
    }, 10000);
});

//-- Controller --//
var AutoCtrl = require('./controller/autoSheetCtrl');
var AuthCtrl = require('./controller/authCtrl');
var StudentCtrl = require('./controller/studentCtrl');

//-- Api --//

//Auth
sas.post('/signup', function (req, res) {
    AuthCtrl.Signup(req, res);
});

sas.post('/signin', function (req, res) {
    AuthCtrl.Signin(req, res);
})

sas.post('/update', function (req, res) {
    AuthCtrl.Update(req, res);
})

sas.post('/upstatus', function (req, res) {
    AuthCtrl.UpdateStatus(req, res);
})

sas.post('/getuserbysup', function (req, res) {
    AuthCtrl.GetbySup(req, res);
})

sas.post('/sharestudent', function (req, res) {
    AuthCtrl.ShareStudent(req, res);
})

//Student
sas.post('/cstudent', function (req, res) {
    StudentCtrl.CreateStudent(req, res)
})

sas.post('/getall', function (req, res) {
    StudentCtrl.Getall(req, res);
})

sas.post('/getfornof', function (req, res) {
    StudentCtrl.Getfornof(req, res);
})

sas.post('/upstudent', function (req, res) {
    StudentCtrl.UpdateById(req, res);
})

sas.post('/searchhome', function (req, res) {
    StudentCtrl.SearchH(req, res);
})

sas.post('/searchnotcall', function (req, res) {
    StudentCtrl.SearchN(req, res);
})

sas.post('/searchrecall', function (req, res) {
    StudentCtrl.SearchR(req, res);
})

sas.post('/chartdefault', function (req, res) {
    StudentCtrl.GetdetailForChart(req, res);
})

sas.post('/chartnotcall', function (req, res) {
    StudentCtrl.GetdetailNotcall(req, res);
})

sas.post('/chartrecall', function (req, res) {
    StudentCtrl.GetdetailRecall(req, res);
})

sas.post('/charttl', function (req, res) {
    StudentCtrl.Gettl(req, res);
})

sas.post('/charthcd', function (req, res) {
    StudentCtrl.GetHcd(req, res);
})

sas.post('/chartdcdk', function (req, res) {
    StudentCtrl.GetDcdk(req, res);
})

sas.post('/chartcdk', function (req, res) {
    StudentCtrl.GetCdk(req, res);
})

sas.post('/chartktn', function (req, res) {
    StudentCtrl.GetKtn(req, res);
})

sas.post('/chartlh', function (req, res) {
    StudentCtrl.GetLh(req, res);
})
//-- Run server --//
http.listen(port);
console.log('Server SAS is running on port ' + port);