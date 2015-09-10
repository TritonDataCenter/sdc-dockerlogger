ELFEDIT=/usr/bin/elfedit
GOPATH=$(PWD)
TARGETS=dockerlogger dockerlogger.smartos

.PHONY: all

all: dockerlogger.smartos

dockerlogger.smartos: dockerlogger
	/usr/bin/elfedit -e 'ehdr:ei_osabi ELFOSABI_SOLARIS' dockerlogger dockerlogger.smartos

dockerlogger: dockerlogger.go
	GOPATH=$(GOPATH) go build

fmt:
	gofmt -w dockerlogger.go

clean:
	rm -f $(TARGETS)
