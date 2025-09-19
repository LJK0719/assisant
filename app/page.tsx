"use client";

import { useState, useEffect } from 'react';
import { MainDashboard } from './main-dashboard';
import { PasswordAuth } from '@/components/password-auth';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 检查是否已经在本地存储中保存了认证状态
  useEffect(() => {
    const authStatus = localStorage.getItem('authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    localStorage.setItem('authenticated', 'true');
  };

  if (!isAuthenticated) {
    return <PasswordAuth onAuthenticated={handleAuthenticated} />;
  }

  return <MainDashboard />;
}