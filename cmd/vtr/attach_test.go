package main

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestInputForKeyControlBytes(t *testing.T) {
	tests := []struct {
		name string
		msg  tea.KeyMsg
		want byte
	}{
		{name: "ctrl+c", msg: tea.KeyMsg{Type: tea.KeyCtrlC}, want: 0x03},
		{name: "ctrl+d", msg: tea.KeyMsg{Type: tea.KeyCtrlD}, want: 0x04},
		{name: "ctrl+l", msg: tea.KeyMsg{Type: tea.KeyCtrlL}, want: 0x0c},
		{name: "enter", msg: tea.KeyMsg{Type: tea.KeyEnter}, want: 0x0d},
		{name: "tab", msg: tea.KeyMsg{Type: tea.KeyTab}, want: 0x09},
		{name: "esc", msg: tea.KeyMsg{Type: tea.KeyEsc}, want: 0x1b},
		{name: "backspace", msg: tea.KeyMsg{Type: tea.KeyBackspace}, want: 0x7f},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key, data, ok := inputForKey(tt.msg)
			if !ok {
				t.Fatalf("expected ok")
			}
			if key != "" {
				t.Fatalf("expected empty key, got %q", key)
			}
			if len(data) != 1 || data[0] != tt.want {
				t.Fatalf("expected byte 0x%02x, got %v", tt.want, data)
			}
		})
	}
}
