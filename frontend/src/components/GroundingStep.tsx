import { useCallback } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface GroundingStepProps {
  sense: string; count: number; prompt: string; entryCount: number;
  currentInput: string;
  onInputChange: (val: string) => void; onAdd: () => void; onSkip: () => void;
}

const senseEmoji: Record<string, string> = { '看': '👀', '触摸': '✋', '听': '👂', '闻': '👃', '尝': '👅' };

export default function GroundingStepCard({ sense, count, prompt, entryCount, currentInput, onInputChange, onAdd, onSkip }: GroundingStepProps) {
  const remaining = count - entryCount;

  const handleVoiceResult = useCallback((text: string) => {
    onInputChange(text.trim());
  }, [onInputChange]);

  const { isListening, error: voiceError, startListening, stopListening, supported } = useVoiceInput(handleVoiceResult);

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-calm-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{senseEmoji[sense] || '✨'}</span>
        <span className="text-calm-400 text-sm">{remaining > 0 ? `还需要 ${remaining} 个` : '完成！'}</span>
      </div>
      <h2 className="text-xl font-semibold text-calm-800 mb-1">{count} 个你能{sense}到的</h2>
      <p className="text-calm-500 text-sm mb-4">{prompt}</p>
      <div className="flex gap-2">
        <input type="text" value={currentInput} onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()} placeholder="输入或语音…"
          className="flex-1 rounded-lg border border-calm-200 px-4 py-2 text-calm-800 placeholder:text-calm-300 focus:outline-none focus:border-calm-400 transition-colors" />
        {supported && (
          <button onClick={toggleVoice}
            className={`rounded-lg px-3 py-2 text-lg transition-colors ${
              isListening ? 'bg-red-100 text-red-500 animate-pulse-gentle' : 'bg-calm-100 text-calm-500 hover:bg-calm-200'
            }`}
            title={isListening ? '停止录音' : '语音输入'}>
            {isListening ? '🔴' : '🎙️'}
          </button>
        )}
        <button onClick={onAdd} disabled={!currentInput.trim()}
          className="rounded-lg bg-calm-500 text-white px-4 py-2 font-medium hover:bg-calm-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">记录</button>
      </div>
      {isListening && (
        <p className="text-calm-400 text-xs mt-2 animate-pulse-gentle">正在听…请说出你{sense}到的</p>
      )}
      {voiceError && (
        <p className="text-red-400 text-xs mt-2">{voiceError}</p>
      )}
      <button onClick={onSkip} className="mt-3 text-calm-400 text-sm hover:text-calm-600 transition-colors">跳过此步骤</button>
    </div>
  );
}
