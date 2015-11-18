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

# Ensure the directory exists.
mkdir -p /lib/sdc/docker

if ! mount | grep "^/lib/sdc/docker/logger"; then
    # Existing /lib/sdc/docker/logger would not be a mount but a file. This
    # might be left behind from a previous setup where we copied the file
    # instead of mounting. In any case we'll remove it.
    rm -f /lib/sdc/docker/logger
fi

# We need this to exist so we can mount over it
if [[ ! -e /lib/sdc/docker/logger ]]; then
    # create a file so we can mount over it
    touch /lib/sdc/docker/logger
fi

# Now we know that we have /lib/sdc/docker/logger and it's either an empty file
# we just created, or it's a previous mount. In either case, we'll just mount
# over it now.
mount -O -r -F lofs /opt/smartdc/docker/bin/dockerlogger /lib/sdc/docker/logger

exit 0
