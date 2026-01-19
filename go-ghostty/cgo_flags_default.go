//go:build !asan
// +build !asan

package ghostty

/*
#cgo CFLAGS: -I${SRCDIR}/shim/zig-out/include
#cgo LDFLAGS: -L${SRCDIR}/shim/zig-out/lib -lvtr-ghostty-vt
*/
import "C"
