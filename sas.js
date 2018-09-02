var express = require('express'), http = require('http');
var sas = express();
var bodyParser = require('body-parser');
port = process.env.port || 191;
var http = http.Server(sas);
var io = require('socket.io')(http);

sas.use(bodyParser.urlencoded({
    extended: true
}));
sas.use(bodyParser.json());
sas.use(function (req, res, next) {
    //allow connect
    // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    var allowedOrigins = ['http://35.240.165.98:199', 'http://localhost:8080', 'http://localhost:8081', 'http://192.168.1.111:8100', 'http://coupon10k.com', 'http://shop.coupon10k.com'];
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

//-- Socket IO --/
io.on('connection', function (socket) {

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

//Student
sas.post('/cstudent', function (req, res) {
    StudentCtrl.CreateStudent(req, res)
})

sas.post('/getall', function (req, res) {
    StudentCtrl.Getall(req, res);
})

sas.post('/upstudent', function (req, res) {
    StudentCtrl.UpdateById(req, res);
})

//-- Run server --//
http.listen(port);
console.log('Server SAS is running on port ' + port);