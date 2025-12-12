import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, AlertTriangle, Play, Square, 
  Coffee, Moon, Activity, CheckCircle, Volume2, VolumeX, 
  AlertOctagon, Plus, Clock, Target, UserX, 
  Trophy, RotateCcw, Home, Timer, Flag, Trash2, StopCircle,
  Eye, EyeOff, Hand, History, Calendar, Loader2, LogOut, Mail, Lock, User, Settings, Database
} from 'lucide-react';

/**
 * 勉強集中室 (Study Focus Room) v14 - Deployment Ready
 * * Update Log:
 * 1. Priority Config: Hardcoded keys take precedence over local storage.
 * 2. Perfect for deployment (Vercel/Netlify) without manual setup.
 */

// ▼▼▼ デプロイ時はここに入力してください (毎回入力しなくて済みます) ▼▼▼
const SUPABASE_URL = "https://msjinhjercckisedakbj.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_3guVaz8eHuiTo9VKwdyUKg_24uD3cbW"; 
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// --- Audio Engine ---
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.bgmNode = null;
    this.bgmGain = null;
  }
  init() {
    if (!this.ctx) { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    if (this.ctx.state === 'suspended') { this.ctx.resume(); }
  }
  playAlarm(type = 'warning') {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (type === 'warning') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    } else if (type === 'ping') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    } else if (type === 'end') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); 
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.1); 
      osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.2); 
      osc.frequency.setValueAtTime(1046.50, this.ctx.currentTime + 0.4); 
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    }
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (type === 'end' ? 1.0 : 0.5));
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + (type === 'end' ? 1.0 : 0.5));
  }
  playNoise(type) {
    this.init();
    this.stopNoise(); 
    if (type === 'silence') return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') { output[i] = (white + (i > 0 ? output[i-1] : 0)) / 2; } 
      else if (type === 'brown') { output[i] = (0.02 * white) + ((i > 0 ? output[i-1] : 0) / 1.02); output[i] *= 3.5; }
    }
    this.bgmNode = this.ctx.createBufferSource();
    this.bgmNode.buffer = buffer;
    this.bgmNode.loop = true;
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.05; 
    this.bgmNode.connect(this.bgmGain);
    this.bgmGain.connect(this.ctx.destination);
    this.bgmNode.start();
  }
  stopNoise() {
    if (this.bgmNode) { this.bgmNode.stop(); this.bgmNode.disconnect(); this.bgmNode = null; }
  }
}
const audio = new AudioEngine();

const SOUND_TYPES = [
  { id: 'silence', name: '無音', icon: VolumeX },
  { id: 'white', name: '集中(ホワイト)', icon: Activity },
  { id: 'brown', name: '雨音(ブラウン)', icon: () => <span className="text-xl">🌧️</span> },
];

