/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var EventEmitter = require('events').EventEmitter;
var fork = require('child_process').fork;
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

test('send a syslog message', function _test(t) {
    var received = 0;

    NOTIFIER.on('message', function onMessage(msg) {
        var delta;
        var now = (new Date()).getTime();

        // receive the test messages
        received++;
        if (received === 1) {
            t.equal(msg.message, 'stdout syslog test message',
                'check message');
            t.equal(msg.severity, 'info', '1st msg is stdout');
        } else {
            t.equal(msg.message, 'stderr syslog test message',
                'check message');
            t.equal(msg.severity, 'err', '2nd msg is stderr');
        }

        delta = now - (new Date(msg.time)).getTime();
        t.ok(delta < 10000, 'timestamp less than 10s old (' + delta + 'ms)');
        t.equal(msg.facility, 'user', 'check facility');

        if (received === 2) {
            // got both!
            t.end();
        }

        console.error('# msg: ' + JSON.stringify(msg));

        if (received === 2) {
            // got both!
            t.end();
        }
    });

    // send the test messages
    GENERATOR.writeStdout('stdout syslog test message\n');
    GENERATOR.writeStderr('stderr syslog test message\n');
});

test('teardown', function _test(t) {
    t.ok(true, 'tearing down');

    GENERATOR.stop();
    SINK.stop();

    t.end();
});
