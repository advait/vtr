package transportgrpc

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

func TestNormalizeTextInput(t *testing.T) {
	cases := []struct {
		input string
		want  []byte
	}{
		{input: "", want: nil},
		{input: "hello", want: []byte("hello")},
		{input: "hello\n", want: []byte("hello\r")},
		{input: "hello\r\nworld\n", want: []byte("hello\rworld\r")},
		{input: "hello\rworld", want: []byte("hello\rworld")},
	}

	for _, tc := range cases {
		got := normalizeTextInput(tc.input)
		if !bytes.Equal(got, tc.want) {
			t.Fatalf("normalizeTextInput(%q)=%v want %v", tc.input, got, tc.want)
		}
	}
}
