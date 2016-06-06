#!/bin/bash
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

#
# Copyright (c) 2016, Joyent, Inc.
#

set -o errexit
set -o xtrace

TMP=/var/tmp

mkdir -p /opt/smartdc/docker/bin
cp ${TMP}/dockerlogger/dockerlogger /opt/smartdc/docker/bin/
cp ${TMP}/dockerlogger/dockerlogger-setup.sh /opt/smartdc/docker/bin/
chmod 0755 /opt/smartdc/docker/bin/*

mkdir -p /opt/smartdc/docker/etc

cp ${TMP}/dockerlogger/dockerlogger.xml /var/svc/manifest/site/
svcadm disable dockerlogger || /bin/true
svccfg delete dockerlogger || /bin/true
svccfg import /var/svc/manifest/site/dockerlogger.xml
svcadm refresh dockerlogger


# Instance adoption by SAPI
export ETC_DIR=/opt/smartdc/docker/etc
export AGENT=dockerlogger

. /lib/sdc/config.sh
load_sdc_config

function fatal()
{
    echo "error: $*" >&2
    exit 1
}

function warn_and_exit()
{
    echo "warning: $*" >&2
    exit 0
}

function instance_exists()
{
    local instance_uuid=$1
    local sapi_instance=$(curl ${SAPI_URL}/instances/${instance_uuid} | json -H uuid)

    if [[ -n ${sapi_instance} ]]; then
        return 0
    else
        return 1
    fi
}

function adopt_instance_if_necessary()
{
    local instance_uuid=$(cat $ETC_DIR/$AGENT.uuid)

    # verify it exists on sapi if there is an instance uuid written to disk
    if [[ -n ${instance_uuid} ]]; then
        if ! instance_exists "$instance_uuid"; then
            adopt_instance $instance_uuid
        fi
    else
        adopt_instance $(uuid -v4)
    fi
}


function adopt_instance()
{
    local instance_uuid=$1
    echo $instance_uuid > $ETC_DIR/$AGENT

    local service_uuid=""
    local sapi_instance=""
    local i=0

    service_uuid=$(curl "${SAPI_URL}/services?type=agent&name=${AGENT}"\
        -sS -H accept:application/json | json -Ha uuid)

    [[ -n ${service_uuid} ]] || \
        warn_and_exit "Unable to get service_uuid for role ${AGENT} from SAPI"

    # BEGIN BASHSTYLED
    sapi_instance=$(curl ${SAPI_URL}/instances -sS -X POST \
        -H content-type:application/json \
        -d "{ \"service_uuid\" : \"${service_uuid}\", \"uuid\" : \"${instance_uuid}\" }" \
    | json -H uuid)
    # END BASHSTYLED

    [[ -n ${sapi_instance} ]] \
        || warn_and_exit "Unable to adopt ${instance_uuid} into SAPI"
    echo "Adopted service ${AGENT} to instance ${instance_uuid}"
}


function save_instance_uuid()
{
    local instance_uuid=$(cat $ETC_DIR/$AGENT)

    if [[ -z ${instance_uuid} ]]; then
        instance_uuid=$(uuid -v4)
        echo $instance_uuid > $ETC_DIR/$AGENT.uuid
    fi
}



exit 0
