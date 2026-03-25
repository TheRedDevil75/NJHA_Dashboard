import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Must contain a letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const { refreshUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: theme?.backgroundColor ?? '#F9FAFB' }}
    >
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg px-8 py-10">
        <h1 className="text-2xl font-bold mb-2" style={{ color: theme?.textColor }}>
          Change Password
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          You must set a new password before continuing.
        </p>

        {success ? (
          <div className="text-center py-6">
            <p className="text-green-600 font-semibold text-lg">Password changed!</p>
            <p className="text-sm text-gray-500 mt-1">Redirecting…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Current Password</label>
              <input
                {...register('currentPassword')}
                type="password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
              />
              {errors.currentPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">New Password</label>
              <input
                {...register('newPassword')}
                type="password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
              />
              {errors.newPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-sm font-semibold text-white rounded-lg transition-opacity min-h-[48px]"
              style={{ backgroundColor: theme?.primaryColor ?? '#2563EB', opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? 'Saving…' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
