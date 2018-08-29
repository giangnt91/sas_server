var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var schedule = require('node-schedule');

//autosheet model
var autosheet = require('../model/autoSheet');

//function auto
function getSheet() {
    var doc = new GoogleSpreadsheet('1wP1ef6NS_eUixv4Vyz6VxLFISKNUP7GoRojsqu6dLiU');
    var sheet;
    async.series([
        function setAuth(step) {
            // see notes below for authentication instructions!
            var creds = require('../2i studio-fd2ce7d288b9.json');
            doc.useServiceAccountAuth(creds, step);
        },
        function getInfoAndWorksheets(step) {
            doc.getInfo(function (err, info) {
                sheet = info.worksheets[0];
                step();
            });
        },
        function workingWithRows(step) {
            // google provides some query options
            sheet.getRows({
                offset: 1
                // orderby: 'col2'
            }, function (err, rows) {
                if (rows.length > 0) {
                    for (let i = 0; i < rows.length; i++) {
                        if (rows[i].move === "" && rows[i]) {
                            autosheet.find({ Id_sheet: rows[i].id }, function (err, data) {
                                if (data.length === 0) {
                                    let student = new autosheet({
                                        Id_sheet: rows[i].id,
                                        Fullname: rows[i].họtên,
                                        Email: rows[i].email,
                                        Phone: rows[i].sốđiệnthoại,
                                        Sex: null,
                                        Address: null,
                                        Regday: null,
                                        Note: null,
                                        Center: null,
                                        Appointment_day: null,
                                        Appointment_time: null,
                                        Status_student: null
                                    });

                                    student.save(function (err) {
                                        if (err) {
                                            console.log(err)
                                        } else {
                                            rows[i].move = "moved";
                                            rows[i].save();
                                        }
                                    })
                                }
                            });
                        }
                    }
                }
                step();
            });
        }
    ], function (err) {
        if (err) {
            console.log('Error: ' + err);
        }
    });
}

/*
schedule function
1. function check student automatic every minute
*/
schedule.scheduleJob('*/1 * * * *', function () {
    getSheet();
})

