/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var fork = require('child_process').fork;
var LogGen = require('./harness/loggen');
var LogSink = require('./harness/logsink');
var test = require('tape');

var INBOX = [];
var GENERATOR;
var SINK;

test('setup', function _test(t) {
    t.ok(true, 'setting up');

    SINK = new LogSink({
        driver: 'gelf_udp'
    });

    SINK.on('message', function (msg) {
        console.log('message from sink: ' + msg);
    });

    SINK.on('exit', function (code) {
        console.log('exit from sink: ' + code);
    });

    GENERATOR = new LogGen({
        driver: 'gelf',
        driverOpts: {
            'gelf-tag': 'taggyMcTagface',
            'gelf-address': 'udp://127.0.0.1:12201'
        }
    });

    t.ok(GENERATOR.pid, 'forked loggen_gelf_udp[' + GENERATOR.pid + ']');

    t.end();
});

test('send a gelf message', function _test(t) {
    GENERATOR.writeStdout('hello');
    t.ok(true, 'did not blow up');
    setTimeout(function () {
        t.end();
    }, 30000);
});

test('teardown', function _test(t) {
    t.ok(true, 'tearing down');

    GENERATOR.stop();
    SINK.stop();

    t.end();
});
