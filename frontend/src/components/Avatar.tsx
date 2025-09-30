// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface AvatarProps {
  userId: string;
  size?: number;
  className?: string;
  version?: number | string; // измените, чтобы обновить изображение
  fallback?: React.ReactNode;
}

const Avatar: React.FC<AvatarProps> = ({ userId, size = 40, className = '', version, fallback }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let revokedUrl: string | null = null;
    setError(false);
    setSrc(null);
    (async () => {
      try {
        const res = await api.get(`/users/${userId}/avatar`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        setSrc(url);
        revokedUrl = url;
      } catch (e) {
        setError(true);
      }
    })();
    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [userId, version]);

  if (error || !src) {
    return (
      <div
        className={`rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        {fallback ?? <span className="text-lg">🧑‍💼</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="avatar"
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
};

export default Avatar;


