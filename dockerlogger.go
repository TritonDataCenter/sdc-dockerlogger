package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/docker/docker/daemon/logger"
	"log"
	"os"
	"sync"

	// Importing packages here only to make sure their init gets called and
	// therefore they register themselves to the logdriver factory.
	_ "github.com/docker/docker/daemon/logger/fluentd"
	_ "github.com/docker/docker/daemon/logger/gelf"
	_ "github.com/docker/docker/daemon/logger/syslog"
)

func streamFromDescriptor(fd uintptr, name string, ctx logger.Context, l_drv logger.Logger, wg sync.WaitGroup) {
	f := os.NewFile(fd, name)

	defer wg.Done()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		fmt.Println(line)

		msg := &logger.Message{
			ContainerID: ctx.ContainerID,
			Line:        []byte(line),
			Source:      name,
		}

		if err := l_drv.Log(msg); err != nil {
			log.Fatal(err)
		}
	}
}

func usage(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "dockerlogger: %s\n", err.Error())
	}
	fmt.Fprintf(os.Stderr, "Usage: %s <fluentd|gelf|syslog>'\n", os.Args[0])
	os.Exit(1)
}

func missingEnv(key string) {
	fmt.Fprintf(os.Stderr, "dockerlogger: missing '%s' environment variable\n", key)
	os.Exit(1)
}

func main() {
	var drv_config map[string]string
	var wg sync.WaitGroup

	if len(os.Args) != 2 {
		usage(errors.New("invalid number of arguments"))
	}

	drv, err := logger.GetLogDriver(os.Args[1])
	if err != nil {
		usage(err)
	}

	dockerlog_config := os.Getenv("DOCKERLOG_CONFIG")
	if len(dockerlog_config) == 0 {
		missingEnv("DOCKERLOG_CONFIG")
	}
	container_id := os.Getenv("DOCKERLOG_CONTAINERID")
	if len(container_id) == 0 {
		missingEnv("DOCKERLOG_CONTAINERID")
	}
	container_name := os.Getenv("DOCKERLOG_CONTAINERNAME")
	if len(container_name) == 0 {
		missingEnv("DOCKERLOG_CONTAINERNAME")
	}

	// Turn DOCKERLOG_CONFIG to an object
	err = json.Unmarshal([]byte(dockerlog_config), &drv_config)
	bolB, _ := json.Marshal(drv_config)
	fmt.Println(string(bolB))

	ctx := logger.Context{
		Config:        drv_config,
		ContainerID:   container_id,
		ContainerName: container_name,
	}

	l_drv, err := drv(ctx)
	if err != nil {
		log.Fatal(err)
	}

	wg.Add(2)
	go streamFromDescriptor(3, "stdout", ctx, l_drv, wg)
	go streamFromDescriptor(4, "stderr", ctx, l_drv, wg)
	wg.Wait()
}
