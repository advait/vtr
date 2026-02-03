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
	ID          string `json:"id,omitempty"`
	Name        string `json:"name"`
	Status      string `json:"status"`
	Cols        int32  `json:"cols"`
	Rows        int32  `json:"rows"`
	ExitCode    *int32 `json:"exit_code,omitempty"`
	CreatedAt   string `json:"created_at,omitempty"`
	ExitedAt    string `json:"exited_at,omitempty"`
}

type sessionItem struct {
	Coordinator string
	Session     *proto.Session
}

type jsonList struct {
	Sessions     []jsonSession     `json:"sessions"`
	Coordinators []jsonCoordinator `json:"coordinators,omitempty"`
}

type jsonSessionEnvelope struct {
	Session jsonSession `json:"session"`
}

type jsonScreen struct {
	ID         string          `json:"id,omitempty"`
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

type jsonSend struct {
	OK       bool `json:"ok"`
	Idle     bool `json:"idle,omitempty"`
	TimedOut bool `json:"timed_out,omitempty"`
}

type jsonGrepMatch struct {
	LineNumber    int32    `json:"line_number"`
	Line          string   `json:"line"`
	ContextBefore []string `json:"context_before,omitempty"`
	ContextAfter  []string `json:"context_after,omitempty"`
}

type jsonGrep struct {
	Matches []jsonGrepMatch `json:"matches"`
}

type jsonWait struct {
	Matched     bool   `json:"matched"`
	MatchedLine string `json:"matched_line,omitempty"`
	TimedOut    bool   `json:"timed_out"`
}

type jsonIdle struct {
	Idle         bool              `json:"idle"`
	TimedOut     bool              `json:"timed_out"`
	IdleSessions []jsonIdleSession `json:"idle_sessions,omitempty"`
}

type jsonIdleSession struct {
	Coordinator string      `json:"coordinator,omitempty"`
	ID          string      `json:"id,omitempty"`
	Name        string      `json:"name"`
	Idle        bool        `json:"idle"`
	TimedOut    bool        `json:"timed_out"`
	Screen      *jsonScreen `json:"screen,omitempty"`
}

type jsonCoordinator struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	Error string `json:"error,omitempty"`
}

type jsonCoordinators struct {
	Coordinators []jsonCoordinator `json:"coordinators"`
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
		ID:          session.GetId(),
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

func sessionsToJSON(items []sessionItem) jsonList {
	out := make([]jsonSession, 0, len(items))
	for _, item := range items {
		out = append(out, sessionToJSON(item.Session, item.Coordinator))
	}
	return jsonList{Sessions: out}
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

func printListHuman(w io.Writer, items []sessionItem) {
	tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
	fmt.Fprintln(tw, "COORDINATOR\tSESSION\tSTATUS\tCOLSxROWS\tAGE")
	for _, item := range items {
		if item.Session == nil {
			continue
		}
		fmt.Fprintf(tw, "%s\t%s\t%s\t%dx%d\t%s\n",
			item.Coordinator,
			item.Session.Name,
			statusString(item.Session.Status),
			item.Session.Cols,
			item.Session.Rows,
			formatAge(item.Session.CreatedAt),
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
	fmt.Fprintln(w, screenToText(resp, false))
}

func screenToText(resp *proto.GetScreenResponse, includeANSI bool) string {
	if resp == nil {
		return ""
	}
	width := int(resp.Cols)
	if width <= 0 {
		for _, row := range resp.ScreenRows {
			if row != nil && len(row.Cells) > width {
				width = len(row.Cells)
			}
		}
	}
	lines := make([]string, len(resp.ScreenRows))
	for i, row := range resp.ScreenRows {
		if includeANSI {
			lines[i] = renderRow(row, width, i, -1, -1, false)
			continue
		}
		if width <= 0 {
			lines[i] = ""
			continue
		}
		var b strings.Builder
		b.Grow(width)
		for col := 0; col < width; col++ {
			cell := (*proto.ScreenCell)(nil)
			if row != nil && col < len(row.Cells) {
				cell = row.Cells[col]
			}
			if cell == nil || cell.Char == "" {
				b.WriteByte(' ')
				continue
			}
			b.WriteString(cell.Char)
		}
		lines[i] = strings.TrimRight(b.String(), " ")
	}
	return strings.Join(lines, "\n")
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
		ID:         resp.GetId(),
		Name:       resp.Name,
		Cols:       resp.Cols,
		Rows:       resp.Rows,
		CursorX:    resp.CursorX,
		CursorY:    resp.CursorY,
		ScreenRows: rows,
	}
}

func screenJSONFromProto(resp *proto.GetScreenResponse) *jsonScreen {
	if resp == nil {
		return nil
	}
	screen := screenToJSON(resp)
	return &screen
}

func printGrepHuman(w io.Writer, matches []*proto.GrepMatch) {
	for i, match := range matches {
		if match == nil {
			continue
		}
		base := int(match.LineNumber) - len(match.ContextBefore)
		for idx, line := range match.ContextBefore {
			fmt.Fprintf(w, "scrollback:%d: %s\n", base+idx, line)
		}
		fmt.Fprintf(w, "scrollback:%d: %s\n", match.LineNumber, match.Line)
		for idx, line := range match.ContextAfter {
			fmt.Fprintf(w, "scrollback:%d: %s\n", int(match.LineNumber)+1+idx, line)
		}
		if i+1 < len(matches) {
			fmt.Fprintln(w, "--")
		}
	}
}

func grepToJSON(matches []*proto.GrepMatch) jsonGrep {
	out := make([]jsonGrepMatch, 0, len(matches))
	for _, match := range matches {
		if match == nil {
			continue
		}
		out = append(out, jsonGrepMatch{
			LineNumber:    match.LineNumber,
			Line:          match.Line,
			ContextBefore: append([]string(nil), match.ContextBefore...),
			ContextAfter:  append([]string(nil), match.ContextAfter...),
		})
	}
	return jsonGrep{Matches: out}
}

func printWaitHuman(w io.Writer, matched bool, line string, timedOut bool) {
	if timedOut {
		fmt.Fprintln(w, "timed out")
		return
	}
	if matched {
		fmt.Fprintln(w, line)
		return
	}
	fmt.Fprintln(w, "no match")
}

func printIdleHuman(w io.Writer, idle bool, timedOut bool) {
	if timedOut {
		fmt.Fprintln(w, "timed out")
		return
	}
	if idle {
		fmt.Fprintln(w, "idle")
		return
	}
	fmt.Fprintln(w, "active")
}
