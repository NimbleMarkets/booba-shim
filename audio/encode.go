package audio

import (
	"encoding/binary"
	"math"
)

// appendChannel appends one channel as little endian IEEE 754 float32 PCM.
// samples must contain complete interleaved frames.
func appendChannel(dst []byte, samples []int16, channel, channels int) []byte {
	for i := channel; i < len(samples); i += channels {
		dst = binary.LittleEndian.AppendUint32(dst, math.Float32bits(float32(samples[i])/32768))
	}
	return dst
}
