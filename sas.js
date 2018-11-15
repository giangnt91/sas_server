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
    var allowedOrigins = ['http://112.78.1.78:199', 'http://localhost:8080', 'http://sascenter.net'];
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

        // kiểm tra các lịch sắp tới hẹn
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


        // kiểm tra trùng học viên
        student_model.find({ 'Duplicate.alert': false }, function (err, data) {
            if (err) {
                console.log('Duplicate sas ' + err);
            } else {
                if (data.length > 0) {
                    var list_duplicate = [];
                    data.forEach(element => {
                        let tmp = {
                            teleid: element.Manager[0].id,
                            telename: element.Manager[0].name,
                            pretime: element.Duplicate[0].pretime,
                            prename: element.Duplicate[0].prename,
                            preid: element.Duplicate[0].preid,
                            premid: element.Duplicate[0].premid,
                            premname: element.Duplicate[0].premname,
                            sheetid: element.Duplicate[0].msheetid,
                            student: element.Fullname,
                            stphone: element.Phone,
                            mketer: element.Manager[0].mid
                        }
                        list_duplicate.push(tmp);
                    });

                    if (list_duplicate.length > 0) {
                        socket.broadcast.emit('duplicate', list_duplicate);
                        socket.broadcast.emit('mkduplicate', list_duplicate);
                        data.forEach(element => {
                            let _dup = [{
                                alert: true,
                                pretime: element.Duplicate[0].pretime,
                                msheetid: element.Duplicate[0].msheetid,
                                prename: element.Duplicate[0].prename,
                                preid: element.Duplicate[0].preid,
                                premid: element.Duplicate[0].premid,
                                premname: element.Duplicate[0].premname
                            }]
                            element.Duplicate = _dup;
                            element.save(function (err) {
                                if (err) {
                                    console.log('duplicate update ' + err);
                                }
                            })
                        });
                    }
                }
            }
        })



    }, 15000);
});

//-- Controller --//
var AutoSheetCtrl = require('./controller/autoSheetCtrl');
var AuthCtrl = require('./controller/authCtrl');
var StudentCtrl = require('./controller/studentCtrl');
var GroupCtrl = require('./controller/groupCtrl');

//-- Api --//

//Auth
sas.post('/access', function(req, res){
	AuthCtrl.TheAccess(req, res);
})
sas.post('/withoutlogin', function (req, res) {
    AuthCtrl.Without(req, res);
})
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

sas.post('/upsheetstatus', function (req, res) {
    AuthCtrl.UpdateSheetStatus(req, res);
})

sas.post('/updateuser', function (req, res) {
    AuthCtrl.UpdateInfoUser(req, res);
})

sas.post('/updatezoneUser', function (req, res) {
    AuthCtrl.UpdatezoneUser(req, res);
})

sas.post('/updatermleader', function (req, res) {
    AuthCtrl.UpdateRemoveLeader(req, res);
})

sas.post('/deleteuser', function (req, res) {
    AuthCtrl.DeleteUser(req, res);
})

sas.post('/resetuser', function (req, res) {
    AuthCtrl.ResetUser(req, res);
})

sas.post('/getallusergroup', function (req, res) {
    AuthCtrl.GetAllforgroup(req, res);
})

sas.post('/alluser', function(req, res){
    AuthCtrl.GetAll(req, res);
})

sas.post('/getuserbysup', function (req, res) {
    AuthCtrl.GetbySup(req, res);
})

sas.post('/getuserforgroup', function (req, res) {
    AuthCtrl.GetforGroup(req, res);
})

sas.post('/sharestudent', function (req, res) {
    AuthCtrl.ShareStudent(req, res);
})

sas.post('/getallmakerting', function (req, res) {
    AuthCtrl.GetallMakerting(req, res);
})

sas.post('/rmgroupofuser', function (req, res) {
    AuthCtrl.RmGroup(req, res);
})

//Student
sas.post('/getscenter', function(req, res){
	StudentCtrl.GetSCenter(req, res);
})

sas.post('/getsrating', function(req, res){
	StudentCtrl.GetSrating(req, res);
})

sas.post('/gettqmakert', function (req, res) {
    StudentCtrl.Gettq(req, res);
})

sas.post('/getrating', function(req, res){
	StudentCtrl.Getrating(req, res);
})

sas.post('/cstudent', function (req, res) {
    StudentCtrl.CreateStudent(req, res)
})

sas.post('/getallquery', function (req, res) {
    StudentCtrl.GetallQuery(req, res);
})

sas.post('/getbygroup', function(req, res){
	StudentCtrl.GetByGroup(req, res);
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

sas.post('/sendstudent', function(req, res){
	StudentCtrl.SendStudentById(req, res);
})

sas.post('/searchpro', function(req, res){
	StudentCtrl.SearchPro(req, res);
})

sas.post('/searchbyphone', function(req, res){
	StudentCtrl.SearchByPhone(req, res);
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

sas.post('/searchschedule', function (req, res) {
    StudentCtrl.SearchSch(req, res);
})

sas.post('/searchunreg', function (req, res) {
    StudentCtrl.SearchUn(req, res);
})

sas.post('/searchsend', function (req, res) {
    StudentCtrl.SearchS(req, res);
})

sas.post('/searchcalendar', function (req, res) {
    StudentCtrl.SearchC(req, res);
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

sas.post('/charthuy', function(req, res){
	StudentCtrl.GetHuy(req, res);
})

sas.post('/chartlh', function (req, res) {
    StudentCtrl.GetLh(req, res);
})

//group

sas.post('/cgroup', function (req, res) {
    GroupCtrl.Cgroup(req, res);
})

sas.post('/allgroup', function (req, res) {
    GroupCtrl.GetAll(req, res);
})

sas.post('/delgroup', function (req, res) {
    GroupCtrl.Del(req, res);
})

sas.post('/upgroup', function (req, res) {
    GroupCtrl.Up(req, res);
})

sas.post('/rmsheet', function (req, res) {
    GroupCtrl.Delsheet(req, res);
})

sas.post('/getcenter', function(req, res){
	GroupCtrl.GetCenter(req, res);
})

// sms

sas.post('/csms', function (req, res) {
    StudentCtrl.Csms(req, res);
})

sas.post('/getsms', function (req, res) {
    StudentCtrl.Gsms(req, res);
})

sas.post('/checksms', function (req, res) {
    var request = require('request');
    request('http://cloudsms.vietguys.biz:8088/api/?u=SAS-Center&pwd=wcs8z&from=SAS.edu.vn&phone=' + req.body.Phone + '&sms=' + req.body.SMS, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.status(200).json(body);
        }
    })
})


//-- Run server --//
http.listen(port);
console.log('Server SAS is running on port ' + port);