package audio

import (
	"encoding/binary"
	"math"
	"testing"
)

func TestAppendChannel(t *testing.T) {
	for _, tc := range []struct {
		name     string
		samples  []int16
		channels int
		want     [][]float32
	}{
		{"mono", []int16{-32768, -1, 0, 1, 16384, 32767}, 1, [][]float32{{-1, -1.0 / 32768, 0, 1.0 / 32768, .5, 32767.0 / 32768}}},
		{"stereo", []int16{16384, -32768, 0, 32767}, 2, [][]float32{{.5, 0}, {-1, 32767.0 / 32768}}},
		{"empty", nil, 1, [][]float32{{}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			for ch, want := range tc.want {
				got := appendChannel([]byte{1, 2, 3, 4}, tc.samples, ch, tc.channels)
				if len(got) != 4+4*len(want) || binary.LittleEndian.Uint32(got) != 0x04030201 {
					t.Fatalf("bad append: %v", got)
				}
				for i, w := range want {
					if v := math.Float32frombits(binary.LittleEndian.Uint32(got[4+i*4:])); v != w {
						t.Fatalf("channel %d sample %d = %v, want %v", ch, i, v, w)
					}
				}
			}
		})
	}
}
