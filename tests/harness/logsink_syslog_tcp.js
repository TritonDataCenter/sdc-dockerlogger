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
var lineStream = require('lstream');
var syslogParser = require('glossy').Parse; // or wherever your glossy libs are

var server = net.createServer(function(socket) {
    var lstream = new lineStream({encoding: 'utf8'});

    lstream.on('readable', function _onReadable() {
        var line;
        var parsedMessage;

        // read the first line
        line = lstream.read();

        while (line !== null) {
            // The parser assumes there's a version after the '>' but docker
            // doesn't seem to do that properly, so we "fix" it here and set
            // to version 1 per RFC 5424.
            line = line.replace(/>/, '>1 ');
            parsedMessage = syslogParser.parse(line);
            process.send(parsedMessage);

            // read the next line
            line = lstream.read();
        }
    });

    socket.pipe(lstream);
});

server.on('listening', function _onListening() {
    process.send({LOGSINK: 'listening'});
});

server.listen(10514, '127.0.0.1');
