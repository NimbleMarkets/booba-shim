//go:build js && wasm

package audio

import (
	"errors"
	"fmt"
	"math"
	"sync"
	"sync/atomic"
	"syscall/js"
	"time"
)

// Player consumes interleaved signed 16-bit PCM. Write returns samples consumed,
// not frames. Call blocking methods from goroutines, never directly in js.FuncOf.
type Player interface {
	SetSampleRate(hz int, channels int) error
	Write(samples []int16) (int, error)
	Enable(on bool)
	Close() error
}

// Options controls buffering. Zero lead/chunk values select the defaults.
// Gain is a pointer so nil means unity and a pointer to zero means silence.
type Options struct {
	LeadTime    time.Duration // Default: 300 ms.
	ChunkFrames int           // Default: 2048 frames.
	Gain        *float64      // Nonnegative, finite output gain; default: 1.
}

var (
	ErrClosed   = errors.New("audio: player closed")
	ErrDisabled = errors.New("audio: player disabled")
)

type player struct {
	mu                            sync.Mutex
	enabled                       atomic.Bool
	closed                        atomic.Bool
	draining                      atomic.Bool
	ctx, gain, doc                js.Value
	unlock                        js.Func
	listening                     bool
	released                      bool
	lead                          float64
	chunk, rate, channels, frames int
	data                          [][]byte
	next                          float64
}

// New creates an initially disabled player. No page script is required.
// Enable(true) requests playback; a pointer or keyboard gesture may be needed
// before the browser lets the audio clock advance.
func New(opts Options) (out Player, err error) {
	if opts.LeadTime < 0 || opts.ChunkFrames < 0 {
		return nil, errors.New("audio: lead time and chunk size must be nonnegative")
	}
	if opts.LeadTime == 0 {
		opts.LeadTime = 300 * time.Millisecond
	}
	if opts.ChunkFrames == 0 {
		opts.ChunkFrames = 2048
	}
	gain := 1.0
	if opts.Gain != nil {
		gain = *opts.Gain
	}
	if math.IsNaN(gain) || math.IsInf(gain, 0) || gain < 0 {
		return nil, errors.New("audio: gain must be finite and nonnegative")
	}
	class := js.Global().Get("AudioContext")
	if class.Type() != js.TypeFunction {
		return nil, errors.New("audio: no AudioContext")
	}
	a := &player{lead: opts.LeadTime.Seconds(), chunk: opts.ChunkFrames}
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("audio: create context: %v", r)
			if a.ctx.Truthy() {
				a.ctx.Call("close")
			}
			out = nil
		}
	}()
	a.ctx = class.New()
	a.gain = a.ctx.Call("createGain")
	a.gain.Get("gain").Set("value", gain)
	a.gain.Call("connect", a.ctx.Get("destination"))
	a.doc = js.Global().Get("document")
	if a.doc.Truthy() {
		a.unlock = js.FuncOf(func(js.Value, []js.Value) any {
			if a.enabled.Load() || a.draining.Load() {
				a.ctx.Call("resume")
				a.removeUnlock()
			}
			return nil
		})
		a.listening = true
		for _, event := range []string{"pointerdown", "keydown"} {
			a.doc.Call("addEventListener", event, a.unlock, true)
		}
	}
	return a, nil
}

func (a *player) removeUnlock() {
	if !a.listening {
		return
	}
	for _, event := range []string{"pointerdown", "keydown"} {
		a.doc.Call("removeEventListener", event, a.unlock, true)
	}
	a.unlock.Release()
	a.listening = false
}

// SetSampleRate accepts mono or stereo and browser-supported source rates.
// Existing partial PCM is flushed at its old rate before the format changes.
func (a *player) SetSampleRate(hz, channels int) (err error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.closed.Load() {
		return ErrClosed
	}
	if hz <= 0 || (channels != 1 && channels != 2) {
		return errors.New("audio: expected positive sample rate and 1 or 2 channels")
	}
	defer jsError(&err)
	// Validate against the actual browser before changing the current format.
	a.ctx.Call("createBuffer", channels, 1, hz)
	a.flush()
	a.rate, a.channels = hz, channels
	a.data = make([][]byte, channels)
	return nil
}

func jsError(err *error) {
	if r := recover(); r != nil {
		*err = fmt.Errorf("audio: %v", r)
	}
}

