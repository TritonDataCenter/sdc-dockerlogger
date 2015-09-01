#!/usr/node/bin/node --abort_on_uncaught_exception

var child_process = require('child_process');
var spawn = child_process.spawn;

var CONTAINERID = 'dockerlogger-tester';
var SYSLOG_CONFIG = {
    "syslog-tag": "dockerlogger-tag",
    "syslog-address": "udp://127.0.0.1:514",
    "syslog-facility": "daemon"
};

var child = spawn('./dockerlogger', ['syslog'], {
    env: {
        'DOCKERLOG_CONFIG': JSON.stringify(SYSLOG_CONFIG),
        'DOCKERLOG_CONTAINER': CONTAINERID
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
      console.log('child process exited with code ' + code);
      process.exit(0);
});

var dummy_stdout = child.stdio[3];
var dummy_stderr = child.stdio[4];

setInterval(function () {
    dummy_stdout.write('hello stdout\n'); // should go to info priority
    dummy_stderr.write('hello stderr\n'); // should go to error priority
}, 5000);

