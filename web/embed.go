package web

import "embed"

// DistFS contains the built web UI assets.
//go:embed dist/*
var DistFS embed.FS
