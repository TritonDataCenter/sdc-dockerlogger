/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var EventEmitter = require('events').EventEmitter;
var os = require('os');

var assert = require('assert-plus');
var test = require('tape');
var vasync = require('vasync');

var LogGen = require('./harness/loggen');
var LogSink = require('./harness/logsink');

var INBOX = [];
var GENERATOR;
var NOTIFIER = new EventEmitter();
var SINK;

test('setup', function _test(t) {
    t.ok(true, 'setting up');

    SINK = new LogSink({
        driver: 'syslog_tcp',
        exitCallback: function (code) {
            console.log('# exit from sink: ' + code);
        },
        msgCallback: function (msg) {
            NOTIFIER.emit('message', msg);
        }
    });

    GENERATOR = new LogGen({
        containerId: 'deadbeefcafe',  // must be at least 12 characters
        containerName: 'syslogContainer',
        driver: 'syslog',
        driverOpts: {
            'syslog-address': 'tcp://127.0.0.1:10514',
            'syslog-facility': 'user', // 1
            'syslog-tag': 'taggyMcTagface'
        },
        exitCallback: function (code, signal) {
            console.log('# exit from generator: '
                + JSON.stringify({code: code, signal: signal}));
        }
    });

    vasync.pipeline({
        funcs: [
            function _callSinkStart(_, cb) {
                // need this wrapper because vasync destroys `this`
                SINK.start(cb);
            },
            function _callGeneratorStart(_, cb) {
                // need this wrapper because vasync destroys `this`
                GENERATOR.start(cb);
            }
        ]
    }, function _donePipeline(err) {
        assert.ifError(err, 'donePipeline');

        t.end();
    });
});

test('send some syslog messages', function _test(t) {
    var received = 0;

    NOTIFIER.on('message', function onMessage(msg) {
        var delta;
        var now = (new Date()).getTime();

        if (process.env.DEBUG_MSG) {
            console.error('# msg: ' + JSON.stringify(msg));
        }

        // receive the test messages
        received++;
        if (received === 1) {
            t.equal(msg.message, 'stdout syslog test message',
                'check message');
            t.equal(msg.prival, 14, '1st msg is stdout');
        } else {
            t.equal(msg.message, 'stderr syslog test message',
                'check message');
            t.equal(msg.prival, 11, '2nd msg is stderr');
        }

        delta = now - (new Date(msg.timestamp)).getTime();
        t.ok(delta < 10000, 'timestamp less than 10s old (' + delta + 'ms)');
        t.equal(msg.host, os.hostname(), 'check hostname');
        t.equal(msg.appName, 'dockerlogger', 'check appName');
        t.equal(msg.tag, GENERATOR.driverOpts['syslog-tag'], 'check tag');

        if (received === 2) {
            // got both!
            t.end();
        }
    });

    // send the test messages
    GENERATOR.writeStdout('stdout syslog test message\n');
    // delay on the second message to guarantee order
    // XXX: shouldn't dockerlogger guarantee order?!
    setTimeout(function _sendStderrMsg() {
        GENERATOR.writeStderr('stderr syslog test message\n');
    }, 100);
});

test('teardown', function _test(t) {
    t.ok(true, 'tearing down');

    GENERATOR.stop();
    SINK.stop();

    t.end();
});
