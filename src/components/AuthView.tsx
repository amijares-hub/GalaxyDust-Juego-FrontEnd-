import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import spaceBackground from '../assets/images/space_background_1779360172256.png';

export const AuthView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg("Todos los campos son obligatorios.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // La sesión se actualizará en AuthContext automáticamente
      } else {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user && data.user.identities?.length === 0) {
          throw new Error("Este correo ya está registrado.");
        }
        setSuccessMsg("REGISTRO EXITOSO. ENLACE ENVIADO A LA BANDEJA (SI CORRESPONDE).");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error en la autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0C0D0E] flex flex-col justify-center items-center font-sans select-none text-white">
      {/* Background space planet subtle overlay */}
      <div 
        className="absolute inset-0 opacity-[0.12] pointer-events-none z-0"
        style={{
          backgroundImage: `url(${spaceBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none z-0">
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#1C1E22] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#111214] rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="flex flex-col items-center mb-6">
          <ShieldCheck className="w-10 h-10 text-cyan-500 mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
          <h1 className="text-xl font-black uppercase tracking-[0.4em] text-white">GALAXYDUST</h1>
          <p className="text-[10px] tracking-widest text-cyan-400 mt-1 uppercase">Terminal de Acceso Seguro</p>
        </div>

        <div className="bg-[#121315]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Tabs */}
          <div className="flex w-full mb-6 relative">
            <div className="flex-1 text-center">
              <button 
                onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`w-full pb-2 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'login' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
              >
                Iniciar Sesión
              </button>
            </div>
            <div className="flex-1 text-center">
              <button 
                onClick={() => { setActiveTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`w-full pb-2 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeTab === 'register' ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
              >
                Registro
              </button>
            </div>
            {/* Animated Tab Indicator */}
            <motion.div 
              className="absolute bottom-0 h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              initial={false}
              animate={{
                left: activeTab === 'login' ? '0%' : '50%',
                width: '50%'
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <div className="absolute bottom-0 w-full h-[1px] bg-white/10 -z-10" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all"
                  placeholder="comandante@galaxydust.io"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase tracking-[0.2em] text-[#A0A2A5] font-medium ml-1">
                Clave de Seguridad
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#1A1C20] border border-white/5 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:bg-[#1C1E22] outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg mt-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="text-[10px] font-mono text-red-400 uppercase leading-tight tracking-wider">{errorMsg}</span>
                  </div>
                </motion.div>
              )}
              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-[10px] font-mono text-emerald-400 uppercase leading-tight tracking-wider">{successMsg}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                activeTab === 'login' ? 'ESTABLECER CONEXIÓN' : 'REGISTRAR FIRMA'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
