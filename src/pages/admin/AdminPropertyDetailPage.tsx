import { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PaymentHistoryList from '@/components/PaymentHistoryList';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Pencil,
  KeyRound,
  Trash2,
  Home,
  Bed,
  Bath,
  Maximize,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminPropertyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

const safeParseDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  try {
    const normalized = (dateStr.includes(' ') && !dateStr.includes('T'))
      ? dateStr.replace(' ', 'T')
      : dateStr;
    const finalStr = (normalized.length === 10 && !normalized.includes('T'))
      ? `${normalized}T00:00:00`
      : normalized;
    const d = new Date(finalStr);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

const formatSafeDate = (dateStr: string | null | undefined) => {
  const d = safeParseDate(dateStr);
  if (!d) return '—';
  return format(d, 'MMM d, yyyy');
};

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('user_properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      setProperty(data);
      if (data?.user_id) {
        const { data: p } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', data.user_id)
          .maybeSingle();
        setOwnerEmail(p?.email ?? null);
      }
    };
    if (role === 'admin') load();
  }, [id, role]);

  // ---------------------------------------------------------
  // 🚨 STICKY AUTH GATE: FIXES THE REFRESH BUG
  // ---------------------------------------------------------
  if (loading || (user && !role)) {
    return (
      <div className='min-h-screen flex flex-col'>
        <Header />
        <main className='flex-1 flex items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <Loader2 className='h-10 w-10 animate-spin text-accent' />
            <p className='text-muted-foreground animate-pulse'>
              Verifying access...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || role !== 'admin') return <Navigate to='/' replace />;
  // ---------------------------------------------------------

  const callAdminAction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body,
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Action failed');
      return false;
    }
    return true;
  };

  const handleResetPassword = () => {
    if (!ownerEmail) {
      toast.error('No owner email on file');
      return;
    }
    setConfirm({
      title: 'Send Password Reset',
      description: `Send a password reset email to the owner "${ownerEmail}"?`,
      onConfirm: async () => {
        const ok = await callAdminAction({
          action: 'reset_password',
          email: ownerEmail,
        });
        if (ok) toast.success('Password reset email sent');
      },
    });
  };

  const handleDelete = () => {
    setConfirm({
      title: 'Delete property?',
      description: `This will permanently delete "${property?.title}". This action cannot be undone.`,
      onConfirm: async () => {
        const { error } = await supabase
          .from('user_properties')
          .delete()
          .eq('id', id!);
        if (error) toast.error('Failed to delete property');
        else {
          toast.success('Property deleted');
          navigate('/admin?tab=properties');
        }
      },
    });
  };

  if (!property) {
    return (
      <div className='min-h-screen flex flex-col'>
        <Header />
        <main className='flex-1 container py-8'>
          <div className='flex flex-col items-center justify-center h-full gap-3 text-muted-foreground'>
            <Loader2 className='h-8 w-8 animate-spin' />
            <p>Loading Property Data...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // UPDATED LOCAL DATE FORMATTING
  const expired = (() => {
    if (!property.expiration_date) return false;
    const d = safeParseDate(property.expiration_date);
    return !!d && d < new Date(new Date().toDateString());
  })();
  const isActive = property.status === 'active' && !expired;

  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <main className='flex-1 container py-8 max-w-4xl space-y-6'>
        <Link
          to='/admin?tab=properties'
          className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='h-4 w-4' /> Back to Properties
        </Link>

        <Card>
          <CardHeader>
            <div className='flex items-start justify-between gap-4 flex-wrap'>
              <div className='flex items-start gap-4'>
                <div className='w-32 h-24 rounded-md overflow-hidden bg-muted shrink-0'>
                  {property.images?.[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center text-muted-foreground'>
                      <Home className='h-6 w-6' />
                    </div>
                  )}
                </div>
                <div>
                  <CardTitle className='text-2xl'>{property.title}</CardTitle>
                  <p className='text-sm text-muted-foreground mt-1'>
                    Property ID: {property.property_code} · {property.address},{' '}
                    {property.city}
                    {property.district ? `, ${property.district}` : ''}
                  </p>
                  <div className='flex items-center gap-2 mt-2 flex-wrap'>
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {expired ? 'expired' : property.status}
                    </Badge>
                    <Badge variant='outline' className='capitalize'>
                      {property.listing_type}
                    </Badge>
                    <Badge variant='outline' className='capitalize'>
                      {property.property_type}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-2'
                  onClick={() => navigate(`/edit-property/${property.id}`)}
                >
                  <Pencil className='h-4 w-4' /> Edit
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-2'
                  onClick={() => navigate(`/property/db-${property.id}`)}
                >
                  <Home className='h-4 w-4' /> View Public Listing
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-2'
                  onClick={handleResetPassword}
                >
                  <KeyRound className='h-4 w-4' /> Reset Owner Password
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-2 text-destructive'
                  onClick={handleDelete}
                >
                  <Trash2 className='h-4 w-4' /> Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm'>
            <div>
              <span className='text-muted-foreground'>Price:</span>{' '}
              <span className='text-foreground font-bold'>
                Rs. {Number(property.price).toLocaleString()}
              </span>
            </div>
            <div>
              <span className='text-muted-foreground'>Owner:</span>{' '}
              <span className='text-foreground'>{ownerEmail || '—'}</span>
            </div>
            <div className='flex items-center gap-3'>
              <Bed className='h-4 w-4 text-muted-foreground' />{' '}
              {property.bedrooms} beds
            </div>
            <div className='flex items-center gap-3'>
              <Bath className='h-4 w-4 text-muted-foreground' />{' '}
              {property.bathrooms} baths
            </div>
            {property.sqft && (
              <div className='flex items-center gap-3'>
                <Maximize className='h-4 w-4 text-muted-foreground' />{' '}
                {property.sqft.toLocaleString()} sqft
              </div>
            )}

            {/* UPDATED LOCAL DATE FORMATTING */}
            <div>
              <span className='text-muted-foreground'>Active until:</span>{' '}
              <span className='text-foreground'>
                {property.expiration_date
                  ? format(
                      new Date(
                        property.expiration_date.includes('T')
                          ? property.expiration_date
                          : `${property.expiration_date}T00:00:00`,
                      ),
                      'MMM d, yyyy',
                    )
                  : '—'}
              </span>
            </div>

            {property.description && (
              <div className='sm:col-span-2'>
                <span className='text-muted-foreground'>Description:</span>{' '}
                <p className='text-foreground mt-1'>{property.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentHistoryList
              relatedType='property'
              relatedId={property.id}
              canEditNotes
              compact
            />
          </CardContent>
        </Card>
      </main>
      <Footer />

      <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await confirm?.onConfirm();
                setConfirm(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPropertyDetailPage;
