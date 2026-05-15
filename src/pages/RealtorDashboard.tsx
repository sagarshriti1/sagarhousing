import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Home, BarChart3, Clock, Loader2 } from 'lucide-react';
import RealtorExpiredBanner from '@/components/RealtorExpiredBanner';
import { format } from 'date-fns';

const safeParseDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  try {
    const normalized = (dateStr.includes(' ') && !dateStr.includes('T'))
      ? dateStr.replace(' ', 'T')
      : dateStr;
    const finalStr = (normalized.length === 10 && !normalized.includes('T'))
      ? `${normalized}T00:00:00`
      : normalized;
    return new Date(finalStr);
  } catch (e) {
    return null;
  }
};

const formatLocalDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  const date = safeParseDate(dateStr);
  if (!date || isNaN(date.getTime())) return 'Invalid Date';
  return format(date, 'MMM d, yyyy');
};

const RealtorDashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [realtor, setRealtor] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    // Only fetch data if auth is ready and we have the correct role
    if (loading || !user || role !== 'realtor') return;

    const fetchData = async () => {
      setFetching(true);
      const [realtorRes, propsRes, profileRes] = await Promise.all([
        supabase
          .from('realtors')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_properties')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('is_active')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      setRealtor(realtorRes.data);
      setProperties(propsRes.data ?? []);
      setIsActive(profileRes.data?.is_active ?? true);
      
      const rData = realtorRes.data;
      const active = !!rData
        && (rData.payment_status === 'paid' || rData.payment_status === 'promotion' || rData.payment_status === 'bypassed')
        && (() => {
          const d = safeParseDate(rData.expiration_date);
          return !d || isNaN(d.getTime()) || d > new Date();
        })();
      setRealtorInactive(!active);
      
      setFetching(false);
    };
    fetchData();
  }, [user, role, loading]);

  const [isActive, setIsActive] = useState(true);
  const [realtorInactive, setRealtorInactive] = useState(false);

  const disableAdd = !isActive || realtorInactive;
  const disableTitle = !isActive 
    ? "Your account is deactivated. Please contact support." 
    : "Your Realtor profile is inactive or expired. Renew your subscription to post new listings.";


  // STICKY AUTH GATE:
  // Wait if loading is true OR if we have a user but the role hasn't loaded yet.
  if (loading || (user && !role)) {
    return (
      <div className='min-h-screen flex flex-col'>
        <Header />
        <main className='flex-1 flex items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <Loader2 className='h-10 w-10 animate-spin text-accent' />
            <p className='text-muted-foreground animate-pulse'>
              Resuming session...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Only redirect if loading is finished and we are SURE they aren't a realtor
  if (!user || role !== 'realtor') {
    return <Navigate to='/' replace />;
  }

  const isExpired = (() => {
    if (!realtor?.expiration_date) return false;
    const d = safeParseDate(realtor.expiration_date);
    return !!d && !isNaN(d.getTime()) && d < new Date(new Date().toDateString());
  })();

  if (isExpired) {
    return (
      <RealtorExpiredBanner
        realtorId={realtor.id}
        onRenewed={() => window.location.reload()}
      />
    );
  }

  return (
    <div className='min-h-screen flex flex-col bg-background'>
      <Header />
      <main className='flex-1 container py-8'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8'>
          <div>
            <h1 className='text-3xl font-display font-bold text-foreground'>
              Realtor Dashboard
            </h1>
            <p className='text-muted-foreground'>
              Manage your properties and profile
            </p>
          </div>
          {disableAdd ? (
            <Button
              className='gap-2 bg-accent text-accent-foreground hover:bg-accent/90'
              disabled
              title={disableTitle}
            >
              <Plus className='h-4 w-4' /> List New Property
            </Button>
          ) : (
            <Link to='/list-property'>
              <Button className='gap-2 bg-accent text-accent-foreground hover:bg-accent/90'>
                <Plus className='h-4 w-4' /> List New Property
              </Button>
            </Link>
          )}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
              <CardTitle className='text-sm font-medium'>
                Total Listings
              </CardTitle>
              <Home className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{properties.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
              <CardTitle className='text-sm font-medium'>
                Active Listings
              </CardTitle>
              <BarChart3 className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {properties.filter(p => p.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
              <CardTitle className='text-sm font-medium'>
                Subscription Ends
              </CardTitle>
              <Clock className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {realtor?.expiration_date
                  ? formatLocalDate(realtor.expiration_date)
                  : '—'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Listings</CardTitle>
            <CardDescription>
              A list of properties you have posted on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className='flex justify-center py-8'>
                <Loader2 className='animate-spin text-muted-foreground' />
              </div>
            ) : properties.length === 0 ? (
              <div className='text-center py-12'>
                <p className='text-muted-foreground mb-4'>
                  You haven't posted any listings yet.
                </p>
                {disableAdd ? (
                  <Button variant='outline' disabled title={disableTitle}>
                    Create your first listing
                  </Button>
                ) : (
                  <Link to='/list-property'>
                    <Button variant='outline'>Create your first listing</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className='font-medium'>{p.title}</TableCell>
                        <TableCell>Rs. {(p.price || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.status === 'active' ? 'default' : 'secondary'
                            }
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => navigate(`/edit-property/${p.id}`)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default RealtorDashboard;
