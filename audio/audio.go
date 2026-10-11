// Package audio provides Web Audio PCM playback and portable paced silence.
package audio

import (
	"errors"
	"time"
)

// Player consumes interleaved signed 16-bit PCM. Write returns samples consumed,
// not frames. Players start disabled. Serialize control calls; they may run
// concurrently with Write. In the browser, use goroutines for blocking methods.
type Player interface {
	// SetSampleRate selects a positive source rate and one or two channels.
	SetSampleRate(hz int, channels int) error
	// Write consumes complete interleaved frames and blocks for pacing.
	// On interruption, retry only the unconsumed suffix after enabling again.
	Write(samples []int16) (int, error)
	// Enable(false) interrupts Write and drains accepted samples before pausing.
	Enable(on bool)
	// Close interrupts Write, drains, and releases resources. It is idempotent.
	Close() error
}

// Options controls Web Audio buffering. Zero lead/chunk values select the defaults.
// Gain is a pointer so nil means unity and a pointer to zero means silence.
type Options struct {
	LeadTime    time.Duration // Default: 300 ms.
	ChunkFrames int           // Default: 2048 frames.
	Gain        *float64      // Nonnegative, finite output gain; default: 1.
}

var (
	// ErrUnsupported means this environment cannot provide Web Audio.
	ErrUnsupported = errors.New("audio: Web Audio is unavailable on this platform")
	// ErrClosed means the player has been closed and cannot be reused.
	ErrClosed = errors.New("audio: player closed")
	// ErrDisabled means playback is disabled; enable it before writing again.
	ErrDisabled = errors.New("audio: player disabled")
)
