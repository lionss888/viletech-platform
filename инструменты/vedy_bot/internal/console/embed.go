package console

import "embed"

// UI holds the embedded operator console static files.
//
//go:embed ui/*
var UI embed.FS
