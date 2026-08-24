#!/bin/sh
set -eu
cd "$(dirname "$0")"
python3 machine_transfer.py export
