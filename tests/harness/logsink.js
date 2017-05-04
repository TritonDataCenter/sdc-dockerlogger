/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var fork = require('child_process').fork;

var assert = require('assert-plus');

function LogSink(opts) {
    assert.object(opts, 'opts');
    assert.string(opts.driver, 'opts.driver');

    var self = this;

    self.driver = opts.driver;

    self.start();
}

LogSink.prototype.start = function start() {
    var self = this;
    var sink_backend = __dirname + '/logsink_' + self.driver + '.js';

    self.child = fork(
        sink_backend,
        [],
        {stdio: [0, 1, 2, 'ipc']}
    );

    // .on('message', function(msg) {})
    // .on('exit', function(code) {})
    self.on = self.child.on;
};

LogSink.prototype.stop = function stop() {
    var self = this;

    self.child.kill();
    delete self.on;
    delete self.child;
};

module.exports = LogSink;
