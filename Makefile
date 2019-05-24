#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

#
# Copyright 2019 Joyent, Inc.
#


NAME=dockerlogger

ELFEDIT=/usr/bin/elfedit
GOPATH=$(PWD)/vendor
TARGETS=dockerlogger dockerlogger.smartos

# Set this so that we validate the manifest as part of
# 'make check'
SMF_MANIFESTS=smf/dockerlogger.xml

_AWK := $(shell (which gawk >/dev/null && echo gawk) \
	|| (which nawk >/dev/null && echo nawk) \
	|| echo awk)
BRANCH := $(shell git symbolic-ref HEAD | $(_AWK) -F/ '{print $$3}')

ENGBLD_REQUIRE := $(shell git submodule update --init deps/eng)
include ./deps/eng/tools/mk/Makefile.defs
TOP ?= $(error Unable to access eng.git submodule Makefiles.)
include ./deps/eng/tools/mk/Makefile.smf.defs

DESTDIR ?= .

GOROOT ?= /root/opt/go

ifeq ($(shell uname -s),Darwin)
	TARGET = dockerlogger
else
	TARGET = dockerlogger.smartos
endif

CLEAN_FILES = $(TARGETS) \
	      $(DESTDIR)/dockerlogger-*.manifest \
	      $(DESTDIR)/dockerlogger-*.md5sum \
	      $(DESTDIR)/dockerlogger-*.sh \
	      build

.PHONY: all
all: $(TARGET)

dockerlogger.smartos: dockerlogger
	/usr/bin/elfedit -e 'ehdr:ei_osabi ELFOSABI_SOLARIS' dockerlogger dockerlogger.smartos

dockerlogger: dockerlogger.go
	GOPATH=$(GOPATH) $(GOROOT)/bin/go build $<

.PHONY: fmt
fmt:
	$(GOROOT)/bin/gofmt -w dockerlogger.go

.PHONY: pkg
pkg: $(DESTDIR) dockerlogger.smartos
	./tools/mk-shar -b "$(BRANCH)" -o $(DESTDIR)

.PHONY: publish
publish: pkg
	mkdir -p $(ENGBLD_BITS_DIR)/$(NAME)
	cp $(DESTDIR)/dockerlogger-*.manifest \
	    $(DESTDIR)/dockerlogger-*.md5sum \
	    $(DESTDIR)/dockerlogger-*.sh \
	    $(ENGBLD_BITS_DIR)/$(NAME)

node_modules/tape/bin/tape:
	@npm install

.PHONY: test
test: $(TARGET) node_modules/tape/bin/tape
	@ls -1 ./tests/test_*.js | xargs -L 1 node

$(DESTDIR):
	mkdir -p $@

include ./deps/eng/tools/mk/Makefile.targ
include ./deps/eng/tools/mk/Makefile.smf.targ
