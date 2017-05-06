#!/usr/bin/env node

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

var syslogParser = require('./syslog_parser');

server.on('listening', function () {
    var address = server.address();
    process.send({LOGSINK: 'listening'});
    console.error('UDP Server listening on ' + address.address + ":" + address.port);
});

server.on('message', function (message/*, remote */) {
    var parsedMessage;

    parsedMessage = syslogParser(message.toString().trim());
    process.send(parsedMessage);
});

server.bind(10514, '127.0.0.1');
