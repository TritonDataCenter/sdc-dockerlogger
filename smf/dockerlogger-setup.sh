#!/bin/bash
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

#
# Copyright (c) 2015, Joyent, Inc.
#

set -o errexit
set -o xtrace

mkdir -p /lib/sdc/docker
if [[ ! -f /lib/sdc/docker/logger ]] \
    || ! cmp /opt/smartdc/docker/bin/dockerlogger /lib/sdc/docker/logger; then

    cp /opt/smartdc/docker/bin/dockerlogger /lib/sdc/docker/logger.new \
        && mv /lib/sdc/docker/logger.new /lib/sdc/docker/logger
fi
chmod 0755 /lib/sdc/docker/logger

exit 0
