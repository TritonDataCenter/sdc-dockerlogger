#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

#
# Copyright (c) 2018, Joyent, Inc.
#

ELFEDIT=/usr/bin/elfedit
GOPATH=$(PWD)/vendor
TARGETS=dockerlogger dockerlogger.smartos

_AWK := $(shell (which gawk >/dev/null && echo gawk) \
	|| (which nawk >/dev/null && echo nawk) \
	|| echo awk)
BRANCH := $(shell git symbolic-ref HEAD | $(_AWK) -F/ '{print $$3}')

DESTDIR ?= .

ifeq ($(shell uname -s),Darwin)
	TARGET = dockerlogger
else
	TARGET = dockerlogger.smartos
endif

.PHONY: all
all: $(TARGET)

dockerlogger.smartos: dockerlogger
	/usr/bin/elfedit -e 'ehdr:ei_osabi ELFOSABI_SOLARIS' dockerlogger dockerlogger.smartos

dockerlogger: dockerlogger.go
	GOPATH=$(GOPATH) go build $<

.PHONY: fmt
fmt:
	gofmt -w dockerlogger.go

.PHONY: pkg
pkg: $(DESTDIR) dockerlogger.smartos
	./tools/mk-shar -b "$(BRANCH)" -o $(DESTDIR)

.PHONY: check
check:
	@echo "No 'make check' here."

node_modules/tape/bin/tape:
	@npm install

.PHONY: test
test: $(TARGET) node_modules/tape/bin/tape
	@ls -1 ./tests/test_*.js | xargs -L 1 node

.PHONY: clean
clean:
	rm -f $(TARGETS)
	rm -f $(DESTDIR)/dockerlogger-*.manifest
	rm -f $(DESTDIR)/dockerlogger-*.md5sum
	rm -f $(DESTDIR)/dockerlogger-*.sh
	rm -rf build

$(DESTDIR):
	mkdir -p $@
