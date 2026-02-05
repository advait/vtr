package core

import (
	"errors"
	"regexp"
	"strings"
)

// GrepMatch describes a single grep match with context.
type GrepMatch struct {
	LineNumber    int
	Line          string
	ContextBefore []string
	ContextAfter  []string
}

// Grep searches the scrollback history for the provided pattern.
func (c *Coordinator) Grep(name string, re *regexp.Regexp, before, after, maxMatches int) ([]GrepMatch, error) {
	if re == nil {
		return nil, errors.New("grep pattern is required")
	}
	if maxMatches <= 0 {
		maxMatches = 100
	}
	dump, err := c.Dump(name, DumpHistory, false)
	if err != nil {
		dump, err = c.Dump(name, DumpScreen, false)
		if err != nil {
			dump, err = c.Dump(name, DumpViewport, false)
			if err != nil {
				return nil, err
			}
		}
	}
	lines := splitLines(dump)
	if len(lines) == 0 {
		return nil, nil
	}
	matches := make([]GrepMatch, 0)
	for i, line := range lines {
		if !re.MatchString(line) {
			continue
		}
		start := i - before
		if start < 0 {
			start = 0
		}
		end := i + after
		if end >= len(lines) {
			end = len(lines) - 1
		}
		contextBefore := append([]string(nil), lines[start:i]...)
		contextAfter := append([]string(nil), lines[i+1:end+1]...)
		matches = append(matches, GrepMatch{
			LineNumber:    i,
			Line:          line,
			ContextBefore: contextBefore,
			ContextAfter:  contextAfter,
		})
		if len(matches) >= maxMatches {
			break
		}
	}
	return matches, nil
}

func splitLines(input string) []string {
	if input == "" {
		return nil
	}
	normalized := strings.ReplaceAll(input, "\r", "")
	lines := strings.Split(normalized, "\n")
	if len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}
	return lines
}
