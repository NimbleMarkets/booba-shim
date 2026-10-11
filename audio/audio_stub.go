//go:build !js || !wasm

package audio

// New returns ErrUnsupported outside js/wasm. Use NewSilent for paced silence
// or provide a Player backed by the application's native audio output.
func New(Options) (Player, error) {
	return nil, ErrUnsupported
}
