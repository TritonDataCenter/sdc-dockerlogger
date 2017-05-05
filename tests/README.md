# dockerlogger tests

## Overview

These dockerlogger tests work by creating two backend child processes. One is a
'dockerlogger' (created using the tests/harness/loggen.js) and the other is a
receiver (created using the tests/harness/logsink.js). The logsink has
different backends for the different protocols we support, but each tool
basically exists only to receive logged messages using the proper protocol and
output these messages as JSON objects.

With the generator and the sink, we can simulate sending messages either to
stdout or stderr of the docker init process by calling the .writeStdout() and
.writeStderr() methods on the generator. These will write to descriptors 3 and
4 just like dockerinit does, and since we've passed the dockerlogger arguments
via the environment (handled by loggen.js). The "real" dockerlogger process will
handle these messages which should be captured by our "sinks" which emulate a
remote logging system. We can then compare the messages received by the sink
and what we'd expect the logger to see.

## Running the tests

Run `make test` at the top-level of this repo. It assumes you've got node and
npm installed.
