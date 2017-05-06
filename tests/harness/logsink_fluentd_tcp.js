#!/usr/bin/env node

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var net = require('net');

var assert = require('assert-plus');
var msgpack = require("msgpack-lite");

var server = net.createServer(function(socket) {
    var decodeStream = msgpack.createDecodeStream();

    // See: https://github.com/fluent/fluentd/wiki/Forward-Protocol-Specification-v1#message-modes
    socket.pipe(decodeStream).on('data', function _onData(msg) {
        var obj = {};

        assert.equal(msg.length, 4, 'expected 4 fields');

        obj.tag = msg[0];
        obj.time = msg[1];
        obj.record = msg[2];
        obj.option = msg[3];

        process.send(obj);
    });
});

server.on('listening', function _onListening() {
    process.send({LOGSINK: 'listening'});
});

server.listen(24220, '127.0.0.1');
