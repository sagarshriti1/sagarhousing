import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, User, LogOut, LayoutDashboard, PlusCircle, Home } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const Header = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setOpen(false);
  };

  const navLinks = [];

  if (role === 'admin') {
    navLinks.push({
      name: 'Admin Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className='h-4 w-4' />,
    });
  } else if (role === 'realtor') {
    navLinks.push({
      name: 'Realtor Dashboard',
      href: '/realtor-dashboard',
      icon: <LayoutDashboard className='h-4 w-4' />,
    });
    navLinks.push({
      name: 'List Property',
      href: '/list-property',
      icon: <PlusCircle className='h-4 w-4' />,
    });
  } else if (user) {
    navLinks.push({
      name: 'My Listings',
      href: '/my-listings',
      icon: <PlusCircle className='h-4 w-4' />,
    });
  }

  return (
    <header className='relative z-50 w-full border-b bg-background'>
      <div className='container flex h-16 items-center justify-between px-4'>
        <Link to='/' className='flex items-center gap-2'>
          <Home className='h-6 w-6 text-[#FF6B00]' />
          {/* Brand Name updated to NAYA THAU with Orange color */}
          <span className='text-xl font-bold tracking-tight text-[#FF6B00] uppercase'>
            NAYA <span className='text-foreground'>THAU</span>
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className='hidden md:flex items-center gap-6 text-sm font-medium'>
          {navLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className='transition-colors hover:text-[#FF6B00]'
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className='flex items-center gap-2'>
          {user ? (
            <>
              <div className='hidden md:flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => navigate('/profile')}
                >
                  <User className='mr-2 h-4 w-4' /> Profile
                </Button>
                <Button variant='outline' size='sm' onClick={handleSignOut}>
                  <LogOut className='mr-2 h-4 w-4' /> Sign Out
                </Button>
              </div>

              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild className='md:hidden'>
                  <Button variant='ghost' size='icon'>
                    <Menu className='h-6 w-6' />
                  </Button>
                </SheetTrigger>
                <SheetContent side='right' className='w-[300px] sm:w-[400px]'>
                  <SheetHeader>
                    <SheetTitle className='text-left font-bold'>
                      Menu
                    </SheetTitle>
                  </SheetHeader>
                  <div className='grid gap-4 py-6'>
                    {navLinks.map(link => (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setOpen(false)}
                        className='flex items-center gap-4 text-lg font-semibold hover:text-[#FF6B00] transition-colors'
                      >
                        {link.icon}
                        {link.name}
                      </Link>
                    ))}
                    <Link
                      to='/profile'
                      onClick={() => setOpen(false)}
                      className='flex items-center gap-4 text-lg font-semibold hover:text-[#FF6B00] transition-colors'
                    >
                      <User className='h-5 w-5' />
                      My Profile
                    </Link>
                    <div className='pt-4 border-t'>
                      <Button
                        className='w-full justify-start text-destructive hover:text-destructive'
                        variant='ghost'
                        onClick={handleSignOut}
                      >
                        <LogOut className='mr-4 h-5 w-5' />
                        Logout
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            /* Login/Register Button updated to Orange */
            <Button
              size='sm'
              onClick={() => navigate('/auth')}
              className='bg-[#FF6B00] hover:bg-[#E66000] text-white border-none'
            >
              Login / Register
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
