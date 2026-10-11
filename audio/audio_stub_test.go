//go:build !js || !wasm

package audio

import (
	"errors"
	"testing"
)

func TestNewUnsupported(t *testing.T) {
	p, err := New(Options{})
	if p != nil || !errors.Is(err, ErrUnsupported) {
		t.Fatalf("New() = %v, %v; want nil, ErrUnsupported", p, err)
	}
}
