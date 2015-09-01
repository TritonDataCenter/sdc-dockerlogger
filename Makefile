GOPATH=$(PWD)
TARGETS=dockerlogger

all:
	GOPATH=$(GOPATH) go build

fmt:
	gofmt -w dockerlogger.go

clean:
	rm -f $(TARGETS)
