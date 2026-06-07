import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Shield, Eye, EyeOff, Wifi, Lock, User, AlertTriangle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfa, setMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);

    // Simulate auth — in production this calls POST /api/auth/login
    setTimeout(() => {
      setLoading(false);
      if (username === 'admin' && password === 'cyberai') {
        setMfa(true);
      } else {
        setError('Invalid credentials. Default: admin / cyberai');
      }
    }, 1200);
  }

  function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (mfaCode === '123456' || mfaCode.length === 6) {
        navigate('/');
      } else {
        setError('Invalid MFA code. Use any 6-digit code.');
      }
    }, 800);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0D1117' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(227,0,15,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-10"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'rgba(227,0,15,0.1)',
              border: '1px solid rgba(227,0,15,0.3)',
              boxShadow: '0 0 40px rgba(227,0,15,0.2)',
            }}
          >
            <Shield className="w-8 h-8 text-[#E3000F]" style={{ filter: 'drop-shadow(0 0 10px rgba(227,0,15,0.8))' }} />
          </div>
          <h1 className="text-[#F0F6FC] text-2xl font-bold tracking-tight">
            Cyber<span className="text-[#E3000F]">AI</span>
          </h1>
          <p className="text-[#8B949E] text-sm mt-1">Security Operations Platform</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card rounded-2xl p-8"
          style={{ boxShadow: '0 0 60px rgba(0,0,0,0.4)' }}
        >
          {!mfa ? (
            <>
              <h2 className="text-[#F0F6FC] font-semibold text-lg mb-1">Sign in</h2>
              <p className="text-[#8B949E] text-sm mb-6">Access your command center</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-xs text-[#8B949E] mb-1.5">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="admin"
                      autoComplete="username"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-[#F0F6FC] outline-none transition-all duration-200"
                      style={{
                        background: 'rgba(13,17,23,0.8)',
                        border: '1px solid rgba(48,54,61,0.9)',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(227,0,15,0.5)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(48,54,61,0.9)'; }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs text-[#8B949E] mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm text-[#F0F6FC] outline-none transition-all duration-200"
                      style={{
                        background: 'rgba(13,17,23,0.8)',
                        border: '1px solid rgba(48,54,61,0.9)',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(227,0,15,0.5)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(48,54,61,0.9)'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg"
                    style={{ background: 'rgba(227,0,15,0.08)', border: '1px solid rgba(227,0,15,0.25)' }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-[#E3000F] shrink-0" />
                    <span className="text-[#E3000F] text-xs">{error}</span>
                  </motion.div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 mt-2"
                  style={{
                    background: loading ? 'rgba(227,0,15,0.3)' : 'rgba(227,0,15,0.9)',
                    color: '#fff',
                    boxShadow: loading ? 'none' : '0 0 20px rgba(227,0,15,0.35)',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Authenticating…
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(48,54,61,0.6)' }}>
                <p className="text-[#8B949E] text-xs text-center">
                  Demo credentials: <span className="text-[#F0F6FC] font-mono">admin</span> / <span className="text-[#F0F6FC] font-mono">cyberai</span>
                </p>
              </div>
            </>
          ) : (
            /* MFA Step */
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(77,171,247,0.1)', border: '1px solid rgba(77,171,247,0.2)' }}>
                  <Shield className="w-5 h-5 text-[#4DABF7]" />
                </div>
                <div>
                  <h2 className="text-[#F0F6FC] font-semibold text-base">Two-Factor Authentication</h2>
                  <p className="text-[#8B949E] text-xs mt-0.5">Enter the 6-digit code from your authenticator</p>
                </div>
              </div>

              <form onSubmit={handleMfa} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#8B949E] mb-1.5">Authentication Code</label>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-lg text-center text-xl font-mono tracking-[0.5em] text-[#F0F6FC] outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(13,17,23,0.8)',
                      border: '1px solid rgba(48,54,61,0.9)',
                      letterSpacing: '0.4em',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(77,171,247,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(48,54,61,0.9)'; }}
                    autoFocus
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg"
                    style={{ background: 'rgba(227,0,15,0.08)', border: '1px solid rgba(227,0,15,0.25)' }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-[#E3000F] shrink-0" />
                    <span className="text-[#E3000F] text-xs">{error}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background: mfaCode.length === 6 ? 'rgba(77,171,247,0.9)' : 'rgba(48,54,61,0.5)',
                    color: mfaCode.length === 6 ? '#fff' : '#8B949E',
                    boxShadow: mfaCode.length === 6 ? '0 0 20px rgba(77,171,247,0.3)' : 'none',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Verifying…
                    </span>
                  ) : 'Verify & Enter'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMfa(false); setError(''); setMfaCode(''); }}
                  className="w-full py-2 text-xs text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
                >
                  ← Back to sign in
                </button>
              </form>

              <p className="text-[#8B949E] text-xs text-center mt-4">
                Demo: any 6-digit code will work
              </p>
            </>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center gap-2 mt-6"
        >
          <Wifi className="w-3.5 h-3.5 text-[#8B949E]" />
          <span className="text-[#8B949E] text-xs">End-to-end encrypted · SOC 2 Type II certified</span>
        </motion.div>
      </div>
    </div>
  );
}
