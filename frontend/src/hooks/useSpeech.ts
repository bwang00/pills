import { useRef, useCallback, useState, useEffect } from 'react';

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Find a Chinese voice
  const getChineseVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof speechSynthesis === 'undefined') return null;
    const voices = speechSynthesis.getVoices();
    // Prefer zh-CN voices
    return voices.find(v => v.lang === 'zh-CN')
      || voices.find(v => v.lang.startsWith('zh'))
      || voices.find(v => v.lang.includes('CN'))
      || null;
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof speechSynthesis === 'undefined') return;
    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;

    const voice = getChineseVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [getChineseVoice]);

  const stop = useCallback(() => {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  // Load voices (they load async on some browsers)
  useEffect(() => {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }
    return () => {
      if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, speaking };
}
