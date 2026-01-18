package server

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"syscall"
	"unicode/utf8"
)

func parseSignal(signal string) (os.Signal, error) {
	trimmed := strings.TrimSpace(signal)
	if trimmed == "" {
		return nil, nil
	}
	normalized := strings.ToUpper(trimmed)
	normalized = strings.TrimPrefix(normalized, "SIG")
	switch normalized {
	case "TERM":
		return syscall.SIGTERM, nil
	case "KILL":
		return syscall.SIGKILL, nil
	case "INT":
		return syscall.SIGINT, nil
	default:
		return nil, fmt.Errorf("unsupported signal %q", signal)
	}
}

func keyToBytes(key string) ([]byte, error) {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" {
		return nil, errors.New("key is required")
	}
	k := strings.ToLower(trimmed)
	switch k {
	case "enter", "return":
		return []byte{'\r'}, nil
	case "tab":
		return []byte{'\t'}, nil
	case "escape", "esc":
		return []byte{0x1b}, nil
	case "backspace":
		return []byte{0x7f}, nil
	case "delete", "del":
		return []byte("\x1b[3~"), nil
	case "up":
		return []byte("\x1b[A"), nil
	case "down":
		return []byte("\x1b[B"), nil
	case "right":
		return []byte("\x1b[C"), nil
	case "left":
		return []byte("\x1b[D"), nil
	case "home":
		return []byte("\x1b[H"), nil
	case "end":
		return []byte("\x1b[F"), nil
	case "pageup":
		return []byte("\x1b[5~"), nil
	case "pagedown":
		return []byte("\x1b[6~"), nil
	}

	if strings.HasPrefix(k, "ctrl+") || strings.HasPrefix(k, "ctrl-") {
		part := k[5:]
		return ctrlSequence(part)
	}
	if strings.HasPrefix(k, "alt+") || strings.HasPrefix(k, "alt-") {
		part := k[4:]
		return altSequence(part)
	}
	if strings.HasPrefix(k, "meta+") || strings.HasPrefix(k, "meta-") {
		part := k[5:]
		return altSequence(part)
	}

	if runeCount := utf8.RuneCountInString(k); runeCount == 1 {
		return []byte(k), nil
	}

	return nil, fmt.Errorf("unknown key %q", key)
}

func ctrlSequence(part string) ([]byte, error) {
	if part == "" {
		return nil, errors.New("ctrl key requires a target")
	}
	if part == "space" {
		return []byte{0x00}, nil
	}
	r, size := utf8.DecodeRuneInString(part)
	if r == utf8.RuneError || size != len(part) {
		return nil, fmt.Errorf("ctrl key must be a single character: %q", part)
	}
	if r > 0x7f {
		return nil, fmt.Errorf("ctrl key must be ASCII: %q", part)
	}
	if r >= 'a' && r <= 'z' {
		r = r - 'a' + 'A'
	}
	return []byte{byte(r) & 0x1f}, nil
}

func altSequence(part string) ([]byte, error) {
	if part == "" {
		return nil, errors.New("alt key requires a target")
	}
	if part == "space" {
		return []byte{0x1b, ' '}, nil
	}
	if utf8.RuneCountInString(part) != 1 {
		return nil, fmt.Errorf("alt key must be a single character: %q", part)
	}
	return append([]byte{0x1b}, []byte(part)...), nil
}
