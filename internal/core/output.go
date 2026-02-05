package core

import "time"

const MaxOutputBuffer = 1 << 20

func (s *Session) recordOutput(data []byte) {
	if s == nil || len(data) == 0 {
		return
	}
	s.outputMu.Lock()
	s.outputBuf = append(s.outputBuf, data...)
	s.outputTotal += int64(len(data))
	if len(s.outputBuf) > MaxOutputBuffer {
		drop := len(s.outputBuf) - MaxOutputBuffer
		s.outputBuf = s.outputBuf[drop:]
	}
	s.lastOutput = time.Now()
	ch := s.outputCh
	close(ch)
	s.outputCh = make(chan struct{})
	s.outputMu.Unlock()
	s.recordActivity()
}

func (s *Session) outputState() (int64, <-chan struct{}, time.Time) {
	s.outputMu.Lock()
	total := s.outputTotal
	ch := s.outputCh
	last := s.lastOutput
	s.outputMu.Unlock()
	return total, ch, last
}

func (s *Session) OutputState() (int64, <-chan struct{}, time.Time) {
	return s.outputState()
}

func (s *Session) outputSnapshot(offset int64) ([]byte, int64, <-chan struct{}) {
	s.outputMu.Lock()
	start := s.outputTotal - int64(len(s.outputBuf))
	if offset < start {
		offset = start
	}
	idx := offset - start
	if idx < 0 {
		idx = 0
	}
	data := append([]byte(nil), s.outputBuf[idx:]...)
	total := s.outputTotal
	ch := s.outputCh
	s.outputMu.Unlock()
	return data, total, ch
}

func (s *Session) OutputSnapshot(offset int64) ([]byte, int64, <-chan struct{}) {
	return s.outputSnapshot(offset)
}
