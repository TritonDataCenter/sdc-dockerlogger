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
        driver: 'gelf_udp',
        exitCallback: function (code) {
            console.log('# exit from sink: ' + code);
        },
        msgCallback: function (msg) {
            NOTIFIER.emit('message', msg);
        }
    });

    GENERATOR = new LogGen({
        containerName: 'gelfContainer',
        driver: 'gelf',
        driverOpts: {
            'gelf-tag': 'taggyMcTagface',
            'gelf-address': 'udp://127.0.0.1:12201'
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

        // XXX timeout is here because we don't have a good way to know when
        // these things are "ready". If we figure one out, use that instead.
        setTimeout(function () {
            t.end();
        }, 1000);
    });
});

test('send a gelf message', function _test(t) {
    var delta;
    var idx;
    var msg;
    var received = 0;

    NOTIFIER.on('message', function onMessage(msg) {
        var now = (new Date()).getTime();

        // receive the test messages
        received++;
        if (received === 1) {
            t.equal(msg.short_message, 'stdout gelf test message',
                'check message');
            t.equal(msg.level, 6, 'level 6 for stdout');
        } else {
            t.equal(msg.short_message, 'stderr gelf test message',
                'check message');
            t.equal(msg.level, 3, 'level 3 for stderr');
        }
        t.equal(msg.version, '1.1', 'check version');
        t.equal(msg.host, os.hostname(), 'check hostname');
        t.equal(msg.full_message, '', 'check full_message');
        delta = now - (msg.timestamp * 1000);
        t.ok(delta < 10000, 'timestamp less than 10s old (' + delta + 'ms)');
        t.equal(msg.facility, '', 'check facility');
        t.equal(msg._command, '/bin/bash', 'check _command');
        t.equal(msg._container_id, GENERATOR.containerId, 'check _container_id');
        t.equal(msg._container_name, GENERATOR.containerName, 'check _container_name');
        t.equal(msg._created, GENERATOR.createTime, 'check _created');
        t.equal(msg._image_id, GENERATOR.imageId, 'check _image_id');
        t.equal(msg._image_name, GENERATOR.imageName, 'check _image_name');
        t.equal(msg._tag, GENERATOR.driverOpts['gelf-tag'], 'check _tag');

        if (received === 2) {
            // got both!
            t.end();
        }
    });

    // send the test message
    GENERATOR.writeStdout('stdout gelf test message\n');
    GENERATOR.writeStderr('stderr gelf test message\n');
});

test('teardown', function _test(t) {
    t.ok(true, 'tearing down');

    GENERATOR.stop();
    SINK.stop();

    t.end();
});
