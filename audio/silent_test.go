package audio

import (
	"errors"
	"testing"
	"testing/synctest"
	"time"
)

func TestSilentPacing(t *testing.T) {
	for _, tc := range []struct{ rate, channels int }{{16000, 1}, {44100, 2}, {3, 1}} {
		synctest.Test(t, func(t *testing.T) {
			p := NewSilent()
			defer p.Close()
			if err := p.SetSampleRate(tc.rate, tc.channels); err != nil {
				t.Fatal(err)
			}
			p.Enable(true)
			samples := make([]int16, tc.rate*tc.channels)
			start := time.Now()
			n, err := p.Write(samples)
			if err != nil || n != len(samples) {
				t.Fatalf("Write = %d, %v", n, err)
			}
			if elapsed := time.Since(start); elapsed != time.Second {
				t.Fatalf("%d Hz/%d channels took %v", tc.rate, tc.channels, elapsed)
			}
			p.Enable(false)
			time.Sleep(time.Hour)
			p.Enable(true)
			start = time.Now()
			if _, err := p.Write(samples); err != nil {
				t.Fatal(err)
			}
			if elapsed := time.Since(start); elapsed != time.Second {
				t.Fatalf("after pause took %v", elapsed)
			}
			if err := p.SetSampleRate(tc.rate*2, tc.channels); err != nil {
				t.Fatal(err)
			}
			start = time.Now()
			if _, err := p.Write(samples); err != nil {
				t.Fatal(err)
			}
			if elapsed := time.Since(start); elapsed != time.Second/2 {
				t.Fatalf("after rate change took %v", elapsed)
			}
		})
	}
}

func TestSilentValidation(t *testing.T) {
	p := NewSilent()
	if n, err := p.Write([]int16{1}); n != 0 || err == nil {
		t.Fatalf("unconfigured Write = %d, %v", n, err)
	}
	for _, format := range [][2]int{{0, 1}, {-1, 2}, {16000, 0}, {16000, 3}} {
		if err := p.SetSampleRate(format[0], format[1]); err == nil {
			t.Fatalf("accepted %v", format)
		}
	}
	if err := p.SetSampleRate(16000, 2); err != nil {
		t.Fatal(err)
	}
	if n, err := p.Write([]int16{1, 2}); n != 0 || !errors.Is(err, ErrDisabled) {
		t.Fatalf("disabled Write = %d, %v", n, err)
	}
	p.Enable(true)
	if n, err := p.Write([]int16{1}); n != 0 || err == nil {
		t.Fatalf("incomplete Write = %d, %v", n, err)
	}
	if n, err := p.Write(nil); n != 0 || err != nil {
		t.Fatalf("empty Write = %d, %v", n, err)
	}
	if err := p.Close(); err != nil {
		t.Fatal(err)
	}
	if err := p.Close(); err != nil {
		t.Fatal(err)
	}
	p.Enable(true)
	if n, err := p.Write([]int16{1, 2}); n != 0 || !errors.Is(err, ErrClosed) {
		t.Fatalf("closed Write = %d, %v", n, err)
	}
	if err := p.SetSampleRate(16000, 1); !errors.Is(err, ErrClosed) {
		t.Fatalf("closed SetSampleRate = %v", err)
	}
}

func TestSilentInterrupt(t *testing.T) {
	// Mutex contention prevents synctest's clock from advancing, so exercise
	// concurrent control calls with real timers.
	for _, name := range []string{"pause", "close"} {
		t.Run(name, func(t *testing.T) {
			p := NewSilent()
			defer p.Close()
			if err := p.SetSampleRate(16000, 2); err != nil {
				t.Fatal(err)
			}
			p.Enable(true)
			type result struct {
				n   int
				err error
			}
			done := make(chan result, 1)
			samples := make([]int16, 16000*2)
			go func() {
				n, err := p.Write(samples)
				done <- result{n, err}
			}()
			time.Sleep(20 * time.Millisecond)
			controlled := make(chan struct{})
			wantErr := ErrDisabled
			if name == "close" {
				wantErr = ErrClosed
			}
			go func() {
				if name == "close" {
					p.Close()
				} else {
					p.Enable(false)
				}
				close(controlled)
			}()
			select {
			case <-controlled:
			case <-time.After(2 * time.Second):
				t.Fatal("control call did not interrupt Write")
			}
			r := <-done
			if r.n < 0 || r.n >= len(samples) || r.n%2 != 0 || !errors.Is(r.err, wantErr) {
				t.Fatalf("interrupted Write = %d, %v", r.n, r.err)
			}
			if name == "pause" {
				p.Enable(true)
				n, err := p.Write(samples[r.n:])
				if n != len(samples)-r.n || err != nil {
					t.Fatalf("retry Write = %d, %v", n, err)
				}
			}
		})
	}
}
