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

function parser(msg) {
    var matches = msg.match(/^<(\d+)> ?([\d\-\:\.TZ]+) (\w+) (\w+)\/(\w+)\[(\d+)\]: (.*)$/);
    var obj = {};

    obj.originalMessage = msg;

    if (matches) {
        obj.prival = matches[1];
        obj.timestamp = new Date(matches[2]);
        obj.host = matches[3];
        obj.appName = matches[4];
        obj.tag = matches[5];
        obj.pid = matches[6];
        obj.message = matches[7];
    }

    return obj;
}

var server = net.createServer(function(socket) {
    var lstream = new lineStream({encoding: 'utf8'});

    lstream.on('readable', function _onReadable() {
        var line;
        var parsedMessage;

        // read the first line
        line = lstream.read();

        while (line !== null) {
            // Docker does not seem to generate correct syslog messages. It's
            // amazing they work at all. None of the parsers I've been able to
            // find can parse them correctly. The newest versions of Docker do
            // not use the golang syslog module as that's deprecated. And some
            // bugs have been fixed in 3rd party modules like:
            //
            // https://github.com/RackSec/srslog/issues/15
            //
            // Until there are valid messages, we'll just parse manually.
            parsedMessage = parser(line);
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
