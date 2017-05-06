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
        driver: 'fluentd_tcp',
        exitCallback: function (code) {
            console.log('# exit from sink: ' + code);
        },
        msgCallback: function (msg) {
            NOTIFIER.emit('message', msg);
        }
    });

    GENERATOR = new LogGen({
        containerId: 'deadbeefcafe',  // must be at least 12 characters
        containerName: 'fluentdContainer',
        driver: 'fluentd',
        driverOpts: {
            'fluentd-address': '127.0.0.1:24220',
            'fluentd-tag': 'taggyMcTagface'
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

test('send a fluentd message', function _test(t) {
    var received = 0;

    NOTIFIER.on('message', function onMessage(msg) {
        var delta;
        var now = (new Date()).getTime();

        // receive the test messages
        received++;
        if (received === 1) {
            t.equal(msg.record.log, 'stdout fluentd test message',
                'check message');
            t.equal(msg.record.source, 'stdout', '1st msg is stdout');
        } else {
            t.equal(msg.record.log, 'stderr fluentd test message',
                'check message');
            t.equal(msg.record.source, 'stderr', '2nd msg is stderr');
        }

        console.error('# msg: ' + JSON.stringify(msg));

        t.equal(msg.tag, GENERATOR.driverOpts['fluentd-tag'], 'check tag');
        delta = now - (msg.time * 1000);
        t.ok(delta < 10000, 'timestamp less than 10s old (' + delta + 'ms)');
        t.equal(msg.record.container_id, GENERATOR.containerId, 'check container_id');
        t.equal(msg.record.container_name, GENERATOR.containerName, 'check container_name');
        t.equal(msg.option, null, 'check option is "null"');

        if (received === 2) {
            // got both!
            t.end();
        }
    });

    // send the test messages
    GENERATOR.writeStdout('stdout fluentd test message\n');

    // delay on the second message to guarantee order
    // XXX: shouldn't dockerlogger guarantee order?!
    setTimeout(function _sendStderrMsg() {
        GENERATOR.writeStderr('stderr fluentd test message\n');
    }, 100);
});

test('teardown', function _test(t) {
    t.ok(true, 'tearing down');

    GENERATOR.stop();
    SINK.stop();

    t.end();
});
