import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getErrorMessage } from '../api/client';

interface LoginForm {
  username: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      await login(data.username, data.password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const btnRadius =
    theme?.buttonStyle === 'pill' ? '9999px' :
    theme?.buttonStyle === 'square' ? '4px' : '8px';

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: theme?.backgroundColor ?? '#F9FAFB' }}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div
          className="bg-white px-8 py-10 shadow-lg"
          style={{
            borderRadius: theme?.cardStyle === 'pill' ? '16px' : theme?.cardStyle === 'flat' ? '0' : '12px',
            border: theme?.cardStyle === 'bordered' ? '1px solid #E5E7EB' : 'none',
            boxShadow: theme?.cardStyle === 'flat' ? 'none' : undefined,
          }}
        >
          {/* Logo / App name */}
          <div className="text-center mb-8">
            {theme?.logoUrl && (
              <img src={theme.logoUrl} alt="Logo" className="h-14 mx-auto mb-4" />
            )}
            <h1 className="text-2xl font-bold" style={{ color: theme?.textColor ?? '#111827' }}>
              {theme?.appName ?? 'Symptom Tracker'}
            </h1>
            {theme?.loginMessage && (
              <p className="mt-2 text-sm text-gray-600">{theme.loginMessage}</p>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: theme?.textColor }}>
                Username
              </label>
              <input
                {...register('username', { required: true })}
                type="text"
                autoComplete="username"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': theme?.primaryColor } as React.CSSProperties}
                placeholder="Enter your username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: theme?.textColor }}>
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', { required: true })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-sm font-semibold text-white transition-opacity min-h-[48px]"
              style={{
                backgroundColor: theme?.primaryColor ?? '#2563EB',
                borderRadius: btnRadius,
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
