package server

import (
	"bytes"
	"testing"
)

func TestKeyToBytesPreservesCase(t *testing.T) {
	got, err := keyToBytes("A")
	if err != nil {
		t.Fatalf("keyToBytes: %v", err)
	}
	if string(got) != "A" {
		t.Fatalf("got %q", string(got))
	}
}

func TestKeyToBytesAltPreservesCase(t *testing.T) {
	got, err := keyToBytes("Alt+X")
	if err != nil {
		t.Fatalf("keyToBytes: %v", err)
	}
	want := []byte{0x1b, 'X'}
	if !bytes.Equal(got, want) {
		t.Fatalf("got %v want %v", got, want)
	}
}

func TestKeyToBytesCtrlC(t *testing.T) {
	got, err := keyToBytes("ctrl+c")
	if err != nil {
		t.Fatalf("keyToBytes: %v", err)
	}
	want := []byte{0x03}
	if !bytes.Equal(got, want) {
		t.Fatalf("got %v want %v", got, want)
	}
}
