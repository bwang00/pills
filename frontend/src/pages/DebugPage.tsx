import { useEffect, useState, Component, type ReactNode } from 'react';
import { useBreathing } from '../hooks/useBreathing';

class TestErrorBoundary extends Component<{children: ReactNode}, {error: string}> {
  state = { error: '' };
  static getDerivedStateFromError(e: Error) { return { error: e.message + '\n' + (e.stack || '').substring(0, 200) }; }
  render() {
    if (this.state.error) return <pre style={{color:'red',fontSize:11,whiteSpace:'pre-wrap',background:'#fff0f0',padding:12,borderRadius:8}}>{this.state.error}</pre>;
    return this.props.children;
  }
}

function BreathingTest() {
  const phases = [{name:'吸气',duration:4},{name:'闭气',duration:7},{name:'呼气',duration:8}];
  const { state, currentPhaseIndex, timeRemaining } = useBreathing(phases);
  return <p>Hook OK — state: {state}, phase: {currentPhaseIndex}, time: {timeRemaining}</p>;
}

function AudioTest() {
  const [r, setR] = useState('testing...');
  useEffect(() => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) { setR('NOT available'); return; }
      const ctx = new AC();
      setR('OK, state=' + ctx.state);
      ctx.close();
    } catch (e: any) { setR('Error: ' + e.message); }
  }, []);
  return <p>{r}</p>;
}

export default function DebugPage() {
  const [api, setApi] = useState('...');
  useEffect(() => {
    fetch('/api/guides?slug=breathing-478').then(r => r.json()).then(d => setApi('OK: ' + (d[0]?.title || 'no data'))).catch(e => setApi('Err: ' + e.message));
  }, []);

  return (
    <div style={{padding:20,fontFamily:'monospace',fontSize:13,lineHeight:1.8}}>
      <h1 style={{color:'green',marginBottom:12}}>Pills Debug</h1>
      <p><b>API:</b> {api}</p>
      <p><b>Audio:</b> <AudioTest /></p>
      <h2 style={{marginTop:16,fontSize:15}}>Hook Test:</h2>
      <TestErrorBoundary><BreathingTest /></TestErrorBoundary>
      <h2 style={{marginTop:16,fontSize:15}}>Render Test (what breathing page should look like):</h2>
      <div style={{background:'#f0fdf9',borderRadius:16,padding:20,margin:'8px 0',border:'1px solid #ccfbef'}}>
        <div style={{textAlign:'center',marginBottom:12}}>
          <h2 style={{color:'#115e52',fontSize:22,fontWeight:'bold',margin:0}}>4-7-8 呼吸法</h2>
          <p style={{color:'#0d947c',fontSize:13,marginTop:4}}>吸气4秒，屏息7秒，呼气8秒</p>
        </div>
        <div style={{width:180,height:180,margin:'16px auto',borderRadius:'50%',background:'linear-gradient(135deg,#5ceaca,#14b896)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
          <div style={{textAlign:'center',color:'white'}}>
            <p style={{fontSize:18,fontWeight:600,margin:0}}>准备好了吗？</p>
          </div>
        </div>
        <div style={{textAlign:'center'}}>
          <button style={{background:'#14b896',color:'white',border:'none',borderRadius:999,padding:'12px 32px',fontSize:15,fontWeight:600}}>开始练习</button>
        </div>
      </div>
      <p style={{fontSize:11,color:'#999',marginTop:16,wordBreak:'break-all'}}>UA: {navigator.userAgent}</p>
    </div>
  );
}
