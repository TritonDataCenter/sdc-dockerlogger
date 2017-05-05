/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

var assert = require('assert-plus');
var spawn = require('child_process').spawn;
var uuid = require('uuid');

var VALID_DRIVERS = ['fluentd', 'gelf', 'syslog'];

function LogGen(opts) {
    assert.object(opts, 'opts');
    assert.string(opts.driver, 'opts.driver');
    assert.notEqual(VALID_DRIVERS.indexOf(opts.driver), -1,
        'Invalid driver: ' + opts.driver);
    assert.object(opts.driverOpts, 'opts.driverOpts');
    assert.optionalString(opts.containerId, 'opts.containerId');
    assert.optionalString(opts.containerName, 'opts.containerName');
    assert.optionalString(opts.createTime, 'opts.createTime');
    assert.optionalString(opts.imageId, 'opts.imageId');
    assert.optionalString(opts.imageName, 'opts.imageName');
    assert.optionalArray(opts.entrypoint, 'opts.entrypoint');
    assert.optionalArray(opts.cmd, 'opts.cmd');

    var self = this;

    self.driver = opts.driver;
    self.driverOpts = opts.driverOpts;

    self.exitCallback = opts.exitCallback;

    if (opts.containerId) {
        self.containerId = opts.containerId;
    } else {
        self.containerId = uuid.v4().split('-')[0];
    }

    if (opts.containerName) {
        self.containerName = opts.containerName;
    } else {
        self.containerName = 'container-' + self.containerId;
    }

    if (opts.createTime) {
        self.createTime = opts.createTime;
    } else {
        self.createTime = (new Date()).toISOString();
    }

    if (opts.imageId) {
        self.imageId = opts.imageId;
    } else {
        self.imageId = '1001001';
    }

    if (opts.imageName) {
        self.imageName = opts.imageName;
    } else {
        self.imageName = 'ImageName';
    }

    if (opts.entrypoint) {
        self.entrypoint = opts.entrypoint;
    } else {
        self.entrypoint = ['/bin/bash'];
    }

    if (opts.cmd) {
        self.cmd = opts.cmd;
    } else {
        self.cmd = [];
    }
}

/*
    'syslog': {
        'syslog-tag': 'dockerlogger-tag',
        'syslog-address': 'udp://127.0.0.1:514',
        'syslog-facility': 'daemon'
    }, 'fluentd': {
        'fluentd-tag': 'dockerlogger.tag',
        'fluentd-address': '127.0.0.1:24224'
    }, 'gelf': {
        'gelf-tag': 'dockerlog-tag',
        'gelf-address': 'udp://127.0.0.1:12201'
    }
*/

LogGen.prototype.start = function start(callback) {
    var self = this;

    self.child = spawn(__dirname + '/../../dockerlogger', [self.driver], {
        env: {
            'DOCKERLOG_CONFIG': JSON.stringify(self.driverOpts),
            'DOCKERLOG_CONTAINERID': self.containerId,
            'DOCKERLOG_CONTAINERNAME': self.containerName,
            'DOCKERLOG_CREATETIME': self.createTime,
            'DOCKERLOG_IMAGEID': self.imageId,
            'DOCKERLOG_IMAGENAME': self.imageName,
            'DOCKERLOG_ENTRYPOINT': JSON.stringify(self.entrypoint),
            'DOCKERLOG_CMD': JSON.stringify(self.cmd)
        },
        stdio: [
            0,
            1,
            2,
            'pipe',
            'pipe'
        ]
    });

    self.child.on('close', function (code, signal) {
        self.exitCallback(code, signal);
    });

    self.pid = self.child.pid;

    callback();
};

LogGen.prototype.stop = function stop() {
    var self = this;

    self.child.kill();
    delete self.child;
    delete self.pid;
};

LogGen.prototype.writeStdout = function writeStdout(string) {
    var self = this;

    self.child.stdio[3].write(string);
};

LogGen.prototype.writeStderr = function writeStderr(string) {
    var self = this;

    self.child.stdio[4].write(string);
};

module.exports = LogGen;
