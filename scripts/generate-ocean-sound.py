"""Generate ocean-like ambient sound."""
import numpy as np
import soundfile as sf
import os

SAMPLE_RATE = 44100
DURATION = 30  # seconds, will loop

def generate_ocean(duration, sr):
    """Generate ocean-wave-like sound using filtered noise."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    # White noise base
    noise = np.random.randn(len(t))
    
    # Low-pass filter (simple moving average)
    kernel_size = int(sr * 0.1)  # 100ms window
    kernel = np.ones(kernel_size) / kernel_size
    filtered = np.convolve(noise, kernel, mode='same')
    
    # Add wave rhythm (0.1 Hz = one wave every 10 seconds)
    wave_envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 0.1 * t)
    
    # Combine
    ocean = filtered * wave_envelope
    
    # Normalize
    ocean = ocean / np.max(np.abs(ocean)) * 0.8
    
    return ocean

output_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "audio")
os.makedirs(output_dir, exist_ok=True)

ocean = generate_ocean(DURATION, SAMPLE_RATE)
output_path = os.path.join(output_dir, "ambient-ocean.wav")
sf.write(output_path, ocean, SAMPLE_RATE)
print(f"Generated: {output_path}")
