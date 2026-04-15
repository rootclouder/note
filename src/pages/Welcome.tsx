import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CalendarDays, LayoutGrid, ArrowRight, Sparkles, User, Key, X, FileText } from 'lucide-react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const { setHasSeenWelcome, login, register, logout } = useStore();
  const navigate = useNavigate();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleGuestStart = () => {
    logout(); // Ensure we are in guest mode
    setHasSeenWelcome();
    navigate('/');
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!username.trim() || !password.trim()) {
      setErrorMsg('用户名和密码不能为空');
      return;
    }

    if (isLoginMode) {
      const success = login(username, password);
      if (success) {
        setHasSeenWelcome();
        navigate('/');
      } else {
        setErrorMsg('用户名或密码错误');
      }
    } else {
      const success = register(username, password);
      if (success) {
        setHasSeenWelcome();
        navigate('/');
      } else {
        setErrorMsg('该用户名已被注册');
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0, scale: 0.95 },
    visible: { 
      y: 0, 
      opacity: 1, 
      scale: 1,
      transition: { type: "spring", stiffness: 100, damping: 20 } 
    }
  };

  const features = [
    {
      icon: CalendarDays,
      title: "时间感知",
      desc: "以日历为骨架，俯瞰全局。把每天的思绪与任务缝合进时间的流隙中。"
    },
    {
      icon: LayoutGrid,
      title: "四象限法则",
      desc: "要事第一。用直觉拖拽理清优先级，在杂乱无章中找回专注与秩序。"
    },
    {
      icon: BookOpen,
      title: "沉浸式日记",
      desc: "支持 Markdown 富文本。所见即所得的输入体验，给情绪一个安静的容器。"
    },
    {
      icon: FileText,
      title: "笔记本体系",
      desc: "支持多层级笔记本与全文搜索。把知识、灵感与项目拆解成可复用的结构。"
    }
  ];

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center relative overflow-hidden bg-transparent z-50 py-12">
      {/* Decorative ambient lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-400/10 dark:bg-teal-500/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl w-full flex flex-col items-center z-10"
      >
        {/* Brand Header */}
        <motion.div variants={itemVariants} className="flex flex-col items-center mb-16 relative">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative mb-10"
          >
            <div className="absolute inset-0 bg-teal-400 dark:bg-teal-500 blur-2xl opacity-40 dark:opacity-20 scale-150 rounded-full" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-b from-teal-300 to-emerald-500 shadow-2xl shadow-teal-500/30 flex items-center justify-center ring-1 ring-white/20">
              <BookOpen className="w-12 h-12 text-white drop-shadow-md" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 border-[1px] border-dashed border-teal-400/30 dark:border-teal-500/30 rounded-full"
            />
          </motion.div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold text-center tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-zinc-800 to-zinc-500 dark:from-white dark:to-zinc-400 drop-shadow-sm">
              自由记
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-center text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium">
            把失控的日子理顺，将飞逝的灵感捕获。<br className="hidden md:block" />这是你独属的精神自留地。
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-16 px-4">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="group relative bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl p-8 rounded-3xl border border-white/40 dark:border-zinc-700/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/40 dark:to-emerald-900/40 flex items-center justify-center mb-6 border border-teal-100 dark:border-teal-800/50 group-hover:scale-110 transition-transform duration-500">
                <feature.icon className="w-7 h-7 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">{feature.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-4">
          <motion.button
            onClick={() => setIsAuthModalOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex items-center justify-center gap-3 px-10 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-semibold text-lg overflow-hidden shadow-2xl shadow-zinc-900/20 dark:shadow-white/10 w-full sm:w-auto min-w-[200px]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <User className="w-5 h-5 relative z-10 opacity-70 group-hover:text-white transition-colors" />
            <span className="relative z-10 tracking-wide group-hover:text-white transition-colors">登录账号</span>
          </motion.button>
          
          <motion.button
            onClick={handleGuestStart}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center justify-center gap-3 px-10 py-4 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md text-zinc-900 dark:text-white rounded-full font-semibold text-lg overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm hover:shadow-md hover:bg-white/80 dark:hover:bg-zinc-800/80 transition-all w-full sm:w-auto min-w-[200px]"
          >
            <Sparkles className="w-5 h-5 text-teal-500" />
            <span className="tracking-wide">在线体验</span>
            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-all" />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/50 dark:border-zinc-800 p-8 rounded-3xl shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-400 shadow-lg shadow-teal-500/20 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {isLoginMode ? '欢迎回来' : '创建新账号'}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
                  {isLoginMode ? '登录以载入你的账号数据' : '注册专属账号，隔离你的个人数据'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="用户名"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                    />
                  </div>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="密码"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-red-500 text-sm text-center font-medium"
                  >
                    {errorMsg}
                  </motion.p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 mt-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all"
                >
                  {isLoginMode ? '登录' : '注册'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {isLoginMode ? '还没有账号？' : '已有账号？'}
                <button 
                  onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    setErrorMsg('');
                  }}
                  className="ml-2 text-teal-600 dark:text-teal-400 font-medium hover:underline underline-offset-4"
                >
                  {isLoginMode ? '立即注册' : '直接登录'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
