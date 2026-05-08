import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Star,
  Pencil,
  Trash2,
  Shield,
  Users,
  Home,
  MapPin,
  Plus,
  Camera,
  Loader2,
  KeyRound,
  UserCheck,
  UserX,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sliders,
} from 'lucide-react';
import FeaturesTab from '@/components/admin/FeaturesTab';
import PaymentHistoryList from '@/components/PaymentHistoryList';
import ConfirmSaveButton from '@/components/ConfirmSaveButton';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import RealtorFormDialog, {
  type RealtorFormData,
} from '@/components/admin/RealtorFormDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  NEPAL_CITIES,
  NEPAL_DISTRICTS,
  getDistrictForCity,
} from '@/data/nepalLocations';

const parseLocation = (
  loc: string | null | undefined,
): { city: string; district: string } => {
  if (!loc) return { city: '', district: '' };
  const [city = '', district = ''] = loc.split(',').map(s => s.trim());
  return { city, district };
};
const joinLocation = (city: string, district: string) =>
  [city, district].filter(Boolean).join(', ');

const formatLocalDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  const date = new Date(
    dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`,
  );
  return format(date, 'MMM d, yyyy');
};

interface Realtor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  city: string;
  state: string;
  district: string;
  street_address: string | null;
  bio: string | null;
  specialties: string[] | null;
  years_experience: number | null;
  is_featured: boolean;
  user_id: string | null;
  start_date: string | null;
  expiration_date: string | null;
  payment_status: string;
  payment_bypassed: boolean;
  license_number: string | null;
  updated_by?: string | null;
  featured_start_date: string | null;
  featured_expiration_date: string | null;
  featured_payment_status: string | null;
  featured_payment_bypassed: boolean;
  created_at: string;
}

interface UserProfile {
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
  updated_by?: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'realtor' | 'user';
}

interface Property {
  id: string;
  property_code?: number | null;
  title: string;
  city: string;
  district?: string;
  state: string;
  price: number;
  status: string;
  listing_type: string;
  user_id: string;
  updated_by?: string | null;
  expiration_date?: string | null;
  created_at: string;
}

interface ConfirmAction {
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
}

const AdminDashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') ?? 'admins';
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState('');
  const [editingProfile, setEditingProfileState] = useState<UserProfile | null>(
    null,
  );

  const [showInactive, setShowInactive] = useState(false);
  const [realtorDialogOpen, setRealtorDialogOpen] = useState(false);
  const [realtorDialogMode, setRealtorDialogMode] = useState<'create' | 'edit'>(
    'create',
  );
  const [selectedRealtor, setSelectedRealtor] =
    useState<RealtorFormData | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [sortConfig, setSortConfig] = useState<
    Record<string, { key: string; dir: 'asc' | 'desc' } | null>
  >({});

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserRole, setCreateUserRole] = useState<
    'admin' | 'realtor' | 'user'
  >('user');
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'user',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchAll = async () => {
    const [r, p, ro, pr] = await Promise.all([
      supabase.from('realtors').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('user_properties').select('*'),
    ]);
    setRealtors(r.data ?? []);
    setProfiles((p.data ?? []) as UserProfile[]);
    setRoles(ro.data ?? []);
    setProperties(pr.data ?? []);
  };

  useEffect(() => {
    if (role === 'admin') fetchAll();
  }, [role]);

  // STICKY AUTH GATE:
  // If loading is true OR if we have a user but role query hasn't finished, WAIT.
  if (loading || (user && !role)) {
    return (
      <div className='min-h-screen flex flex-col'>
        <Header />
        <main className='flex-1 flex items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <Loader2 className='h-10 w-10 animate-spin text-accent' />
            <p className='text-muted-foreground animate-pulse'>
              Verifying administration access...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Only redirect if loading is finished and they definitely aren't an admin
  if (!user || role !== 'admin') return <Navigate to='/' replace />;

  const getSort = (tab: string) => sortConfig[tab] ?? null;
  const toggleSort = (tab: string, key: string) => {
    setSortConfig(prev => {
      const cur = prev[tab];
      let next: { key: string; dir: 'asc' | 'desc' } | null;
      if (!cur || cur.key !== key) next = { key, dir: 'asc' };
      else if (cur.dir === 'asc') next = { key, dir: 'desc' };
      else next = null;
      return { ...prev, [tab]: next };
    });
  };

  const SortHeader = ({
    tab,
    sortKey,
    children,
    className,
  }: {
    tab: string;
    sortKey: string;
    children: React.ReactNode;
    className?: string;
  }) => {
    const cur = getSort(tab);
    const active = cur?.key === sortKey;
    const Icon = !active
      ? ArrowUpDown
      : cur!.dir === 'asc'
        ? ArrowUp
        : ArrowDown;
    return (
      <TableHead className={className}>
        <button
          type='button'
          onClick={() => toggleSort(tab, sortKey)}
          className='inline-flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap'
        >
          {children}
          <Icon
            className={`h-3.5 w-3.5 ${active ? 'text-foreground' : 'text-muted-foreground/60'}`}
          />
        </button>
      </TableHead>
    );
  };

  const sortList = <T,>(
    list: T[],
    tab: string,
    accessors: Record<string, (item: T) => any>,
  ): T[] => {
    const cur = getSort(tab);
    if (!cur || !accessors[cur.key]) return list;
    const acc = accessors[cur.key];
    const dir = cur.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number')
        return (av - bv) * dir;
      return (
        String(av).localeCompare(String(bv), undefined, {
          numeric: true,
          sensitivity: 'base',
        }) * dir
      );
    });
  };

  const creatorEmail = (uid?: string | null) => {
    if (!uid) return '—';
    const p = profiles.find(pr => pr.user_id === uid);
    return p?.email || '—';
  };

  const updatedByLabel = (uid?: string | null) => {
    if (!uid) return '—';
    const p = profiles.find(pr => pr.user_id === uid);
    return p?.display_name || p?.email || uid.slice(0, 8);
  };

  const handleCreateUser = async () => {
    if (!newUser.displayName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!newUser.email || !newUser.password) {
      toast.error('Email and password are required');
      return;
    }
    setCreatingUser(true);
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: {
        action: 'create_user',
        email: newUser.email,
        password: newUser.password,
        displayName: newUser.displayName,
        role: createUserRole,
      },
    });
    setCreatingUser(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || 'Action failed');
    } else {
      toast.success(`${createUserRole} account created`);
      setCreateUserOpen(false);
      fetchAll();
    }
  };

  const deleteUser = (profile: UserProfile) => {
    setConfirmAction({
      title: 'Delete user account?',
      description: `Permanent action. This cannot be undone.`,
      onConfirm: async () => {
        const { data, error } = await supabase.functions.invoke(
          'admin-actions',
          {
            body: { action: 'delete_user', userId: profile.user_id },
          },
        );
        if (error || (data as any)?.error) toast.error('Failed to delete');
        else {
          toast.success('User deleted');
          setProfiles(prev => prev.filter(p => p.user_id !== profile.user_id));
        }
      },
    });
  };

  const toggleFeatured = (realtor: Realtor) => {
    const turningOn = !realtor.is_featured;
    setConfirmAction({
      title: `${turningOn ? 'Feature' : 'Unfeature'} Realtor`,
      description: `Are you sure?`,
      onConfirm: async () => {
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const expStr = format(addMonths(now, 1), 'yyyy-MM-dd');
        const updates: any = turningOn
          ? {
              is_featured: true,
              featured_start_date: today,
              featured_expiration_date: expStr,
            }
          : { is_featured: false };
        const { error } = await supabase
          .from('realtors')
          .update(updates)
          .eq('id', realtor.id);
        if (error) toast.error('Failed to update');
        else {
          setRealtors(prev =>
            prev.map(r => (r.id === realtor.id ? { ...r, ...updates } : r)),
          );
          toast.success('Updated');
        }
      },
    });
  };

  const unifiedRealtors = (() => {
    const q = search.toLowerCase();
    const realtorRoleProfiles = profiles.filter(
      p => roles.find(r => r.user_id === p.user_id)?.role === 'realtor',
    );
    const linkedUserIds = new Set(realtors.map(r => r.user_id).filter(Boolean));
    const orphanProfiles = realtorRoleProfiles
      .filter(p => !linkedUserIds.has(p.user_id))
      .map(p => ({
        id: `profile-${p.id}`,
        isProfileOnly: true as const,
        profile: p,
        name: p.display_name || p.email || 'Unnamed',
        email: p.email,
        phone: p.phone,
        photo_url: p.avatar_url,
        city: parseLocation(p.location).city,
        district: parseLocation(p.location).district,
        payment_status: '—',
        start_date: null,
        expiration_date: null,
        is_featured: false,
        user_id: p.user_id,
        updated_by: p.updated_by,
        created_at: p.created_at,
      }));
    const realtorRows = realtors.map(r => ({
      ...r,
      isProfileOnly: false as const,
      profile: profiles.find(p => p.user_id === r.user_id) || null,
    }));
    const all = [...realtorRows, ...orphanProfiles];
    return all.filter((r: any) => {
      const matchSearch =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q);
      if (!matchSearch) return false;
      const isActive =
        r.profile?.is_active &&
        (!r.expiration_date ||
          new Date(r.expiration_date) >= new Date(new Date().toDateString()));
      return showInactive ? !isActive : isActive;
    });
  })();

  const filteredRealtors = sortList(unifiedRealtors as any[], 'realtors', {
    name: r => r.name?.toLowerCase(),
    email: r => r.email?.toLowerCase(),
    expiration_date: r => r.expiration_date,
    status: r => (r.profile?.is_active ? 1 : 0),
  });

  const renderAccountsTable = (
    target: 'admin' | 'realtor' | 'user',
    title: string,
  ) => {
    const list = profiles.filter(p => {
      const ur = roles.find(r => r.user_id === p.user_id);
      const matchRole =
        target === 'user' ? !ur || ur.role === 'user' : ur?.role === target;
      if (!matchRole) return false;
      const matchActive = showInactive ? !p.is_active : p.is_active;
      if (!matchActive) return false;
      return (
        !search ||
        p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase())
      );
    });

    const sorted = sortList(list, target, {
      name: p => p.display_name?.toLowerCase(),
      email: p => p.email?.toLowerCase(),
      created_at: p => new Date(p.created_at).getTime(),
    });

    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-4 flex-wrap'>
          <div className='relative flex-1 max-w-sm'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={`Search ${title}...`}
              className='pl-10'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className='flex items-center gap-2 ml-auto'>
            <Label>Show Inactive</Label>
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          </div>
          <Button
            onClick={() => {
              setCreateUserRole(target);
              setCreateUserOpen(true);
            }}
            className='gap-2'
          >
            <Plus className='h-4 w-4' /> Create Account
          </Button>
        </div>
        <div className='rounded-lg border border-border overflow-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader tab={target} sortKey='name'>
                  Name
                </SortHeader>
                <TableHead>Email</TableHead>
                <SortHeader tab={target} sortKey='created_at'>
                  Created
                </SortHeader>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(p => (
                <TableRow
                  key={p.id}
                  className='cursor-pointer hover:bg-muted/40'
                  onClick={() => navigate(`/admin/user/${p.user_id}`)}
                >
                  <TableCell>{p.display_name || 'Unnamed'}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell className='text-xs'>
                    {formatLocalDate(p.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className='text-right'
                    onClick={e => e.stopPropagation()}
                  >
                    <Button
                      variant='ghost'
                      size='icon'
                      className='text-destructive'
                      title='Delete'
                      onClick={() => deleteUser(p)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className='min-h-screen flex flex-col bg-background'>
      <Header />
      <main className='flex-1 container py-8'>
        <div className='flex items-center gap-3 mb-6'>
          <Shield className='h-7 w-7 text-accent' />
          <h1 className='font-display text-3xl font-bold text-foreground'>
            Admin Dashboard
          </h1>
        </div>

        <Tabs
          value={initialTab}
          className='space-y-6'
          onValueChange={v => {
            setSearch('');
            setShowInactive(false);
            setSearchParams({ tab: v });
          }}
        >
          <TabsList>
            <TabsTrigger value='admins'>Admins</TabsTrigger>
            <TabsTrigger value='realtors'>Realtors</TabsTrigger>
            <TabsTrigger value='non-realtors'>Non-Realtors</TabsTrigger>
            <TabsTrigger value='properties'>Properties</TabsTrigger>
            <TabsTrigger value='features'>Features</TabsTrigger>
          </TabsList>

          <TabsContent value='admins'>
            {renderAccountsTable('admin', 'Admins')}
          </TabsContent>

          <TabsContent value='realtors' className='space-y-4'>
            <div className='flex items-center gap-4 flex-wrap'>
              <div className='relative flex-1 max-w-sm'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search realtors...'
                  className='pl-10'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className='flex items-center gap-2 ml-auto'>
                <Label>Show Inactive</Label>
                <Switch
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
              </div>
              <Button
                onClick={() => {
                  setSelectedRealtor(null);
                  setRealtorDialogMode('create');
                  setRealtorDialogOpen(true);
                }}
                className='gap-2'
              >
                <Plus className='h-4 w-4' /> Create Realtor
              </Button>
            </div>
            <div className='rounded-lg border border-border overflow-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader tab='realtors' sortKey='name'>
                      Name
                    </SortHeader>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <SortHeader tab='realtors' sortKey='expiration_date'>
                      Dates
                    </SortHeader>
                    <TableHead>Status</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRealtors.map(r => (
                    <TableRow
                      key={r.id}
                      className='cursor-pointer hover:bg-muted/40'
                      onClick={() =>
                        navigate(
                          r.isProfileOnly
                            ? `/admin/user/${r.user_id}`
                            : `/admin/realtor/${r.id}`,
                        )
                      }
                    >
                      <TableCell>
                        <div className='flex items-center gap-3'>
                          <div className='h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-bold text-muted-foreground'>
                            {r.photo_url || r.profile?.avatar_url ? (
                              <img
                                src={r.photo_url || r.profile?.avatar_url}
                                className='h-full w-full object-cover'
                              />
                            ) : (
                              r.name[0]
                            )}
                          </div>
                          {r.name}
                        </div>
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {r.email}
                      </TableCell>
                      <TableCell className='text-xs'>
                        {r.city}
                        {r.district ? `, ${r.district}` : ''}
                      </TableCell>
                      <TableCell className='text-xs'>
                        <p>{formatLocalDate(r.start_date)}</p>
                        <p className='text-muted-foreground'>
                          {formatLocalDate(r.expiration_date)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.profile?.is_active &&
                            (!r.expiration_date ||
                              new Date(r.expiration_date) >=
                                new Date(new Date().toDateString()))
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {r.profile?.is_active &&
                          (!r.expiration_date ||
                            new Date(r.expiration_date) >=
                              new Date(new Date().toDateString()))
                            ? 'Active'
                            : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={r.is_featured}
                          onCheckedChange={() => toggleFeatured(r as Realtor)}
                        />
                      </TableCell>
                      <TableCell
                        className='text-right'
                        onClick={e => e.stopPropagation()}
                      >
                        {!r.isProfileOnly && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='text-destructive'
                            onClick={() => {
                              setConfirmAction({
                                title: 'Delete realtor?',
                                description:
                                  'Directory listing will be removed.',
                                onConfirm: async () => {
                                  const { error } = await supabase
                                    .from('realtors')
                                    .delete()
                                    .eq('id', r.id);
                                  if (!error) fetchAll();
                                },
                              });
                            }}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value='non-realtors'>
            {renderAccountsTable('user', 'Non-Realtors')}
          </TabsContent>

          <TabsContent value='properties' className='space-y-4'>
            {(() => {
              const q = search.trim().toLowerCase().replace(/^#/, '');
              const filteredProperties = properties.filter(p => {
                const creator = creatorEmail(p.user_id).toLowerCase();
                const match =
                  !q ||
                  p.title.toLowerCase().includes(q) ||
                  String(p.property_code).includes(q) ||
                  creator.includes(q);
                if (!match) return false;
                const isActive =
                  p.status === 'active' &&
                  (!p.expiration_date ||
                    new Date(p.expiration_date) >=
                      new Date(new Date().toDateString()));
                return showInactive ? !isActive : isActive;
              });

              const sortedProps = sortList(filteredProperties, 'properties', {
                title: p => p.title.toLowerCase(),
                price: p => p.price,
                id: p => p.property_code,
              });

              return (
                <div className='space-y-4'>
                  <div className='flex items-center gap-4 flex-wrap'>
                    <div className='relative flex-1 max-w-sm'>
                      <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                      <Input
                        placeholder='Search ID, title, or email...'
                        className='pl-10'
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                    <div className='flex items-center gap-2 ml-auto'>
                      <Label>Show Inactive</Label>
                      <Switch
                        checked={showInactive}
                        onCheckedChange={setShowInactive}
                      />
                    </div>
                  </div>
                  <div className='rounded-lg border border-border overflow-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortHeader tab='properties' sortKey='id'>
                            ID
                          </SortHeader>
                          <SortHeader tab='properties' sortKey='title'>
                            Title
                          </SortHeader>
                          <TableHead>City</TableHead>
                          <SortHeader tab='properties' sortKey='price'>
                            Price
                          </SortHeader>
                          <TableHead>Status</TableHead>
                          <TableHead>Created By</TableHead>
                          <TableHead className='text-right'>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedProps.map(p => (
                          <TableRow
                            key={p.id}
                            className='cursor-pointer hover:bg-muted/40'
                            onClick={() => navigate(`/admin/property/${p.id}`)}
                          >
                            <TableCell className='font-mono text-xs text-muted-foreground'>
                              #{p.property_code}
                            </TableCell>
                            <TableCell className='font-medium'>
                              {p.title}
                            </TableCell>
                            <TableCell>{p.city}</TableCell>
                            <TableCell>
                              Rs. {p.price.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  p.status === 'active'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell className='text-xs text-muted-foreground'>
                              {creatorEmail(p.user_id)}
                            </TableCell>
                            <TableCell
                              className='text-right'
                              onClick={e => e.stopPropagation()}
                            >
                              <Button
                                variant='ghost'
                                size='icon'
                                className='text-destructive'
                                onClick={() => {
                                  confirm({
                                    title: 'Delete property?',
                                    description: `Permanent action. The listing will be removed.`,
                                    onConfirm: async () => {
                                      const { error } = await supabase
                                        .from('user_properties')
                                        .delete()
                                        .eq('id', p.id);
                                      if (error)
                                        toast.error(
                                          'Failed to delete property',
                                        );
                                      else {
                                        toast.success('Property deleted');
                                        setProperties(prev =>
                                          prev.filter(prop => prop.id !== p.id),
                                        );
                                      }
                                    },
                                  });
                                }}
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value='features'>
            <FeaturesTab />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />

      <RealtorFormDialog
        open={realtorDialogOpen}
        onOpenChange={setRealtorDialogOpen}
        realtor={selectedRealtor}
        onSave={d => {
          handleSaveRealtor(d);
          fetchAll();
        }}
        mode={realtorDialogMode}
      />

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={o => !o && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmAction?.onConfirm) await confirmAction.onConfirm();
                setConfirmAction(null);
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

export default AdminDashboard;
