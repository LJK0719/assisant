"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/components/ui/mobile-navigation';

interface PasswordAuthProps {
  onAuthenticated: () => void;
}

export function PasswordAuth({ onAuthenticated }: PasswordAuthProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '20040719') {
      setError('');
      onAuthenticated();
    } else {
      setError('密码错误');
      setPassword('');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 ${isMobile ? 'px-4' : ''}`}>
      <div className={`${isMobile ? 'w-full max-w-sm' : 'max-w-md w-full'} space-y-8 ${isMobile ? 'p-6' : 'p-8'} bg-white rounded-lg shadow-lg`}>
        <div className="text-center">
          <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>
            AI事务代理智能体
          </h2>
          <p className={`mt-2 ${isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>
            请输入密码访问系统
          </p>
        </div>
        
        <form className={`${isMobile ? 'mt-6' : 'mt-8'} space-y-6`} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="sr-only">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={`relative block w-full px-4 ${isMobile ? 'py-3' : 'py-2'} border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 ${isMobile ? 'text-base' : 'text-sm'} touch-target`}
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className={`text-red-600 ${isMobile ? 'text-sm' : 'text-sm'} text-center`}>
              {error}
            </div>
          )}

          <div>
            <Button
              type="submit"
              className={`group relative w-full flex justify-center ${isMobile ? 'py-3' : 'py-2'} px-4 border border-transparent ${isMobile ? 'text-base' : 'text-sm'} font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-target`}
            >
              登录
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