// --- Sub Component: Independent Stopwatch ---
const IndependentStopwatch = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const intervalRef = useRef(null);
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setTime(t => t + 10), 10);
    } else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);
  const toggle = () => setIsRunning(!isRunning);
  const reset = () => { setIsRunning(false); setTime(0); setLaps([]); };
  const lap = () => { setLaps([time, ...laps]); };
  const format = (ms) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const centi = Math.floor((ms % 1000) / 10);
    return `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}.${centi.toString().padStart(2,'0')}`;
  };
  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-white/10 overflow-hidden shadow-lg">
      <div className="p-3 bg-gradient-to-r from-indigo-900 to-slate-900 border-b border-white/10 flex items-center justify-between shrink-0">
        <h3 className="font-bold text-sm flex items-center gap-2 text-indigo-200"><Timer className="w-4 h-4" /> ストップウォッチ</h3>
      </div>
      <div className="flex-1 p-4 flex flex-col items-center">
        <div className="text-5xl font-mono font-bold text-white mb-6 tabular-nums mt-4">{format(time)}</div>
        <div className="grid grid-cols-3 gap-2 w-full mb-6">
          <button onClick={toggle} className={`py-2 rounded-lg font-bold flex justify-center items-center ${isRunning ? 'bg-red-500/20 text-red-300 border border-red-500/50' : 'bg-green-500/20 text-green-300 border border-green-500/50'}`}>
            {isRunning ? <StopCircle className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={lap} disabled={!isRunning} className="py-2 bg-slate-700 text-white rounded-lg font-bold disabled:opacity-50 flex justify-center items-center"><Flag className="w-5 h-5" /></button>
          <button onClick={reset} className="py-2 bg-slate-700 text-white rounded-lg font-bold flex justify-center items-center"><RotateCcw className="w-5 h-5" /></button>
        </div>
        <div className="w-full flex-1 overflow-y-auto bg-black/20 rounded-lg border border-white/5 custom-scrollbar">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs uppercase bg-white/5 text-slate-300 sticky top-0"><tr><th className="px-4 py-2">Lap</th><th className="px-4 py-2 text-right">Time</th></tr></thead>
            <tbody>
              {laps.map((l, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5"><td className="px-4 py-2 font-mono">#{laps.length - i}</td><td className="px-4 py-2 text-right font-mono text-white">{format(l)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Sub Component: Configuration Screen ---
const ConfigScreen = ({ onSave }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (url && key) {
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_key', key);
      onSave(url, key);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-emerald-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold">初期設定</h1>
          <p className="text-slate-400 text-sm mt-2">Supabaseの情報を入力して接続してください</p>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Project URL</label>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} required className="w-full bg-black/30 border border-slate-700 rounded-lg p-3 text-sm focus:border-emerald-500 outline-none" placeholder="https://xyz.supabase.co" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">API Key (Anon)</label>
            <input type="password" value={key} onChange={e => setKey(e.target.value)} required className="w-full bg-black/30 border border-slate-700 rounded-lg p-3 text-sm focus:border-emerald-500 outline-none" placeholder="eyJhbGciOiJIUzI1NiIsInR5..." />
          </div>
          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all">接続して開始</button>
        </form>
        <p className="mt-4 text-xs text-center text-slate-600">※ブラウザにのみ保存されます</p>
      </div>
    </div>
  );
};

// --- Sub Component: Auth Screen ---
const AuthScreen = ({ supabase, onLogin, onResetConfig, showConfigReset }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("登録確認メールを送信しました。メールボックスを確認してください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      let msg = err.message;
      if (msg.includes("Invalid login credentials")) msg = "メールアドレスまたはパスワードが間違っています。";
      else if (msg.includes("User already registered")) msg = "このメールアドレスは既に登録されています。";
      else if (msg.includes("Password should be at least")) msg = "パスワードは6文字以上で設定してください。";
      else if (msg.includes("rate limit")) msg = "試行回数が多すぎます。しばらく待ってからやり直してください。";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 relative">
      {showConfigReset && (
        <button onClick={onResetConfig} className="absolute top-4 right-4 text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"><Settings className="w-3 h-3"/>設定変更</button>
      )}
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-indigo-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold">Study Focus Room</h1>
          <p className="text-slate-400 text-sm mt-2">ログインして学習を始めましょう</p>
        </div>
        {error && <div className="bg-red-500/20 text-red-300 text-sm p-3 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/30 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-indigo-500 outline-none" placeholder="mail@example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/30 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-indigo-500 outline-none" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSignUp ? 'アカウント作成' : 'ログイン')}
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-indigo-400 hover:text-indigo-300 underline">{isSignUp ? 'すでにアカウントをお持ちですか？ログイン' : '新規登録はこちら'}</button>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function StudyFocusRoom() {
  const [status, setStatus] = useState('planning'); 
  const [subStatus, setSubStatus] = useState(null); 
  const [showPresenceCheck, setShowPresenceCheck] = useState(false);
  const [cameraBlur, setCameraBlur] = useState(false);

  // App State
  const [sbConfig, setSbConfig] = useState({ url: '', key: '' });
  const [supabase, setSupabase] = useState(null);
  const [session, setSession] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Data
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Timers & Tasks
  const [timerMode, setTimerMode] = useState('countdown');
  const [targetTime, setTargetTime] = useState(25);
  const [currentTime, setCurrentTime] = useState(0); 
  const [elapsedTime, setElapsedTime] = useState(0);
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [newTodoHours, setNewTodoHours] = useState(0);
  const [newTodoMinutes, setNewTodoMinutes] = useState(30);
  const [activeTodoId, setActiveTodoId] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [napStartTime, setNapStartTime] = useState(null);
  const [hasTakenNap, setHasTakenNap] = useState(false);
  const [activeSound, setActiveSound] = useState('silence');
  const [motionScore, setMotionScore] = useState(0); 
  
  const videoRef = useRef(null);
  const streamRef = useRef(null); 
  const canvasRef = useRef(null); 
  const timerRef = useRef(null);
  const motionIntervalRef = useRef(null);
  const lastFrameData = useRef(null);
  const stillnessTimer = useRef(0); 

  // --- 1. Init: Load Script & Check Config ---
  useEffect(() => {
    // Priority 1: Hardcoded Constants
    if (SUPABASE_URL && SUPABASE_KEY) {
      setSbConfig({ url: SUPABASE_URL, key: SUPABASE_KEY });
      setIsConfigured(true);
    } 
    // Priority 2: Local Storage
    else {
      const storedUrl = localStorage.getItem('supabase_url');
      const storedKey = localStorage.getItem('supabase_key');
      if (storedUrl && storedKey) {
        setSbConfig({ url: storedUrl, key: storedKey });
        setIsConfigured(true);
      }
    }

    // Load Supabase Script
    if (!window.supabase) {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = () => setIsScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setIsScriptLoaded(true);
    }

    // Camera Permission Flow: Prime once
    const primeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); 
        console.log("Camera primed");
      } catch (e) { console.warn("Camera check", e); }
    };
    primeCamera();

    return () => { stopCamera(); audio.stopNoise(); };
  }, []);

  // --- 2. Initialize Supabase Client ---
  useEffect(() => {
    if (isScriptLoaded && isConfigured && sbConfig.url && sbConfig.key && !supabase) {
      try {
        const client = window.supabase.createClient(sbConfig.url, sbConfig.key);
        setSupabase(client);
        client.auth.getSession().then(({ data: { session } }) => setSession(session));
        client.auth.onAuthStateChange((_event, session) => setSession(session));
      } catch (e) {
        console.error("Supabase Init Error", e);
        setIsConfigured(false); 
      }
    }
  }, [isScriptLoaded, isConfigured, sbConfig]);

  // --- Camera Logic: Start ONLY on active Status ---
  const startCamera = async () => {
    if (streamRef.current && streamRef.current.active) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, frameRate: 15 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log("Play error:", e));
      }
    } catch (err) { console.error("Camera Start Error:", err); }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (status === 'focus' || status === 'warning' || status === 'nap') {
      startCamera(); 
    } else {
      stopCamera(); 
    }
  }, [status]);

  // --- Supabase Operations ---
  const saveConfig = (url, key) => { setSbConfig({ url, key }); setIsConfigured(true); };
  const resetConfig = () => { localStorage.removeItem('supabase_url'); localStorage.removeItem('supabase_key'); setIsConfigured(false); setSupabase(null); setSession(null); };
  const fetchHistory = async () => {
    if (!supabase || !session) return;
    setIsLoadingHistory(true);
    const { data, error } = await supabase.from('study_sessions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (!error) setHistory(data || []);
    setIsLoadingHistory(false);
  };
  const saveSessionToDB = async () => {
    if (!supabase || !session) return;
    const completedTasks = todos.filter(t => t.done).map(t => t.text);
    await supabase.from('study_sessions').insert({ user_id: session.user.id, duration: elapsedTime, completed_count: completedTasks.length, total_count: todos.length, task_titles: completedTasks });
  };

  // --- Timer & Motion Logic ---
  useEffect(() => {
    if (status !== 'focus') return;
    motionIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused) return;
      const ctx = canvasRef.current.getContext('2d');
      try {
        ctx.drawImage(videoRef.current, 0, 0, 50, 50); 
        const frameData = ctx.getImageData(0, 0, 50, 50).data;
        if (lastFrameData.current) {
          let diff = 0;
          for (let i = 0; i < frameData.length; i += 4) {
            if (Math.abs(frameData[i] - lastFrameData.current[i]) + Math.abs(frameData[i+1] - lastFrameData.current[i+1]) + Math.abs(frameData[i+2] - lastFrameData.current[i+2]) > 50) diff++; 
          }
          const score = Math.min(100, Math.floor(diff / 10));
          setMotionScore(score);
          if (score < 3) stillnessTimer.current += 1;
          else { stillnessTimer.current = 0; if (showPresenceCheck) setShowPresenceCheck(false); }
          if (stillnessTimer.current === 90) { setShowPresenceCheck(true); audio.playAlarm('ping'); }
          if (stillnessTimer.current > 105) { setShowPresenceCheck(false); triggerWarning('居眠り・不在検知', '長時間動きがありません。起きていますか？'); stillnessTimer.current = 0; }
        }
        lastFrameData.current = frameData;
      } catch (e) {}
    }, 1000); 
    return () => clearInterval(motionIntervalRef.current);
  }, [status, showPresenceCheck]);

  useEffect(() => { const handleVisibilityChange = () => { if (document.hidden && status === 'focus') triggerWarning('よそ見検知', '別のタブやアプリを開きましたね？集中しましょう。'); }; document.addEventListener("visibilitychange", handleVisibilityChange); return () => document.removeEventListener("visibilitychange", handleVisibilityChange); }, [status]);
  useEffect(() => { if (status === 'focus') audio.playNoise(activeSound); else audio.stopNoise(); }, [status, activeSound]);
  useEffect(() => {
    if (status === 'planning' || status === 'warning' || status === 'result') { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      if (status === 'focus') {
        setElapsedTime(prev => prev + 1);
        if (timerMode === 'countdown') setCurrentTime(prev => { if (prev <= 0) { completeSession(); return 0; } return prev - 1; }); else setCurrentTime(prev => prev + 1);
        if (activeTodoId) setTodos(curr => curr.map(t => (t.id === activeTodoId && !t.done) ? { ...t, remainingTime: t.remainingTime - 1 } : t));
      } else if (status === 'break') { setCurrentTime(prev => { if (prev <= 0) { triggerWarning('休憩時間超過', '休憩は最大5分です。直ちに学習に戻ってください。'); return 0; } return prev - 1; });
      } else if (status === 'nap') { const napDuration = (Date.now() - napStartTime) / 1000; setCurrentTime(Math.floor(napDuration)); if (napDuration > 15 * 60) { audio.playAlarm('napEnd'); triggerWarning('仮眠終了', '15分経過しました。起きて学習を再開しましょう！'); } }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, timerMode, napStartTime, activeTodoId]);

  const triggerWarning = (title, message) => { audio.playAlarm('warning'); setStatus('warning'); setSubStatus({ title, message }); };
  const resolveWarning = () => { setStatus('focus'); setSubStatus(null); stillnessTimer.current = 0; };
  const confirmPresence = () => { setShowPresenceCheck(false); stillnessTimer.current = 0; };
  const startBreak = () => { setCurrentTime(5 * 60); setStatus('break'); };
  const startNap = () => { setNapStartTime(Date.now()); setStatus('nap'); setHasTakenNap(true); };
  const startSession = () => { if (timerMode === 'countdown') setCurrentTime(targetTime * 60); else setCurrentTime(0); setHasTakenNap(false); audio.init(); setStatus('focus'); };
  const completeSession = () => { saveSessionToDB(); setStatus('result'); audio.playAlarm('end'); };
  const resetToPlanning = () => { setTodos(todos.filter(t => !t.done)); setStatus('planning'); setElapsedTime(0); setCurrentTime(0); setActiveTodoId(null); };
  
  const addTodo = (e) => { e.preventDefault(); if (!newTodo.trim()) return; const d = (newTodoHours * 3600) + (newTodoMinutes * 60); setTodos([...todos, { id: Date.now(), text: newTodo, initialTime: d, remainingTime: d, done: false }]); setNewTodo(''); setNewTodoHours(0); setNewTodoMinutes(30); if (status === 'focus') { setActiveTodoId(Date.now()); setIsAddingTask(false); }};
  const toggleTodoDone = (id) => { setTodos(todos.map(t => { if (t.id === id) { const done = !t.done; if (done && activeTodoId === id) setActiveTodoId(null); return { ...t, done }; } return t; })); };
  const selectActiveTodo = (id) => setActiveTodoId(activeTodoId === id ? null : id);
  const removeTodo = (id) => { setTodos(todos.filter(t => t.id !== id)); if (activeTodoId === id) setActiveTodoId(null); };
  const formatTime = (seconds) => { const isNeg = seconds < 0; const s = Math.abs(seconds); return `${isNeg?'-':''}${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`; };
  const formatTimeLong = (s) => (Math.floor(s/3600) > 0 ? `${Math.floor(s/3600)}h ` : '') + `${Math.floor((s%3600)/60)}m ${Math.floor(s%60)}s`;

  // --- VIEW ROUTING ---
  
  if (!isScriptLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Loading Libraries...</div>;
  if (!isConfigured) return <ConfigScreen onSave={saveConfig} />;
  // Only show reset config button if keys were NOT hardcoded (i.e. came from local storage)
  const canResetConfig = !(SUPABASE_URL && SUPABASE_KEY);
  if (!session) return <AuthScreen supabase={supabase} onResetConfig={resetConfig} showConfigReset={canResetConfig} />;

  // HISTORY OVERLAY
  if (showHistory && status === 'planning') {
    useEffect(() => { fetchHistory(); }, []);
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
        <div className="max-w-4xl w-full flex-1 flex flex-col">
          <header className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-bold flex items-center gap-2"><History className="text-indigo-400" /> 学習履歴</h2><button onClick={() => setShowHistory(false)} className="bg-slate-800 px-4 py-2 rounded-lg">閉じる</button></header>
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-6 overflow-y-auto">
            {isLoadingHistory ? <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-indigo-500" /></div> : history.length === 0 ? <div className="text-center text-slate-500 mt-20">履歴はまだありません</div> : 
              <div className="space-y-4">{history.map(item => (<div key={item.id} className="bg-slate-800 p-4 rounded-xl border border-white/5 flex justify-between gap-4"><div><div className="text-sm text-slate-400 mb-1 flex items-center gap-2"><Calendar className="w-3 h-3" /> {new Date(item.created_at).toLocaleString()}</div><div className="text-lg font-bold">集中: {formatTimeLong(item.duration)}</div>{item.task_titles?.map((t,i)=><span key={i} className="text-xs bg-indigo-900/50 text-indigo-200 px-2 py-0.5 rounded mr-1">{t}</span>)}</div><div className="bg-black/20 p-3 rounded-lg"><div className="text-sm text-slate-400">完了</div><div className="text-xl font-bold text-indigo-400">{item.completed_count}/{item.total_count}</div></div></div>))}</div>
            }
          </div>
        </div>
      </div>
    );
  }

  // RESULT SCREEN
  if (status === 'result') {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center animate-in fade-in">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 pointer-events-none"></div>
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
          <p className="text-emerald-400 text-sm mb-6 font-bold">データを保存しました</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-800 p-4 rounded-xl"><div className="text-xs text-slate-400 font-bold mb-1">FOCUS TIME</div><div className="text-3xl font-mono font-bold text-emerald-400">{formatTime(elapsedTime)}</div></div>
            <div className="bg-slate-800 p-4 rounded-xl"><div className="text-xs text-slate-400 font-bold mb-1">TASKS</div><div className="text-3xl font-mono font-bold text-indigo-400">{todos.filter(t=>t.done).length}/{todos.length}</div></div>
          </div>
          <button onClick={resetToPlanning} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl flex items-center justify-center gap-2 text-white"><Home className="w-5 h-5" /> ホームに戻る</button>
        </div>
      </div>
    );
  }

  // PLANNING SCREEN
  if (status === 'planning') {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          <div className="absolute top-8 right-8 flex gap-2">
            <button onClick={() => setShowHistory(true)} className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg flex items-center gap-2"><History className="w-4 h-4 text-indigo-400" /> 履歴</button>
            <button onClick={() => supabase.auth.signOut()} className="text-sm bg-slate-800 hover:bg-red-900/50 hover:text-red-300 px-3 py-2 rounded-lg flex items-center gap-2"><LogOut className="w-4 h-4" /> ログアウト</button>
          </div>
          <header className="mb-8 text-center"><h1 className="text-3xl font-bold flex items-center justify-center gap-3 mb-2"><Activity className="text-indigo-400" /> 勉強集中室 v14</h1><p className="text-slate-400">学習計画を立てて、逃げ場のない集中環境に入りましょう。</p><p className="text-xs text-slate-600 mt-2 flex justify-center items-center gap-1"><User className="w-3 h-3"/> {session.user.email}</p></header>
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            <div className="flex flex-col h-full bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="text-emerald-400" /> 1. 全体タイマー</h2>
              <div className="flex bg-black/30 p-1 rounded-lg mb-6 shrink-0"><button onClick={() => setTimerMode('countdown')} className={`flex-1 py-2 text-sm rounded-md ${timerMode === 'countdown' ? 'bg-indigo-600' : 'text-slate-400'}`}>目標設定</button><button onClick={() => setTimerMode('countup')} className={`flex-1 py-2 text-sm rounded-md ${timerMode === 'countup' ? 'bg-indigo-600' : 'text-slate-400'}`}>カウントアップ</button></div>
              <div className="flex-1 flex flex-col items-center justify-center">{timerMode === 'countdown' ? <><div className="text-5xl font-mono font-bold w-40 text-center mb-4">{targetTime}<span className="text-lg text-slate-500 ml-1">min</span></div><input type="range" min="5" max="180" step="5" value={targetTime} onChange={(e) => setTargetTime(Number(e.target.value))} className="w-full accent-indigo-500" /></> : <div className="text-slate-400 text-center"><Clock className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>時間は無制限です。</p></div>}</div>
            </div>
            <div className="flex flex-col h-full bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><CheckCircle className="text-indigo-400" /> 2. タスク登録</h2>
              <div className="flex-1 overflow-y-auto min-h-[200px] space-y-2 mb-4 bg-black/20 rounded-xl p-2 custom-scrollbar">
                {todos.map(todo => (<div key={todo.id} className="flex justify-between bg-slate-900 p-3 rounded border border-white/5 group"><div className="flex gap-3"><span className="font-bold text-slate-300">{todo.text}</span><span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">{formatTimeLong(todo.initialTime)}</span></div><button onClick={() => removeTodo(todo.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button></div>))}
                {todos.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2"><Target className="w-8 h-8 opacity-50" /><span className="text-sm">タスクを追加してください</span></div>}
              </div>
              <form onSubmit={addTodo} className="bg-slate-900 p-3 rounded-xl border border-white/10 shrink-0"><input type="text" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="課題名" className="w-full bg-transparent border-b border-slate-700 focus:border-indigo-500 outline-none py-1 mb-2 text-sm" /><div className="flex items-center gap-2 mt-2"><input type="number" value={newTodoHours} onChange={(e) => setNewTodoHours(Math.max(0, Number(e.target.value)))} className="w-12 bg-black/20 border border-slate-700 rounded px-1 py-1 text-sm text-center" placeholder="H" /><span className="text-xs text-slate-400">時間</span><input type="number" value={newTodoMinutes} onChange={(e) => setNewTodoMinutes(Math.max(0, Number(e.target.value)))} className="w-12 bg-black/20 border border-slate-700 rounded px-1 py-1 text-sm text-center" placeholder="M" /><span className="text-xs text-slate-400">分</span><button type="submit" className="ml-auto bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded text-white text-xs font-bold">追加</button></div></form>
            </div>
          </div>
          <button onClick={startSession} className="w-full mt-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xl rounded-2xl shadow-lg transform hover:scale-[1.01] transition-all flex items-center justify-center gap-3"><Play className="fill-current" /> 集中セッションを開始する</button>
        </div>
      </div>
    );
  }

  // FOCUS SCREEN
  return (
    <div className={`h-screen text-white font-sans transition-colors duration-500 flex flex-col overflow-hidden ${status === 'warning' ? 'bg-red-950' : 'bg-slate-950'}`}>
      <canvas ref={canvasRef} width="50" height="50" className="hidden" />
      <header className="px-6 py-2 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-md shrink-0 h-[60px]">
        <div className="flex items-center gap-3"><Activity className={`w-5 h-5 ${status === 'focus' ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`} /><h1 className="font-bold tracking-wider text-lg">Focus Room</h1><span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${status === 'focus' ? 'bg-indigo-500/20 text-indigo-300 ring-1' : 'bg-slate-700'}`}>{status === 'focus' ? '集中監視中' : status.toUpperCase()}</span></div>
        <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1"><Volume2 className="w-4 h-4 text-slate-400" /><select className="bg-transparent text-sm focus:outline-none cursor-pointer w-20" value={activeSound} onChange={(e) => setActiveSound(e.target.value)}>{SOUND_TYPES.map(s => <option key={s.id} value={s.id} className="text-black">{s.name}</option>)}</select></div>
      </header>
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden h-[calc(100vh-60px)]">
        <div className="col-span-3 flex flex-col h-full bg-slate-900 rounded-xl border border-white/10 overflow-hidden relative">
          <div className="p-3 border-b border-white/10 bg-white/5 font-bold text-sm text-indigo-300 flex items-center justify-between"><span className="flex items-center gap-2"><Target className="w-4 h-4" /> タスク選択</span><button onClick={() => setIsAddingTask(!isAddingTask)} className="text-xs bg-indigo-600 px-2 py-1 rounded"><Plus className="w-3 h-3"/></button></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar pb-20">
            {isAddingTask && <form onSubmit={addTodo} className="bg-indigo-900/30 p-2 rounded border border-indigo-500/50 mb-2"><input autoFocus type="text" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="今やるタスク..." className="w-full bg-transparent border-b border-indigo-500/50 focus:border-indigo-500 outline-none text-sm mb-2" /><div className="flex gap-1"><input type="number" value={newTodoMinutes} onChange={(e) => setNewTodoMinutes(Number(e.target.value))} className="w-10 text-xs bg-black/20 rounded px-1" /><button type="submit" className="ml-auto text-xs bg-indigo-500 px-2 rounded">開始</button></div></form>}
            {todos.map(todo => (<div key={todo.id} onClick={() => selectActiveTodo(todo.id)} className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${activeTodoId === todo.id ? 'bg-indigo-600/20 border-indigo-500' : todo.done ? 'bg-slate-800/30 opacity-50' : 'bg-slate-800 border-white/5'}`}><div className="flex items-center gap-3"><button onClick={(e) => { e.stopPropagation(); toggleTodoDone(todo.id); }} className={`w-4 h-4 rounded border flex items-center justify-center ${todo.done ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'}`}>{todo.done && <CheckCircle className="w-3 h-3 text-white" />}</button><div className="flex-1 min-w-0"><div className={`text-sm font-bold truncate ${todo.done ? 'line-through' : ''}`}>{todo.text}</div><div className="flex justify-between items-center mt-1"><span className="text-xs font-mono text-slate-400">残り: {formatTime(todo.remainingTime)}</span>{activeTodoId === todo.id && <span className="text-[10px] text-indigo-300 animate-pulse">RUNNING</span>}</div></div></div></div>))}
          </div>
        </div>
        <div className="col-span-6 flex flex-col h-full gap-4">
          <div className={`flex-1 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden border-2 shadow-xl transition-colors min-h-0 ${status === 'warning' ? 'bg-red-900/50 border-red-500' : 'bg-slate-900 border-indigo-500/30'}`}>
            <div className="absolute top-4 left-0 right-0 text-center"><div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full border ${activeTodoId ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-slate-700/50 border-slate-600'}`}><span className={`text-xs font-bold uppercase tracking-wider ${activeTodoId ? 'text-indigo-300' : 'text-slate-400'}`}>{activeTodoId ? 'NOW DOING:' : 'NO TASK SELECTED'}</span>{activeTodoId && <span className="text-sm font-bold text-white max-w-[200px] truncate">{todos.find(t => t.id === activeTodoId)?.text}</span>}</div></div>
            <div className="text-center z-10 flex flex-col items-center"><div className="text-sm font-bold uppercase tracking-widest text-white/50 mb-2">{status === 'nap' ? 'NAP TIME' : status === 'break' ? 'BREAK TIME' : 'TOTAL TIME'}</div><div className="text-7xl lg:text-8xl xl:text-9xl font-mono font-bold tracking-tighter tabular-nums drop-shadow-2xl leading-none">{formatTime(currentTime)}</div><div className="mt-8 flex gap-4">{status === 'warning' ? <button onClick={resolveWarning} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl animate-pulse flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> 再開</button> : status === 'focus' ? <><button onClick={startBreak} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center gap-2 transition-all hover:scale-105"><Coffee className="w-5 h-5" /> 休憩</button><button onClick={completeSession} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-red-500/30 text-red-300 rounded-xl flex items-center gap-2 transition-all hover:scale-105"><Square className="w-5 h-5" /> 終了</button></> : <button onClick={() => setStatus('focus')} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"><Play className="w-5 h-5" /> 集中に戻る</button>}</div></div>
            {showPresenceCheck && <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in"><div className="bg-slate-800 p-6 rounded-2xl border border-yellow-500 shadow-2xl text-center max-w-sm"><Hand className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-bounce" /><h3 className="text-xl font-bold text-white mb-2">集中確認</h3><p className="text-slate-300 mb-6">静止状態が続いています。まだ起きていますか？</p><button onClick={confirmPresence} className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl">はい、集中しています</button></div></div>}
          </div>
          <div className="h-[35%] bg-black rounded-xl overflow-hidden border border-white/10 shadow-lg relative group shrink-0"><video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transform scale-x-[-1] transition-all duration-500 ${cameraBlur ? 'blur-2xl opacity-50' : 'blur-0 opacity-100'}`} /><div className="absolute top-2 left-2 flex gap-2"><span className={`w-2 h-2 rounded-full ${motionScore > 2 ? 'bg-green-500' : 'bg-red-500'} animate-ping`}></span><span className="text-[10px] bg-black/50 px-1 rounded text-white/80 flex items-center gap-1">{motionScore > 2 ? '在席確認中' : '静止中...'}</span></div><button onClick={() => setCameraBlur(!cameraBlur)} className="absolute top-2 right-2 bg-black/50 p-1.5 rounded text-white/80 hover:bg-black/70 transition-colors">{cameraBlur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button><div className="absolute bottom-2 left-2 w-20 h-1 bg-gray-700 rounded overflow-hidden"><div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${motionScore}%` }}></div></div></div>
        </div>
        <div className="col-span-3 flex flex-col h-full"><IndependentStopwatch /></div>
      </main>
      {status === 'warning' && <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200"><div className="max-w-md w-full bg-red-950 border-2 border-red-600 rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(220,38,38,0.5)] relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-2 bg-red-600 animate-pulse"></div>{subStatus?.title === 'よそ見検知' ? <AlertOctagon className="w-20 h-20 text-red-500 mx-auto mb-6 animate-bounce" /> : <UserX className="w-20 h-20 text-red-500 mx-auto mb-6 animate-pulse" />}<h2 className="text-3xl font-bold text-white mb-2">{subStatus?.title}</h2><p className="text-red-200 mb-8 text-lg font-bold">{subStatus?.message}</p><button onClick={resolveWarning} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xl shadow-lg transition-all">学習を再開する</button></div></div>}
    </div>
  );
}