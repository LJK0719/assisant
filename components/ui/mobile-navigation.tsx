"use client";

import React from 'react';
import { 
  MessageSquare, 
  CheckSquare,
  Calendar,
  Mail
} from 'lucide-react';

type ViewMode = 'chat' | 'tasks' | 'schedule' | 'messages';

interface MobileNavigationProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

const navigationItems = [
  {
    id: 'chat' as ViewMode,
    label: 'AI助手',
    icon: MessageSquare,
    activeColor: 'text-blue-600',
    inactiveColor: 'text-gray-500'
  },
  {
    id: 'tasks' as ViewMode,
    label: '任务',
    icon: CheckSquare,
    activeColor: 'text-green-600',
    inactiveColor: 'text-gray-500'
  },
  {
    id: 'schedule' as ViewMode,
    label: '日程',
    icon: Calendar,
    activeColor: 'text-purple-600',
    inactiveColor: 'text-gray-500'
  },
  {
    id: 'messages' as ViewMode,
    label: '留言',
    icon: Mail,
    activeColor: 'text-orange-600',
    inactiveColor: 'text-gray-500'
  }
];

export function MobileNavigation({ currentView, onViewChange, className = '' }: MobileNavigationProps) {
  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 安全区域适配 */}
      <div className="pb-safe">
        <div className="flex items-center justify-around px-2 py-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-2 
                  transition-colors duration-200 rounded-lg mx-1
                  ${isActive ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                `}
                aria-label={item.label}
              >
                <Icon 
                  className={`w-6 h-6 mb-1 transition-colors duration-200 ${
                    isActive ? item.activeColor : item.inactiveColor
                  }`} 
                />
                <span className={`text-xs font-medium transition-colors duration-200 ${
                  isActive 
                    ? item.activeColor.replace('600', '700') + ' dark:' + item.activeColor.replace('600', '400')
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// 响应式工具 Hook
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}