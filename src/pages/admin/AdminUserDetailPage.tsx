import { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import PaymentHistoryList from '@/components/PaymentHistoryList';
import ConfirmSaveButton from '@/components/ConfirmSaveButton';
import {
  ArrowLeft,
  Pencil,
  KeyRound,
  Trash2,
  UserCheck,
  UserX,
  Home,
  ChevronRight,
  Loader2, // Added Loader2 for Sticky Auth Gate
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  NEPAL_CITIES,
  NEPAL_DISTRICTS,
  getDistrictForCity,
} from '@/data/nepalLocations';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  job_title: string | null;
  location: string | null;
  street_address: string | null;
  is_active: boolean;
  contact_details: string | null;
  bio: string | null;
  created_at: string;
}

const parseLocation = (loc: string | null | undefined) => {
  if (!loc) return { city: '', district: '' };
  const [city = '', district = ''] = loc.split(',').map(s => s.trim());
  return { city, district };
};
const joinLocation = (c: string, d: string) =>
  [c, d].filter(Boolean).join(', ');

const AdminUserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [properties, setProperties] = useState<any[]>([]);
  const [draft, setDraftState] = useState<Profile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const clearEditError = (k: string) =>
    setEditErrors(prev => {
      if (!prev[k]) return prev;
      const { [k]: _, ...rest } = prev;
      return rest;
    });
  const setDraft = (next: Profile | null) => {
    setEditDirty(true);
    setDraftState(next);
  };
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const [{ data: p }, { data: r }, { data: props }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_properties')
          .select(
            'id, title, city, district, listing_type, price, status, expiration_date',
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);
      setProfile(p as Profile);
      setUserRole(r?.role ?? 'user');
      setProperties(props ?? []);
    };
    if (role === 'admin') load();
  }, [userId, role]);

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
    if (!profile?.email) {
      toast.error('No email on file');
      return;
    }
    setConfirm({
      title: 'Send Password Reset',
      description: `Send a password reset email to "${profile.email}"?`,
      onConfirm: async () => {
        const ok = await callAdminAction({
          action: 'reset_password',
          email: profile.email,
        });
        if (ok) toast.success('Password reset email sent');
      },
    });
  };

  const handleToggleActive = () => {
    if (!profile) return;
    const action = profile.is_active ? 'deactivate' : 'activate';
    setConfirm({
      title: profile.is_active ? 'Deactivate Account' : 'Activate Account',
      description: `Are you sure you want to ${action} "${profile.display_name || profile.email}"?`,
      onConfirm: async () => {
        const ok = await callAdminAction({ action, userId: profile.user_id });
        if (ok) {
          toast.success(`Account ${action}d`);
          setProfile({ ...profile, is_active: !profile.is_active });
        }
      },
    });
  };

  const handleDelete = () => {
    if (!profile) return;
    setConfirm({
      title: 'Delete user account?',
      description: `This will permanently delete "${profile.display_name || profile.email}". This action cannot be undone.`,
      onConfirm: async () => {
        const ok = await callAdminAction({
          action: 'delete_user',
          userId: profile.user_id,
        });
        if (ok) {
          toast.success('User deleted');
          navigate('/admin');
        }
      },
    });
  };

  const openEdit = () => {
    if (profile) {
      setDraftState({ ...profile });
      setEditDirty(false);
      setEditErrors({});
      setEditOpen(true);
    }
  };

  const validEmailFormat = (s: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const saveEdit = async () => {
    if (!draft) return;
    const errs: Record<string, string> = {};
    if (!draft.display_name?.trim()) errs.display_name = 'Name is required';
    if (!draft.email?.trim()) errs.email = 'Email is required';
    else if (!validEmailFormat(draft.email))
      errs.email = 'Enter a valid email address';
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      return;
    }
    setEditErrors({});
    const { id, ...rest } = draft;
    const { error } = await supabase.from('profiles').update(rest).eq('id', id);
    if (error) toast.error('Failed to save profile');
    else {
      toast.success('Profile updated');
      setProfile(draft);
      setEditDirty(false);
      setEditOpen(false);
    }
  };

  if (!profile) {
    return (
      <div className='min-h-screen flex flex-col'>
        <Header />
        <main className='flex-1 container py-8'>
          <div className='flex flex-col items-center justify-center h-full gap-3 text-muted-foreground'>
            <Loader2 className='h-8 w-8 animate-spin' />
            <p>Loading User Data...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const loc = parseLocation(profile.location);

  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <main className='flex-1 container py-8 max-w-4xl space-y-6'>
        {(() => {
          const backTab =
            userRole === 'admin'
              ? 'admins'
              : userRole === 'realtor'
                ? 'realtors'
                : 'non-realtors';
          const backLabel =
            userRole === 'admin'
              ? 'Back to Admin Dashboard'
              : userRole === 'realtor'
                ? 'Back to Realtors'
                : 'Back to Non-Realtors';
          return (
            <Link
              to={`/admin?tab=${backTab}`}
              className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground'
            >
              <ArrowLeft className='h-4 w-4' /> {backLabel}
            </Link>
          );
        })()}

        <Card>
          <CardHeader>
            <div className='flex items-start justify-between gap-4 flex-wrap'>
              <div className='flex items-center gap-4'>
                <div className='h-16 w-16 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xl font-bold text-muted-foreground'>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=''
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    (profile.display_name || profile.email || '?')
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>
                <div>
                  <CardTitle className='text-2xl'>
                    {profile.display_name || 'Unnamed'}
                  </CardTitle>
                  <div className='flex items-center gap-2 mt-1'>
                    <Badge variant='outline' className='capitalize'>
                      {userRole}
                    </Badge>
                    <Badge
                      variant={profile.is_active ? 'default' : 'secondary'}
                    >
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-2'
                  onClick={openEdit}
                >
                  <Pencil className='h-4 w-4' /> Edit
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-2'
                  onClick={handleResetPassword}
                >
                  <KeyRound className='h-4 w-4' /> Reset Password
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-2'
                  onClick={handleToggleActive}
                >
                  {profile.is_active ? (
                    <>
                      <UserX className='h-4 w-4' /> Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className='h-4 w-4' /> Activate
                    </>
                  )}
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
              <span className='text-muted-foreground'>Email:</span>{' '}
              <span className='text-foreground'>{profile.email || '—'}</span>
            </div>
            <div>
              <span className='text-muted-foreground'>Phone:</span>{' '}
              <span className='text-foreground'>{profile.phone || '—'}</span>
            </div>
            {userRole === 'admin' && (
              <div>
                <span className='text-muted-foreground'>Job Title:</span>{' '}
                <span className='text-foreground'>
                  {profile.job_title || '—'}
                </span>
              </div>
            )}
            <div>
              <span className='text-muted-foreground'>Location:</span>{' '}
              <span className='text-foreground'>
                {[loc.city, loc.district].filter(Boolean).join(', ') || '—'}
              </span>
            </div>

            {/* Added Profile Created, explicitly read-only and uneditable */}
            <div>
              <span className='text-muted-foreground'>Profile Created:</span>{' '}
              <span className='text-foreground'>
                {profile.created_at
                  ? format(
                      new Date(
                        profile.created_at.includes('T')
                          ? profile.created_at
                          : `${profile.created_at}T00:00:00`,
                      ),
                      'MMM d, yyyy',
                    )
                  : '—'}
              </span>
            </div>

            <div className='sm:col-span-2'>
              <span className='text-muted-foreground'>Street Address:</span>{' '}
              <span className='text-foreground'>
                {profile.street_address || '—'}
              </span>
            </div>
            <div className='sm:col-span-2'>
              <span className='text-muted-foreground'>
                Contact Details for Viewers:
              </span>
              <p className='text-foreground whitespace-pre-line mt-1'>
                {profile.contact_details || '—'}
              </p>
            </div>
            <div className='sm:col-span-2 mt-2 pt-3 border-t'>
              <span className='text-muted-foreground'>About Me:</span>
              <p className='text-foreground whitespace-pre-line mt-1'>
                {profile.bio || '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        {userRole !== 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Home className='h-5 w-5' /> Listed Properties (
                {properties.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  No listings yet.
                </p>
              ) : (
                <ul className='divide-y divide-border'>
                  {properties.map(p => (
                    <li key={p.id}>
                      <button
                        onClick={() => navigate(`/admin/property/${p.id}`)}
                        className='w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-muted/50 px-2 rounded-md transition'
                      >
                        <div className='min-w-0 flex-1'>
                          <p className='font-medium text-foreground truncate'>
                            {p.title}
                          </p>
                          <p className='text-xs text-muted-foreground truncate'>
                            {p.city}
                            {p.district ? `, ${p.district}` : ''} •{' '}
                            {p.listing_type === 'rent'
                              ? 'For Rent'
                              : 'For Sale'}{' '}
                            • Rs. {Number(p.price).toLocaleString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            p.status === 'active' ? 'default' : 'secondary'
                          }
                          className='capitalize shrink-0'
                        >
                          {p.status}
                        </Badge>
                        <ChevronRight className='h-4 w-4 text-muted-foreground shrink-0' />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {userRole !== 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentHistoryList
                userId={profile.user_id}
                canEditNotes
                compact
              />
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className='space-y-4'>
              <div>
                <Label>Name *</Label>
                <Input
                  value={draft.display_name ?? ''}
                  onChange={e => {
                    setDraft({ ...draft, display_name: e.target.value });
                    clearEditError('display_name');
                  }}
                  aria-invalid={!!editErrors.display_name}
                />
                {editErrors.display_name && (
                  <p className='text-xs text-destructive mt-1'>
                    {editErrors.display_name}
                  </p>
                )}
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  value={draft.email ?? ''}
                  onChange={e => {
                    setDraft({ ...draft, email: e.target.value });
                    clearEditError('email');
                  }}
                  aria-invalid={!!editErrors.email}
                />
                {editErrors.email && (
                  <p className='text-xs text-destructive mt-1'>
                    {editErrors.email}
                  </p>
                )}
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={draft.phone ?? ''}
                  onChange={e => setDraft({ ...draft, phone: e.target.value })}
                />
              </div>
              {userRole === 'admin' && (
                <div>
                  <Label>Job Title</Label>
                  <Input
                    value={draft.job_title ?? ''}
                    onChange={e =>
                      setDraft({ ...draft, job_title: e.target.value })
                    }
                  />
                </div>
              )}
              <div>
                <Label>Street Address</Label>
                <Input
                  value={draft.street_address ?? ''}
                  onChange={e =>
                    setDraft({ ...draft, street_address: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Contact Details for Viewers</Label>
                <Textarea
                  rows={4}
                  maxLength={600}
                  placeholder='Phone, WhatsApp, office address, etc.'
                  value={draft.contact_details ?? ''}
                  onChange={e => {
                    const lines = e.target.value.split('\n');
                    const trimmed =
                      lines.length > 6
                        ? lines.slice(0, 6).join('\n')
                        : e.target.value;
                    setDraft({ ...draft, contact_details: trimmed });
                  }}
                  className='resize-none'
                />
                <p className='text-xs text-muted-foreground mt-1'>
                  Shown publicly on the user's property listings. Max 6 lines.
                </p>
              </div>
              <div>
                <Label>About Me</Label>
                <Textarea
                  rows={5}
                  maxLength={1000}
                  placeholder='Tell others a bit about yourself...'
                  value={draft.bio ?? ''}
                  onChange={e => setDraft({ ...draft, bio: e.target.value })}
                  className='resize-none'
                />
                <p className='text-xs text-muted-foreground mt-1'>
                  Max 1000 characters.
                </p>
              </div>
              {userRole !== 'realtor' &&
                (() => {
                  const l = parseLocation(draft.location);
                  return (
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <Label>City</Label>
                        <Select
                          value={l.city}
                          onValueChange={c =>
                            setDraft({
                              ...draft,
                              location: joinLocation(
                                c,
                                getDistrictForCity(c) || l.district,
                              ),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder='Select City' />
                          </SelectTrigger>
                          <SelectContent>
                            {NEPAL_CITIES.map(c => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>District</Label>
                        <Select
                          value={l.district}
                          onValueChange={d =>
                            setDraft({
                              ...draft,
                              location: joinLocation(l.city, d),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder='Select District' />
                          </SelectTrigger>
                          <SelectContent>
                            {NEPAL_DISTRICTS.map(d => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <ConfirmSaveButton onConfirm={saveEdit} disabled={!editDirty}>
              Save Changes
            </ConfirmSaveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

export default AdminUserDetailPage;
