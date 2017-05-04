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

// on('error') just let us die

process.on('SIGTERM', function () {
    server.close();
});

server.listen(12201);