func (a *player) Write(samples []int16) (n int, err error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	defer jsError(&err)
	if a.closed.Load() {
		return 0, ErrClosed
	}
	if a.rate == 0 {
		return 0, errors.New("audio: call SetSampleRate before Write")
	}
	if len(samples)%a.channels != 0 {
		return 0, errors.New("audio: incomplete interleaved frame")
	}
	for n < len(samples) {
		if err := a.waitLead(); err != nil {
			return n, err
		}
		count := min(len(samples)-n, (a.chunk-a.frames)*a.channels)
		for ch := range a.data {
			a.data[ch] = appendChannel(a.data[ch], samples[n:n+count], ch, a.channels)
		}
		a.frames += count / a.channels
		n += count
		if a.frames == a.chunk {
			a.flush()
		}
	}
	return n, a.waitLead()
}

func (a *player) waitLead() error {
	for {
		if a.closed.Load() {
			return ErrClosed
		}
		if !a.enabled.Load() {
			return ErrDisabled
		}
		if a.next-a.now() <= a.lead {
			return nil
		}
		// Poll the audio clock: wall time can advance while autoplay is suspended.
		time.Sleep(10 * time.Millisecond)
	}
}

func (a *player) now() float64 { return a.ctx.Get("currentTime").Float() }

func (a *player) flush() {
	if a.frames == 0 {
		return
	}
	buf := a.ctx.Call("createBuffer", a.channels, a.frames, a.rate)
	for ch, data := range a.data {
		channel := buf.Call("getChannelData", ch)
		bytes := js.Global().Get("Uint8Array").New(channel.Get("buffer"), channel.Get("byteOffset"), channel.Get("byteLength"))
		js.CopyBytesToJS(bytes, data)
	}
	src := a.ctx.Call("createBufferSource")
	src.Set("buffer", buf)
	src.Call("connect", a.gain)
	if now := a.now(); a.next <= now {
		a.next = now + 0.05
	}
	src.Call("start", a.next)
	a.next += float64(a.frames) / float64(a.rate)
	for ch := range a.data {
		a.data[ch] = a.data[ch][:0]
	}
	a.frames = 0
}

// Enable(false) interrupts a blocked Write, flushes partial PCM, drains running
// audio, then suspends. Draining before autoplay unlock waits for a gesture.
// Serialize control calls; they may run concurrently with Write.
func (a *player) Enable(on bool) {
	a.enabled.Store(on)
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.closed.Load() {
		return
	}
	if on {
		a.ctx.Call("resume")
		return
	}
	a.flush()
	a.drain()
	a.ctx.Call("suspend")
}

func (a *player) drain() {
	if a.next <= a.now() {
		return
	}
	a.draining.Store(true)
	defer a.draining.Store(false)
	// Resume may still be pending when a short stream ends. Wait on the audio
	// clock, not wall time, so neither that race nor autoplay cuts off its tail.
	a.ctx.Call("resume")
	for a.ctx.Get("state").String() != "closed" && a.next > a.now() {
		time.Sleep(10 * time.Millisecond)
	}
}

// Close interrupts Write and drains running audio before releasing the context
// and gesture listeners. Queued audio still requires a gesture if autoplay is
// blocked, just as with Enable(false).
// Close is idempotent. A player cannot be reused after Close.
func (a *player) Close() (err error) {
	a.closed.Store(true)
	a.mu.Lock()
	defer a.mu.Unlock()
	defer jsError(&err)
	if a.released {
		return nil
	}
	a.flush()
	a.drain()
	a.removeUnlock()
	a.gain.Call("disconnect")
	err = await(a.ctx.Call("close"))
	a.released = true
	a.data = nil
	return err
}

// await is only used for close, which must finish releasing browser resources.
// Resume is deliberately asynchronous because it may await a user gesture.
func await(promise js.Value) error {
	done := make(chan error, 1)
	ok := js.FuncOf(func(js.Value, []js.Value) any {
		done <- nil
		return nil
	})
	failed := js.FuncOf(func(_ js.Value, args []js.Value) any {
		done <- fmt.Errorf("audio: close: %s", args[0].String())
		return nil
	})
	defer ok.Release()
	defer failed.Release()
	promise.Call("then", ok, failed)
	return <-done
}
