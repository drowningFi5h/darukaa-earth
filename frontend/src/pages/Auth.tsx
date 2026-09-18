import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Brand } from '../components/Brand';
import { Button } from '../components/ui/button';
import { post, type User } from '../lib/api';
const schema = z.object({
  name: z.string().max(100).optional(),
  email: z.email('Enter a valid email address'),
  password: z.string().min(10, 'Use at least 10 characters').max(128),
});
type Values = z.infer<typeof schema>;
export default function Auth({ register = false }: { register?: boolean }) {
  const navigate = useNavigate(),
    cache = useQueryClient();
  const {
    register: field,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const success = (user: User) => {
    cache.clear();
    cache.setQueryData(['me'], user);
    navigate('/app');
  };
  const submit = useMutation({
    mutationFn: (values: Values) => post<User>(register ? '/auth/register' : '/auth/login', values),
    onSuccess: success,
  });
  const demo = useMutation({ mutationFn: () => post<User>('/auth/demo'), onSuccess: success });
  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img src="/images/hero.webp" alt="Sunlight in a quiet forest" width="1000" height="1400" />
        <Brand />
        <div>
          <h2>
            A better future
            <br />
            begins with
            <br />
            <em>a closer look.</em>
          </h2>
          <p>Your landscapes. Your observations. One place to grow.</p>
        </div>
      </div>
      <main className="auth-main">
        <Link to="/" className="text-link">
          Back to home
        </Link>
        <div className="auth-form">
          <p className="section-label">Darukaa Earth</p>
          <h1>{register ? 'Rooted in possibility.' : 'Welcome back.'}</h1>
          <p>
            {register
              ? 'Create a workspace for your carbon and biodiversity projects.'
              : 'Your landscapes are waiting. Pick up where you left off.'}
          </p>
          <form
            onSubmit={handleSubmit((values) => {
              if (register && !values.name?.trim()) {
                setError('name', { message: 'Enter your name' }, { shouldFocus: true });
                return;
              }
              submit.mutate(values);
            })}
          >
            {register && (
              <label>
                Your name
                <input autoComplete="name" {...field('name')} aria-invalid={!!errors.name} />
                {errors.name && <span className="field-error">{errors.name.message}</span>}
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                spellCheck={false}
                {...field('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && <span className="field-error">{errors.email.message}</span>}
            </label>
            <label>
              Password
              <input
                type="password"
                aria-label="Password"
                autoComplete={register ? 'new-password' : 'current-password'}
                {...field('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && <span className="field-error">{errors.password.message}</span>}
              {register && <span className="field-hint">At least 10 characters.</span>}
            </label>
            {submit.error && (
              <p role="alert" className="error-box">
                {submit.error.message}
              </p>
            )}
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? 'Please wait…' : register ? 'Create account' : 'Log in'}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="auth-divider">
            <span>Or take a look around</span>
          </div>
          <Button variant="outline" onClick={() => demo.mutate()} disabled={demo.isPending}>
            {demo.isPending ? 'Opening demo…' : 'Explore the read-only demo'}
          </Button>
          {demo.error && (
            <p role="alert" className="error-box">
              {demo.error.message}
            </p>
          )}
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to Darukaa?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        </div>
        <small>Thoughtfully built for a world worth protecting.</small>
      </main>
    </div>
  );
}
