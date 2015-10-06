/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/docker/docker/daemon/logger"
	"github.com/docker/docker/pkg/stringutils"
	"io"
	"log"
	"os"
	"time"

	// Importing packages here only to make sure their init gets called and
	// therefore they register themselves to the logdriver factory.
	_ "github.com/docker/docker/daemon/logger/fluentd"
	_ "github.com/docker/docker/daemon/logger/gelf"
	_ "github.com/docker/docker/daemon/logger/syslog"
)

const VERSION = "0.1.0"

func usage(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "dockerlogger: %s\n", err.Error())
	}
	fmt.Fprintf(os.Stderr, "Usage: %s <version|fluentd|gelf|syslog>'\n", os.Args[0])
	os.Exit(1)
}

func missingEnv(key string) {
	fmt.Fprintf(os.Stderr, "dockerlogger: missing '%s' environment variable\n", key)
	os.Exit(1)
}

//
// taken from:
// https://github.com/docker/docker/blob/65e43593f58b2eb0666a0cc90609aa3f56c6af6a/daemon/daemon.go#L441-L457
//
func getEntrypointAndArgs(configEntrypoint *stringutils.StrSlice, configCmd *stringutils.StrSlice) (string, []string) {
	var (
		entrypoint string
		args       []string
	)

	cmdSlice := configCmd.Slice()
	if configEntrypoint.Len() != 0 {
		eSlice := configEntrypoint.Slice()
		entrypoint = eSlice[0]
		args = append(eSlice[1:], cmdSlice...)
	} else {
		entrypoint = cmdSlice[0]
		args = cmdSlice[1:]
	}
	return entrypoint, args
}

func main() {
	var drv_config map[string]string
	var container_entrypoint_array *stringutils.StrSlice
	var container_cmd_array *stringutils.StrSlice

	if len(os.Args) != 2 {
		usage(errors.New("invalid number of arguments"))
	}

	if os.Args[1] == "version" {
		fmt.Printf("%s\n", VERSION)
		os.Exit(0)
	}

	// Special case for testing that we're building ctx correctly
	drv, err := logger.GetLogDriver(os.Args[1])
	if os.Args[1] != "ctxdump" {
		if err != nil {
			usage(err)
		}
	}

	/*
	 * these first 2 are required
	 */

	dockerlog_config := os.Getenv("DOCKERLOG_CONFIG")
	if len(dockerlog_config) == 0 {
		missingEnv("DOCKERLOG_CONFIG")
	}
	container_id := os.Getenv("DOCKERLOG_CONTAINERID")
	if len(container_id) == 0 {
		missingEnv("DOCKERLOG_CONTAINERID")
	}

	// Turn DOCKERLOG_CONFIG to an object
	err = json.Unmarshal([]byte(dockerlog_config), &drv_config)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %s\n", err)
		os.Exit(1)
	}

	/*
	 * now optional ones
	 */

	container_createtime_raw := os.Getenv("DOCKERLOG_CREATETIME")
	container_createtime, _ := time.Parse(time.RFC3339, container_createtime_raw)
	container_imageid := os.Getenv("DOCKERLOG_IMAGEID")
	container_imagename := os.Getenv("DOCKERLOG_IMAGENAME")
	container_name := os.Getenv("DOCKERLOG_CONTAINERNAME")

	/*
	 * entrypoint and args are "special"
	 */
	container_entrypoint_raw := os.Getenv("DOCKERLOG_ENTRYPOINT")
	container_cmd_raw := os.Getenv("DOCKERLOG_CMD")

	err = json.Unmarshal([]byte(dockerlog_config), &drv_config)
	err = json.Unmarshal([]byte(container_entrypoint_raw), &container_entrypoint_array)
	if err != nil {
		container_entrypoint_array = stringutils.NewStrSlice()
	}
	err = json.Unmarshal([]byte(container_cmd_raw), &container_cmd_array)
	if err != nil {
		container_cmd_array = stringutils.NewStrSlice()
	}

	if len(container_cmd_array.Slice()) == 0 && len(container_entrypoint_array.Slice()) == 0 {
		fmt.Fprintf(os.Stderr, "error: both CMD and ENTRYPOINT are empty\n")
		os.Exit(1)
	}

	container_entrypoint, container_args := getEntrypointAndArgs(container_entrypoint_array, container_cmd_array)

	ctx := logger.Context{
		Config:              drv_config,
		ContainerID:         container_id,
		ContainerName:       container_name,
		ContainerCreated:    container_createtime,
		ContainerImageID:    container_imageid,
		ContainerImageName:  container_imagename,
		ContainerEntrypoint: container_entrypoint,
		ContainerArgs:       container_args,
	}

	if os.Args[1] == "ctxdump" {
		b, err := json.Marshal(ctx)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: %s\n", err)
		}
		fmt.Fprintf(os.Stderr, "%s\n", b)
		os.Exit(0)
	}

	l_drv, err := drv(ctx)
	if err != nil {
		log.Fatal(err)
	}

	copier := logger.NewCopier(
		container_id,
		map[string]io.Reader{
			"stdout": os.NewFile(3, "stdout"),
			"stderr": os.NewFile(4, "stderr"),
		},
		l_drv,
	)
	copier.Run()
	copier.Wait()
}
