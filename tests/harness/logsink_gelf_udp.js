#!/usr/bin/env node

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var gelfserver = require('graygelf/server');
var server = gelfserver();

server.on('message', function onMessage(gelf) {
    // Send the message to parent that forked() us
    process.send(gelf);
});

process.on('SIGTERM', function () {
    process.send({LOGSINK: 'SIGTERM'});
    server.close();
});

// pretend we know when we're listening, since gelfserver doesn't tell us.
setTimeout(function () {
    process.send({LOGSINK: 'listening'});
}, 1000);

server.listen(12201);
