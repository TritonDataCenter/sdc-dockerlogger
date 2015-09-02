#!/usr/node/bin/node --abort_on_uncaught_exception

var child_process = require('child_process');
var spawn = child_process.spawn;

var CONTAINERID = 'abcdefghijklmnopqrstuvwxyz';
var CONTAINERNAME = 'dummy';
var DRIVER_CONFIG = {
    'syslog': {
        'syslog-tag': 'dockerlogger-tag',
        'syslog-address': 'udp://127.0.0.1:514',
        'syslog-facility': 'daemon'
    }, 'fluentd': {
        'fluentd-tag': 'dockerlogger.tag',
        'fluentd-address': 'localhost:24224'
    }
};

function startLogging(driver) {
    var config = DRIVER_CONFIG[driver];
    var child = spawn('./dockerlogger', [driver], {
        env: {
            'DOCKERLOG_CONFIG': JSON.stringify(config),
            'DOCKERLOG_CONTAINERID': CONTAINERID,
            'DOCKERLOG_CONTAINERNAME': CONTAINERNAME
        },
        stdio: [
            0,
            1,
            2,
            'pipe',
            'pipe'
        ]
    });

    child.on('close', function (code) {
          console.log(driver + '_child process exited with code ' + code);
    });

    setInterval(function () {
        child.stdio[3].write('hello ' + driver + ' stdout\n'); // should go to info priority
        child.stdio[4].write('hello ' + driver + ' stderr\n'); // should go to error priority
    }, 5000);
}

startLogging('syslog');
startLogging('fluentd');

