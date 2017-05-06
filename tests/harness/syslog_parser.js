#!/usr/bin/env node

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

// Docker does not seem to generate correct syslog messages. It's amazing they
// work at all. None of the parsers I've been able to find can parse them
// correctly. The newest versions of Docker do not use the golang syslog module
// as that's deprecated. And some bugs have been fixed in 3rd party modules like:
//
// https://github.com/RackSec/srslog/issues/15
//
// Until there are valid messages, we'll just parse manually.
function parser(msg) {
    var matches = msg.match(/^<(\d+)> ?([\d\-\:\.TZ]+) (\w+) (\w+)\/(\w+)\[(\d+)\]: (.*)$/);
    var obj = {};

    obj.originalMessage = msg;

    if (matches) {
        obj.prival = Number(matches[1]);
        obj.facilityId = Math.floor(obj.prival / 8);
        obj.severityId = obj.prival - (obj.facilityId * 8);
        obj.timestamp = new Date(matches[2]);
        obj.host = matches[3];
        obj.appName = matches[4];
        obj.tag = matches[5];
        obj.pid = matches[6];
        obj.message = matches[7];
    }

    return obj;
}

module.exports = parser;
