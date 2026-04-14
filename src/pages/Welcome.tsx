import { motion } from 'framer-motion';
import { BookOpen, CalendarDays, LayoutGrid, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const { setHasSeenWelcome } = useStore();
  const navigate = useNavigate();

  const handleStart = () => {
    setHasSeenWelcome();
    navigate('/');
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
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16 px-4">
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

        {/* CTA Button */}
        <motion.button
          variants={itemVariants}
          onClick={handleStart}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative flex items-center justify-center gap-3 px-10 py-5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-semibold text-lg overflow-hidden shadow-2xl shadow-zinc-900/20 dark:shadow-white/10 w-full sm:w-auto min-w-[240px]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Sparkles className="w-5 h-5 relative z-10 opacity-70 group-hover:text-white transition-colors" />
          <span className="relative z-10 tracking-wide group-hover:text-white transition-colors">开启专属空间</span>
          <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 group-hover:text-white transition-all" />
        </motion.button>
      </motion.div>
    </div>
  );
}
