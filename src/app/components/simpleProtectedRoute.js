// components/SimpleProtectedRoute.js
'use client';
import { useEffect } from 'react';
import { isAuthenticated } from '../utils/auth';
import { useRouter } from 'next/navigation';

export default function SimpleProtectedRoute({ children }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, []);

  return isAuthenticated() ? children : null;
}