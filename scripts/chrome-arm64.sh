#!/bin/bash
# Local test launcher only: keep universal Chrome native on Apple Silicon
# even when the invoking Node.js process is running under Rosetta.
exec /usr/bin/arch -arm64 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "$@"