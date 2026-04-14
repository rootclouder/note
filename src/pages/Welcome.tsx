import { motion } from 'framer-motion';
import { BookOpen, CalendarDays, LayoutGrid, ArrowRight } from 'lucide-react';
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
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const features = [
    {
      icon: CalendarDays,
      title: "日历总览",
      desc: "以日历为中心，清晰掌握每一天的状态、任务和心情。"
    },
    {
      icon: LayoutGrid,
      title: "四象限待办",
      desc: "基于重要紧急四象限法则管理任务，支持拖拽与一键延期。"
    },
    {
      icon: BookOpen,
      title: "图文日记",
      desc: "支持 Markdown 富文本编辑，记录每日心情与天气。"
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-transparent transition-colors duration-700 p-6 z-50">
      {/* Abstract Background Shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-400/20 dark:bg-teal-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/20 dark:bg-emerald-900/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl w-full flex flex-col items-center z-10"
      >
        <motion.div variants={itemVariants} className="mb-12">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 to-emerald-400 shadow-xl shadow-teal-500/20 flex items-center justify-center mx-auto mb-8">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-center text-zinc-900 dark:text-white tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">自由记</span>
          </h1>
          <p className="text-lg md:text-xl text-center text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            一款极简精致的个人管理工具，帮你找回生活的掌控感。
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-teal-600 dark:text-teal-400">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.button
          variants={itemVariants}
          onClick={handleStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group relative flex items-center gap-3 px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-medium text-lg overflow-hidden shadow-xl shadow-zinc-900/20 dark:shadow-white/10"
        >
          <span className="relative z-10">开始使用</span>
          <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.button>
      </motion.div>
    </div>
  );
}
