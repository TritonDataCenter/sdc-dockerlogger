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

TMP=/var/tmp

mkdir -p /opt/smartdc/docker/bin
cp ${TMP}/dockerlogger/dockerlogger /opt/smartdc/docker/bin/
cp ${TMP}/dockerlogger/dockerlogger-setup.sh /opt/smartdc/docker/bin/
chmod 0755 /opt/smartdc/docker/bin/*
cp ${TMP}/dockerlogger/dockerlogger.xml /var/svc/manifest/site/
svcadm disable dockerlogger || /bin/true
svccfg delete dockerlogger || /bin/true
svccfg import /var/svc/manifest/site/dockerlogger.xml
svcadm refresh dockerlogger

exit 0
