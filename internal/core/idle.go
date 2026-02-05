package core

import "time"

func (s *Session) recordActivity() {
	if s == nil {
		return
	}
	now := time.Now()
	s.activityMu.Lock()
	s.lastActivity = now
	if s.idle {
		s.idle = false
		ch := s.idleCh
		close(ch)
		s.idleCh = make(chan struct{})
		if s.onListChange != nil {
			s.onListChange()
		}
	}
	ch := s.activityCh
	close(ch)
	s.activityCh = make(chan struct{})
	s.activityMu.Unlock()
}

func (s *Session) isIdle() bool {
	s.activityMu.Lock()
	idle := s.idle
	s.activityMu.Unlock()
	return idle
}

func (s *Session) idleState() (bool, <-chan struct{}) {
	s.activityMu.Lock()
	idle := s.idle
	ch := s.idleCh
	s.activityMu.Unlock()
	return idle, ch
}

func (s *Session) activityState() (time.Time, <-chan struct{}) {
	s.activityMu.Lock()
	last := s.lastActivity
	ch := s.activityCh
	s.activityMu.Unlock()
	return last, ch
}

func (s *Session) setIdle(idle bool) {
	s.activityMu.Lock()
	if s.idle == idle {
		s.activityMu.Unlock()
		return
	}
	s.idle = idle
	ch := s.idleCh
	close(ch)
	s.idleCh = make(chan struct{})
	s.activityMu.Unlock()
	if s.onListChange != nil {
		s.onListChange()
	}
}

func (s *Session) trackIdle() {
	if s == nil || s.idleThreshold <= 0 {
		return
	}
	for {
		idle, idleCh := s.idleState()
		if idle {
			select {
			case <-s.exitCh:
				return
			case <-idleCh:
				continue
			}
		}

		last, activityCh := s.activityState()
		elapsed := time.Since(last)
		if elapsed >= s.idleThreshold {
			s.setIdle(true)
			continue
		}
		timer := time.NewTimer(s.idleThreshold - elapsed)
		select {
		case <-s.exitCh:
			timer.Stop()
			return
		case <-activityCh:
			timer.Stop()
		case <-timer.C:
			s.setIdle(true)
		}
	}
}
