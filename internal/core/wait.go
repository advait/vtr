package core

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"
)

// WaitFor waits until the pattern matches output emitted after the call begins.
func (c *Coordinator) WaitFor(ctx context.Context, name string, re *regexp.Regexp, timeout time.Duration) (bool, string, bool, error) {
	if re == nil {
		return false, "", false, errors.New("wait pattern is required")
	}
	session, err := c.getSession(name)
	if err != nil {
		return false, "", false, err
	}
	return session.waitForPattern(ctx, re, timeout)
}

// WaitForIdle waits until no output has been observed for the idle duration.
func (c *Coordinator) WaitForIdle(ctx context.Context, name string, idle, timeout time.Duration) (bool, bool, error) {
	session, err := c.getSession(name)
	if err != nil {
		return false, false, err
	}
	return session.waitForIdle(ctx, idle, timeout)
}

func (s *Session) waitForPattern(ctx context.Context, re *regexp.Regexp, timeout time.Duration) (bool, string, bool, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if timeout < 0 {
		return false, "", false, errors.New("timeout must be >= 0")
	}
	var timeoutCh <-chan time.Time
	if timeout > 0 {
		timer := time.NewTimer(timeout)
		defer timer.Stop()
		timeoutCh = timer.C
	}
	offset, _, _ := s.outputState()
	pending := ""
	for {
		data, newOffset, ch := s.outputSnapshot(offset)
		if len(data) > 0 {
			offset = newOffset
			pending += string(data)
			if len(pending) > MaxOutputBuffer {
				pending = pending[len(pending)-MaxOutputBuffer:]
			}
			for {
				idx := strings.IndexByte(pending, '\n')
				if idx < 0 {
					break
				}
				line := strings.TrimSuffix(pending[:idx], "\r")
				if re.MatchString(line) {
					return true, line, false, nil
				}
				pending = pending[idx+1:]
			}
			if pending != "" {
				line := strings.TrimSuffix(pending, "\r")
				if re.MatchString(line) {
					return true, line, false, nil
				}
			}
			continue
		}
		select {
		case <-ctx.Done():
			return false, "", false, ctx.Err()
		case <-timeoutCh:
			return false, "", true, nil
		case <-s.exitCh:
			return false, "", true, nil
		case <-ch:
		}
	}
}

func (s *Session) waitForIdle(ctx context.Context, idle, timeout time.Duration) (bool, bool, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if idle <= 0 {
		return false, false, errors.New("idle duration must be > 0")
	}
	if timeout < 0 {
		return false, false, errors.New("timeout must be >= 0")
	}
	var timeoutCh <-chan time.Time
	if timeout > 0 {
		timer := time.NewTimer(timeout)
		defer timer.Stop()
		timeoutCh = timer.C
	}
	for {
		_, ch, last := s.outputState()
		elapsed := time.Since(last)
		if elapsed >= idle {
			return true, false, nil
		}
		idleRemaining := idle - elapsed
		idleTimer := time.NewTimer(idleRemaining)
		select {
		case <-ctx.Done():
			idleTimer.Stop()
			return false, false, ctx.Err()
		case <-timeoutCh:
			idleTimer.Stop()
			return false, true, nil
		case <-s.exitCh:
			idleTimer.Stop()
		case <-ch:
			idleTimer.Stop()
		case <-idleTimer.C:
			return true, false, nil
		}
	}
}
