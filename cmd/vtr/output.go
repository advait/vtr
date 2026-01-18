package main

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"text/tabwriter"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type outputFormat string

const (
	outputHuman outputFormat = "human"
	outputJSON  outputFormat = "json"
)

type jsonSession struct {
	Coordinator string `json:"coordinator,omitempty"`
	Name        string `json:"name"`
	Status      string `json:"status"`
	Cols        int32  `json:"cols"`
	Rows        int32  `json:"rows"`
	ExitCode    *int32 `json:"exit_code,omitempty"`
	CreatedAt   string `json:"created_at,omitempty"`
	ExitedAt    string `json:"exited_at,omitempty"`
}

type jsonList struct {
	Sessions []jsonSession `json:"sessions"`
}

type jsonSessionEnvelope struct {
	Session jsonSession `json:"session"`
}

type jsonScreen struct {
	Name       string          `json:"name"`
	Cols       int32           `json:"cols"`
	Rows       int32           `json:"rows"`
	CursorX    int32           `json:"cursor_x"`
	CursorY    int32           `json:"cursor_y"`
	ScreenRows []jsonScreenRow `json:"screen_rows"`
}

type jsonScreenEnvelope struct {
	Screen jsonScreen `json:"screen"`
}

type jsonScreenRow struct {
	Cells []jsonScreenCell `json:"cells"`
}

type jsonScreenCell struct {
	Char       string `json:"char"`
	FgColor    int32  `json:"fg_color"`
	BgColor    int32  `json:"bg_color"`
	Attributes uint32 `json:"attributes"`
}

type jsonOK struct {
	OK bool `json:"ok"`
}

func writeJSON(w io.Writer, v any) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(v)
}

func statusString(status proto.SessionStatus) string {
	switch status {
	case proto.SessionStatus_SESSION_STATUS_RUNNING:
		return "running"
	case proto.SessionStatus_SESSION_STATUS_EXITED:
		return "exited"
	default:
		return "unknown"
	}
}

func sessionToJSON(session *proto.Session, coordinator string) jsonSession {
	if session == nil {
		return jsonSession{}
	}
	out := jsonSession{
		Coordinator: coordinator,
		Name:        session.Name,
		Status:      statusString(session.Status),
		Cols:        session.Cols,
		Rows:        session.Rows,
		CreatedAt:   formatTimestamp(session.CreatedAt),
		ExitedAt:    formatTimestamp(session.ExitedAt),
	}
	if session.Status == proto.SessionStatus_SESSION_STATUS_EXITED {
		exitCode := session.ExitCode
		out.ExitCode = &exitCode
	}
	return out
}

func formatTimestamp(ts *timestamppb.Timestamp) string {
	if ts == nil || !ts.IsValid() {
		return ""
	}
	return ts.AsTime().UTC().Format(time.RFC3339)
}

func formatAge(ts *timestamppb.Timestamp) string {
	if ts == nil || !ts.IsValid() {
		return "-"
	}
	age := time.Since(ts.AsTime())
	if age < 0 {
		age = -age
	}
	if age < time.Minute {
		return fmt.Sprintf("%ds", int(age.Seconds()))
	}
	if age < time.Hour {
		return fmt.Sprintf("%dm", int(age.Minutes()))
	}
	if age < 24*time.Hour {
		return fmt.Sprintf("%dh", int(age.Hours()))
	}
	return fmt.Sprintf("%dd", int(age.Hours()/24))
}

func printListHuman(w io.Writer, sessions []*proto.Session, coordinator string) {
	tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
	fmt.Fprintln(tw, "COORDINATOR\tSESSION\tSTATUS\tCOLSxROWS\tAGE")
	for _, session := range sessions {
		if session == nil {
			continue
		}
		fmt.Fprintf(tw, "%s\t%s\t%s\t%dx%d\t%s\n",
			coordinator,
			session.Name,
			statusString(session.Status),
			session.Cols,
			session.Rows,
			formatAge(session.CreatedAt),
		)
	}
	_ = tw.Flush()
}

func printSessionHuman(w io.Writer, session *proto.Session, coordinator string) {
	if session == nil {
		fmt.Fprintln(w, "(no session)")
		return
	}
	fmt.Fprintf(w, "Name: %s\n", session.Name)
	fmt.Fprintf(w, "Coordinator: %s\n", coordinator)
	fmt.Fprintf(w, "Status: %s\n", statusString(session.Status))
	fmt.Fprintf(w, "Size: %dx%d\n", session.Cols, session.Rows)
	if session.Status == proto.SessionStatus_SESSION_STATUS_EXITED {
		fmt.Fprintf(w, "Exit Code: %d\n", session.ExitCode)
	}
	if ts := formatTimestamp(session.CreatedAt); ts != "" {
		fmt.Fprintf(w, "Created: %s\n", ts)
	}
	if ts := formatTimestamp(session.ExitedAt); ts != "" {
		fmt.Fprintf(w, "Exited: %s\n", ts)
	}
}

func printScreenHuman(w io.Writer, resp *proto.GetScreenResponse) {
	if resp == nil {
		fmt.Fprintln(w, "(no screen)")
		return
	}
	fmt.Fprintf(w, "Screen: %s (%dx%d)\n", resp.Name, resp.Cols, resp.Rows)
	for _, row := range resp.ScreenRows {
		var b strings.Builder
		for _, cell := range row.Cells {
			if cell == nil || cell.Char == "" {
				b.WriteByte(' ')
				continue
			}
			b.WriteString(cell.Char)
		}
		fmt.Fprintln(w, b.String())
	}
}

func screenToJSON(resp *proto.GetScreenResponse) jsonScreen {
	if resp == nil {
		return jsonScreen{}
	}
	rows := make([]jsonScreenRow, len(resp.ScreenRows))
	for i, row := range resp.ScreenRows {
		cells := make([]jsonScreenCell, len(row.Cells))
		for j, cell := range row.Cells {
			if cell == nil {
				cells[j] = jsonScreenCell{Char: " "}
				continue
			}
			cells[j] = jsonScreenCell{
				Char:       cell.Char,
				FgColor:    cell.FgColor,
				BgColor:    cell.BgColor,
				Attributes: cell.Attributes,
			}
		}
		rows[i] = jsonScreenRow{Cells: cells}
	}
	return jsonScreen{
		Name:       resp.Name,
		Cols:       resp.Cols,
		Rows:       resp.Rows,
		CursorX:    resp.CursorX,
		CursorY:    resp.CursorY,
		ScreenRows: rows,
	}
}
