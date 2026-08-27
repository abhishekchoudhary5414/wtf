import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm/LoginForm';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
