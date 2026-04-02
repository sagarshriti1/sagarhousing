import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Shield, Building2, UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AccountType = 'user' | 'realtor';

const accountTypes: { value: AccountType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'user', label: 'User', description: 'Browse & post listings', icon: <UserIcon className="h-5 w-5" /> },
  { value: 'realtor', label: 'Realtor', description: 'List properties & build your profile', icon: <Building2 className="h-5 w-5" /> },
];

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AccountType>('user');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName, role: selectedRole },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success('Account created! Check your email to verify.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-background flex flex-col items-center justify-center p-4'>
      <Link to='/' className='flex items-center gap-2 mb-8'>
        <Home className='h-6 w-6 text-accent' />
        <span className='font-display text-2xl font-bold text-foreground'>
          Welcome Home
        </span>
      </Link>

      <div className='w-full max-w-md bg-card rounded-lg border border-border p-8 shadow-card'>
        <h1 className='font-display text-2xl font-bold text-foreground mb-2 text-center'>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className='text-muted-foreground text-center mb-6'>
          {isSignUp
            ? 'Choose your account type and sign up'
            : 'Sign in to your account'}
        </p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {isSignUp && (
            <>
              <div className='space-y-2'>
                <Label>Account Type</Label>
                <div className='grid grid-cols-3 gap-2'>
                  {accountTypes.map((type) => (
                    <button
                      key={type.value}
                      type='button'
                      onClick={() => setSelectedRole(type.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center',
                        selectedRole === type.value
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                      )}
                    >
                      {type.icon}
                      <span className='text-xs font-semibold'>{type.label}</span>
                      <span className='text-[10px] leading-tight opacity-70'>{type.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='displayName'>Display Name</Label>
                <Input
                  id='displayName'
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder='John Doe'
                  required={isSignUp}
                />
              </div>
            </>
          )}
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='you@example.com'
              required
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='password'>Password</Label>
            <Input
              id='password'
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder='••••••••'
              required
              minLength={6}
            />
          </div>
          <Button
            type='submit'
            className='w-full bg-accent text-accent-foreground hover:bg-accent/90'
            disabled={loading}
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>

        <p className='text-center text-sm text-muted-foreground mt-6'>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className='text-accent hover:underline font-medium'
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
