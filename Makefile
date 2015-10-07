#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

#
# Copyright (c) 2014, Joyent, Inc.
#

ELFEDIT=/usr/bin/elfedit
GOPATH=$(PWD)/vendor
TARGETS=dockerlogger dockerlogger.smartos

.PHONY: all

all: dockerlogger.smartos

dockerlogger.smartos: dockerlogger
	/usr/bin/elfedit -e 'ehdr:ei_osabi ELFOSABI_SOLARIS' dockerlogger dockerlogger.smartos

dockerlogger: dockerlogger.go
	GOPATH=$(GOPATH) go build

fmt:
	gofmt -w dockerlogger.go

pkg: dockerlogger.smartos
	@[[ -n "$(BRANCH)" ]] || (echo "missing BRANCH="; exit 1)
	@[[ -n "$(DESTDIR)" ]] || (echo "missing DESTDIR="; exit 1)
	./tools/mk-shar -b $(BRANCH) -o $(DESTDIR)

clean:
	rm -f $(TARGETS)
	rm -rf build
