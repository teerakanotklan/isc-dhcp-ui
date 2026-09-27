import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const RouteProgressBar: React.FC = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(35);
    const t1 = setTimeout(() => setProgress(75), 100);
    const t2 = setTimeout(() => {
      setProgress(100);
      const t3 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(t3);
    }, 250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-50 transition-all duration-200"
      style={{ width: `${progress}%` }}
    />
  );
};
