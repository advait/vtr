//go:build asan
// +build asan

package ghostty

/*
#cgo CFLAGS: -I${SRCDIR}/shim/zig-out-asan/include
#cgo LDFLAGS: -L${SRCDIR}/shim/zig-out-asan/lib -lvtr-ghostty-vt
#cgo linux LDFLAGS: -Wl,-z,noexecstack
*/
import "C"
