import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Menu, X, Heart, User, Plus, LogOut, Shield, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, signOut } = useAuth();

  return (
    <header className='sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border'>
      <div className='container flex items-center justify-between h-16'>
        <Link to='/' className='flex items-center gap-2'>
          <Home className='h-6 w-6 text-accent' />
          <span className='font-display text-xl font-bold text-foreground'>
            Welcome Home
          </span>
        </Link>

        <nav className='hidden md:flex items-center gap-8'>
          <Link
            to='/'
            className='text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
          >
            Buy
          </Link>
          <Link
            to='/'
            className='text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
          >
            Rent
          </Link>
          <Link
            to={user ? '/list-property' : '/auth'}
            className='text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
          >
            Sell
          </Link>
          <Link
            to='/'
            className='text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
          >
            Estimate
          </Link>
        </nav>

        <div className='hidden md:flex items-center gap-3'>
          {user ? (
            <>
              <Link to='/list-property'>
                <Button variant='outline' size='sm' className='gap-2'>
                  <Plus className='h-4 w-4' /> List Property
                </Button>
              </Link>
              <Button variant='ghost' size='icon'>
                <Heart className='h-5 w-5' />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='icon'>
                    <User className='h-5 w-5' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem className='text-xs text-muted-foreground'>
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to='/my-listings'>My Listings</Link>
                  </DropdownMenuItem>
                  {(role === 'realtor' || role === 'admin') && (
                    <DropdownMenuItem asChild>
                      <Link to='/realtor-dashboard'><Megaphone className='h-4 w-4 mr-2' /> Realtor Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  {role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to='/admin'><Shield className='h-4 w-4 mr-2' /> Admin Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className='text-destructive'
                  >
                    <LogOut className='h-4 w-4 mr-2' /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to='/auth'>
              <Button
                size='sm'
                className='bg-accent text-accent-foreground hover:bg-accent/90'
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>

        <Button
          variant='ghost'
          size='icon'
          className='md:hidden'
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className='h-5 w-5' />
          ) : (
            <Menu className='h-5 w-5' />
          )}
        </Button>
      </div>

      {mobileOpen && (
        <div className='md:hidden border-t border-border bg-card animate-fade-in'>
          <nav className='container py-4 flex flex-col gap-3'>
            <Link to='/' className='text-sm font-medium py-2 text-foreground'>
              Buy
            </Link>
            <Link to='/' className='text-sm font-medium py-2 text-foreground'>
              Rent
            </Link>
            <Link to={user ? '/list-property' : '/auth'} className='text-sm font-medium py-2 text-foreground'>
              Sell
            </Link>
            {user ? (
              <>
                <Link
                  to='/list-property'
                  className='text-sm font-medium py-2 text-foreground'
                >
                  List Property
                </Link>
                <Link
                  to='/my-listings'
                  className='text-sm font-medium py-2 text-foreground'
                >
                  My Listings
                </Link>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={signOut}
                  className='w-full mt-2'
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to='/auth'>
                <Button
                  size='sm'
                  className='w-full bg-accent text-accent-foreground hover:bg-accent/90 mt-2'
                >
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
