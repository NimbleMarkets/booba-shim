package audio

import (
	"errors"
	"sync"
	"sync/atomic"
	"time"
)

type silent struct {
	mu             sync.Mutex
	enabled        atomic.Bool
	closed         atomic.Bool
	rate, channels int
	next           time.Time
}

// NewSilent returns an initially disabled player that discards PCM while pacing
// writes by their duration. It works on every platform and needs no Options.
func NewSilent() Player { return &silent{} }

func (s *silent) SetSampleRate(hz, channels int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed.Load() {
		return ErrClosed
	}
	if hz <= 0 || (channels != 1 && channels != 2) {
		return errors.New("audio: expected positive sample rate and 1 or 2 channels")
	}
	s.drain()
	s.rate, s.channels = hz, channels
	return nil
}

func (s *silent) Write(samples []int16) (n int, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed.Load() {
		return 0, ErrClosed
	}
	if s.rate == 0 {
		return 0, errors.New("audio: call SetSampleRate before Write")
	}
	if len(samples)%s.channels != 0 {
		return 0, errors.New("audio: incomplete interleaved frame")
	}
	if err := s.wait(); err != nil {
		return 0, err
	}
	start := time.Now()
	// Accept at most 10 ms at a time (or one frame at very low rates).
	chunk := max(1, s.rate/100)
	for n < len(samples) {
		frames := min((len(samples)-n)/s.channels, chunk)
		n += frames * s.channels
		// Use total frames to avoid accumulating rounding errors across chunks.
		elapsed := float64(n/s.channels) / float64(s.rate)
		s.next = start.Add(time.Duration(elapsed * float64(time.Second)))
		if err := s.wait(); err != nil {
			return n, err
		}
	}
	return n, nil
}

func (s *silent) wait() error {
	for {
		if s.closed.Load() {
			return ErrClosed
		}
		if !s.enabled.Load() {
			return ErrDisabled
		}
		left := time.Until(s.next)
		if left <= 0 {
			return nil
		}
		time.Sleep(min(left, 10*time.Millisecond))
	}
}

func (s *silent) drain() {
	if left := time.Until(s.next); left > 0 {
		time.Sleep(left)
	}
	s.next = time.Time{}
}

func (s *silent) Enable(on bool) {
	s.enabled.Store(on)
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed.Load() {
		return
	}
	if !on {
		s.drain()
	}
}

func (s *silent) Close() error {
	s.closed.Store(true)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.drain()
	return nil
}
