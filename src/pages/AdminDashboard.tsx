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
  ChevronDown,
  ChevronRight,
  Trash2,
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
import SearchableCombobox from '@/components/SearchableCombobox';

const parseLocation = (
  loc: string | null | undefined,
): { city: string; district: string } => {
  if (!loc) return { city: '', district: '' };
  const [city = '', district = ''] = loc.split(',').map(s => s.trim());
  return { city, district };
};

const joinLocation = (city: string, district: string) =>
  [city, district].filter(Boolean).join(', ');

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
  const [showInactive, setShowInactive] = useState(false);

  const [editingProfile, setEditingProfileState] = useState<UserProfile | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [realtorDialogOpen, setRealtorDialogOpen] = useState(false);
  const [realtorDialogMode, setRealtorDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedRealtor, setSelectedRealtor] = useState<RealtorFormData | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [selectedRealtorIds, setSelectedRealtorIds] = useState<Set<string>>(new Set());
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());

  const [sortConfig, setSortConfig] = useState<Record<string, { key: string; dir: 'asc' | 'desc' } | null>>({});

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserRole, setCreateUserRole] = useState<'admin' | 'realtor' | 'user'>('user');
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    displayName: '',
    phone: '',
    jobTitle: '',
    streetAddress: '',
    location: '',
    avatarUrl: '',
  });
  const [uploadingNewUserAvatar, setUploadingNewUserAvatar] = useState(false);
  const newUserAvatarInputRef = useRef<HTMLInputElement>(null);

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

  const updatedByLabel = (uid?: string | null) => {
    if (!uid) return '—';
    const p = profiles.find(pr => pr.user_id === uid);
    return p?.display_name || p?.email || uid.slice(0, 8);
  };

  const creatorEmail = (uid?: string | null) => {
    if (!uid) return '—';
    const p = profiles.find(pr => pr.user_id === uid);
    return p?.email || '—';
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

  const fetchAll = async () => {
    const [r, p, ro, pr] = await Promise.all([
      supabase.from('realtors').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('user_properties').select('id, property_code, title, city, district, state, price, status, listing_type, user_id, updated_by, expiration_date, created_at, deleted_at'),
    ]);
    setRealtors(r.data ?? []);
    setProfiles((p.data ?? []) as UserProfile[]);
    setRoles(ro.data ?? []);
    setProperties(pr.data ?? []);
  };

  useEffect(() => {
    if (role === 'admin') fetchAll();
  }, [role]);

  if (loading || (user && !role)) {
    return (
      <div className='min-h-screen flex flex-col'>
        <Header />
        <main className='flex-1 flex items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <Loader2 className='h-10 w-10 animate-spin text-accent' />
            <p className='text-muted-foreground animate-pulse'>Verifying access...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return <Navigate to='/' replace />;
  }

  const setEditingProfile = (next: UserProfile | null) => {
    setEditingProfileState(prev => {
      if (next === null || prev === null) setProfileDirty(false);
      else setProfileDirty(true);
      return next;
    });
  };

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

  const handleCreateUser = async () => {
    if (!newUser.displayName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!newUser.email || !newUser.password) {
      toast.error('Email and password are required');
      return;
    }
    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setCreatingUser(true);
    const ok = await callAdminAction({
      action: 'create_user',
      email: newUser.email,
      password: newUser.password,
      displayName: newUser.displayName,
      phone: newUser.phone,
      jobTitle: newUser.jobTitle,
      streetAddress: newUser.streetAddress,
      location: newUser.location,
      avatarUrl: newUser.avatarUrl,
      role: createUserRole,
    });
    setCreatingUser(false);
    if (ok) {
      toast.success(`${createUserRole} account created`);
      setCreateUserOpen(false);
      setNewUser({
        email: '',
        password: '',
        displayName: '',
        phone: '',
        jobTitle: '',
        streetAddress: '',
        location: '',
        avatarUrl: '',
      });
      fetchAll();
    }
  };



  const bulkDeleteProperties = () => {
    if (selectedPropertyIds.size === 0) return;
    setConfirmAction({
      title: 'Delete selected properties?',
      description: `This will permanently delete ${selectedPropertyIds.size} propert${selectedPropertyIds.size === 1 ? 'y' : 'ies'}. This action cannot be undone.`,
      onConfirm: async () => {
        const ids = Array.from(selectedPropertyIds);
        const { error } = await supabase.from('user_properties').delete().in('id', ids);
        if (error) toast.error('Failed to delete properties');
        else {
          toast.success(`${ids.length} property(ies) deleted`);
          setProperties(prev => prev.filter(p => !ids.includes(p.id)));
          setSelectedPropertyIds(new Set());
        }
      },
    });
  };

  const handleOpenCreate = () => {
    setSelectedRealtor(null);
    setRealtorDialogMode('create');
    setRealtorDialogOpen(true);
  };

  const handleSaveRealtor = async (data: RealtorFormData) => {
    const payload = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      photo_url: data.photo_url || null,
      city: data.city,
      state: data.state || data.district,
      district: data.district || data.state,
      street_address: data.street_address || null,
      bio: data.bio || null,
      years_experience: data.years_experience || null,
      is_featured: data.is_featured,
      start_date: data.start_date,
      expiration_date: data.expiration_date,
      payment_status: data.payment_status,
      payment_bypassed: data.payment_bypassed,
      user_id: data.user_id,
      specialties: data.specialties,
      license_number: data.license_number,
      featured_start_date: data.featured_start_date,
      featured_expiration_date: data.featured_expiration_date,
      featured_payment_status: data.featured_payment_status,
      featured_payment_bypassed: data.featured_payment_bypassed,
      updated_by: user?.id,
    };

    if (realtorDialogMode === 'edit' && data.id) {
      const { error } = await supabase.from('realtors').update(payload).eq('id', data.id);
      if (error) {
        toast.error('Failed to save realtor');
        return;
      }
      toast.success('Realtor updated');
      setRealtors(prev => prev.map(r => r.id === data.id ? { ...r, ...payload, id: data.id! } : r));
      setRealtorDialogOpen(false);
    } else {
      const { data: newData, error } = await supabase.from('realtors').insert(payload).select().single();
      if (error) {
        toast.error('Failed to create realtor');
        return;
      }
      toast.success('Realtor created!');
      setRealtors(prev => [...prev, newData as Realtor]);
      setRealtorDialogOpen(false);
    }
  };

  const saveProfile = async () => {
    if (!editingProfile) return;
    if (!editingProfile.display_name?.trim()) {
      toast.error('Name is required');
      return;
    }
    const { id, ...rest } = editingProfile;
    const { error } = await supabase.from('profiles').update(rest).eq('id', id);
    if (error) {
      toast.error('Failed to save profile');
      return;
    }
    toast.success('Profile updated');
    setProfiles(prev => prev.map(p => p.id === id ? editingProfile : p));
    setProfileDirty(false);
    setEditingProfileState(null);
  };

  const getProfilesByRole = (target: 'admin' | 'realtor' | 'user') => {
    return profiles.filter(profile => {
      const userRole = roles.find(r => r.user_id === profile.user_id);
      const matchRole = target === 'user' ? (!userRole || userRole.role === 'user') : userRole?.role === target;
      if (!matchRole) return false;
      const matchActive = showInactive ? !profile.is_active : profile.is_active;
      if (!matchActive) return false;
      if (search) {
        const q = search.toLowerCase();
        return (profile.display_name || '').toLowerCase().includes(q) || (profile.email || '').toLowerCase().includes(q);
      }
      return true;
    });
  };

  const SortHeader = ({ tab, sortKey, children, className }: { tab: string; sortKey: string; children: React.ReactNode; className?: string }) => {
    const cur = getSort(tab);
    const active = cur?.key === sortKey;
    const Icon = !active ? ArrowUpDown : cur!.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <TableHead className={className}>
        <button type='button' onClick={() => toggleSort(tab, sortKey)} className='inline-flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap'>
          {children}
          <Icon className={`h-3.5 w-3.5 ${active ? 'text-foreground' : 'text-muted-foreground/60'}`} />
        </button>
      </TableHead>
    );
  };

  const renderAccountsTable = (target: 'admin' | 'realtor' | 'user', title: string) => {
    const rawList = getProfilesByRole(target);
    const list = sortList(rawList, target, {
      name: p => (p.display_name || '').toLowerCase(),
      email: p => (p.email || '').toLowerCase(),
      phone: p => p.phone || '',
      job_title: p => (p.job_title || '').toLowerCase(),
      location: p => (p.location || '').toLowerCase(),
      status: p => (p.is_active ? 1 : 0),
      updated_by: p => updatedByLabel(p.updated_by).toLowerCase(),
    });

    const isTrash = title.toLowerCase().includes('trash') || title.toLowerCase().includes('deleted');

    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-4 flex-wrap'>
          <div className='relative flex-1 max-w-sm'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input placeholder={`Search ${title.toLowerCase()}...`} className='pl-10' value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {!isTrash && (
            <div className='flex items-center gap-2 ml-auto'>
              <Label htmlFor='show-inactive' className='text-sm text-muted-foreground'>
                {showInactive ? 'Showing inactive' : 'Showing active'}
              </Label>
              <Switch id='show-inactive' checked={showInactive} onCheckedChange={setShowInactive} />
            </div>
          )}
          {target !== 'realtor' && !isTrash && (
            <Button onClick={() => { setCreateUserRole(target); setCreateUserOpen(true); }} className='gap-2'>
              <Plus className='h-4 w-4' /> Create {target === 'user' ? 'Non-Realtor' : 'Admin'}
            </Button>
          )}
        </div>
        <div className='rounded-lg border border-border overflow-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader tab={target} sortKey='name'>Name</SortHeader>
                <SortHeader tab={target} sortKey='email'>Email</SortHeader>
                <SortHeader tab={target} sortKey='phone'>Phone</SortHeader>
                {target === 'admin' && <SortHeader tab={target} sortKey='job_title'>Job Title</SortHeader>}
                <SortHeader tab={target} sortKey='location'>Location</SortHeader>
                <SortHeader tab={target} sortKey='status'>Status</SortHeader>
                {isTrash && <TableHead>Deleted At</TableHead>}
                <SortHeader tab={target} sortKey='updated_by'>Updated By</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(profile => (
                <TableRow key={profile.id} className='cursor-pointer hover:bg-muted/40' onClick={() => navigate(`/admin/user/${profile.user_id}`)}>
                  <TableCell>
                    <div className='flex items-center gap-3'>
                      <div className='h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-muted-foreground'>
                        {profile.avatar_url ? <img src={profile.avatar_url} alt='' className='h-full w-full object-cover' /> : (profile.display_name || profile.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <p className='font-medium'>{profile.display_name || 'Unnamed'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{profile.email || '—'}</TableCell>
                  <TableCell>{profile.phone || '—'}</TableCell>
                  {target === 'admin' && <TableCell>{profile.job_title || '—'}</TableCell>}
                  <TableCell>{profile.location || '—'}</TableCell>
                  <TableCell>
                    {isTrash ? (
                      <Badge variant='destructive'>Deleted</Badge>
                    ) : (
                      <Badge variant={profile.is_active ? 'default' : 'secondary'}>{profile.is_active ? 'Active' : 'Inactive'}</Badge>
                    )}
                  </TableCell>
                  {isTrash && (
                    <TableCell className='text-xs text-muted-foreground'>
                      {formatSafeDate(profile.deleted_at)}
                    </TableCell>
                  )}
                  <TableCell className='text-xs text-muted-foreground'>{updatedByLabel(profile.updated_by)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const unifiedRealtors = (() => {
    const q = search.toLowerCase();
    const realtorRoleProfiles = profiles.filter(p => roles.find(r => r.user_id === p.user_id)?.role === 'realtor');
    const linkedUserIds = new Set(realtors.map(r => r.user_id).filter(Boolean) as string[]);
    const orphanProfiles = realtorRoleProfiles.filter(p => !linkedUserIds.has(p.user_id)).map(p => ({
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
      expiration_date: null,
      is_featured: false,
      updated_by: p.updated_by,
      user_id: p.user_id,
      created_at: p.created_at,
    }));
    const realtorRows = realtors.map(r => ({ ...r, isProfileOnly: false as const, profile: profiles.find(p => p.user_id === r.user_id) || null }));
    const all = [...realtorRows, ...orphanProfiles];
    return all.map((r: any) => {
      const d = safeParseDate(r.expiration_date);
      const isExpired = d && d < new Date(new Date().toDateString());
      
      return {
        ...r,
        isActiveStatus: (r.profile?.is_active ?? true) && !isExpired
      };
    }).filter((r: any) => {
      const matchSearch = !q || (r.name || '').toLowerCase().includes(q) || (r.city || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
      return showInactive ? !r.isActiveStatus : r.isActiveStatus;
    });
  })();

  const filteredRealtors = sortList(unifiedRealtors, 'realtors', {
    name: r => (r.name || '').toLowerCase(),
    email: r => (r.email || '').toLowerCase(),
    location: r => `${r.city || ''} ${r.district || ''}`.toLowerCase(),
    payment: r => r.payment_status || '',
    status: r => (r.isActiveStatus ? 1 : 0),
    updated_by: r => updatedByLabel(r.updated_by).toLowerCase(),
  });

  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <main className='flex-1 container py-8'>
        <div className='flex items-center gap-3 mb-6'>
          <Shield className='h-7 w-7 text-accent' />
          <h1 className='font-display text-3xl font-bold text-foreground'>Admin Dashboard</h1>
        </div>

        <Tabs value={initialTab} className='space-y-6' onValueChange={v => { setSearch(''); setShowInactive(false); setSearchParams({ tab: v }); }}>
          <TabsList>
            <TabsTrigger value='admins' className='gap-2'><Shield className='h-4 w-4' /> Admins</TabsTrigger>
            <TabsTrigger value='realtors' className='gap-2'><MapPin className='h-4 w-4' /> Realtors</TabsTrigger>
            <TabsTrigger value='non-realtors' className='gap-2'><User className='h-4 w-4' /> Non-Realtors</TabsTrigger>
            <TabsTrigger value='properties' className='gap-2'><Home className='h-4 w-4' /> Properties</TabsTrigger>
            <TabsTrigger value='trash' className='gap-2'><Trash2 className='h-4 w-4' /> Trash</TabsTrigger>
            <TabsTrigger value='features' className='gap-2'><Sliders className='h-4 w-4' /> Features</TabsTrigger>
          </TabsList>

          <TabsContent value='admins'>{renderAccountsTable('admin', 'Admins', profiles.filter(p => !p.deleted_at && roles.find(r => r.user_id === p.user_id)?.role === 'admin'))}</TabsContent>

          <TabsContent value='realtors' className='space-y-4'>
            <div className='flex items-center gap-4 flex-wrap'>
              <div className='relative flex-1 max-w-sm'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input placeholder='Search realtors...' className='pl-10' value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className='flex items-center gap-2 ml-auto'>
                <Label htmlFor='show-inactive-realtor' className='text-sm text-muted-foreground'>{showInactive ? 'Showing inactive' : 'Showing active'}</Label>
                <Switch id='show-inactive-realtor' checked={showInactive} onCheckedChange={setShowInactive} />
              </div>
              <Button onClick={handleOpenCreate} className='gap-2'><Plus className='h-4 w-4' /> Create Realtor</Button>
            </div>
            <div className='rounded-lg border border-border overflow-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader tab='realtors' sortKey='name'>Name</SortHeader>
                    <SortHeader tab='realtors' sortKey='email'>Email</SortHeader>
                    <SortHeader tab='realtors' sortKey='location'>Location</SortHeader>
                    <SortHeader tab='realtors' sortKey='payment'>Payment</SortHeader>
                    <SortHeader tab='realtors' sortKey='status'>Status</SortHeader>
                    <SortHeader tab='realtors' sortKey='updated_by'>Updated By</SortHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRealtors.filter(r => !r.profile?.deleted_at).map(realtor => (
                    <TableRow key={realtor.id} className='cursor-pointer hover:bg-muted/40' onClick={() => navigate(realtor.isProfileOnly ? `/admin/user/${realtor.user_id}` : `/admin/realtor/${realtor.id}`)}>
                      <TableCell>
                        <div className='flex items-center gap-3'>
                          <div className='h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-muted-foreground'>
                            {(realtor.photo_url || realtor.profile?.avatar_url) ? <img src={realtor.photo_url || realtor.profile?.avatar_url || ''} alt='' className='h-full w-full object-cover' /> : (realtor.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <p className='font-medium'>{realtor.name || "Unnamed Realtor"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{realtor.email || '—'}</TableCell>
                      <TableCell>{realtor.city}{realtor.district ? `, ${realtor.district}` : ''}</TableCell>
                      <TableCell>{realtor.payment_status === 'paid' ? <Badge>Paid</Badge> : <Badge variant='secondary'>{realtor.payment_status}</Badge>}</TableCell>
                      <TableCell>
                        {realtor.isActiveStatus ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant='destructive'>Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>{updatedByLabel(realtor.updated_by)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value='non-realtors'>{renderAccountsTable('user', 'Non-Realtors', profiles.filter(p => !p.deleted_at && roles.find(r => r.user_id === p.user_id)?.role === 'user'))}</TabsContent>

          <TabsContent value='properties' className='space-y-4'>
            {(() => {
              const q = search.trim().toLowerCase().replace(/^#/, '');
              const baseFiltered = properties.filter(p => !p.deleted_at).filter(p => {
                const d = safeParseDate(p.expiration_date);
                const expired = d && d < new Date(new Date().toDateString());
                const isActive = p.status === 'active' && !expired;
                if (showInactive ? isActive : !isActive) return false;
                if (!q) return true;
                return String(p.property_code ?? '').includes(q) || creatorEmail(p.user_id).toLowerCase().includes(q);
              });
              const list = sortList(baseFiltered, 'properties', {
                title: p => (p.title || '').toLowerCase(),
                price: p => p.price,
                status: p => p.status,
                updated_by: p => updatedByLabel(p.updated_by).toLowerCase(),
              });
              return (
                <>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <div className='relative flex-1 max-w-sm'>
                      <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                      <Input placeholder='Search properties...' className='pl-10' value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {selectedPropertyIds.size > 0 && <Button variant='destructive' onClick={bulkDeleteProperties}>Delete {selectedPropertyIds.size} selected</Button>}
                    <Button onClick={() => navigate('/list-property')} className='gap-2'><Plus className='h-4 w-4' /> Create Property</Button>
                  </div>
                  <div className='rounded-lg border border-border overflow-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property ID</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Updated By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map(prop => (
                          <TableRow key={prop.id} className='cursor-pointer hover:bg-muted/40' onClick={() => navigate(`/admin/property/${prop.id}`)}>
                            <TableCell className='font-mono text-xs text-muted-foreground'>{prop.property_code}</TableCell>
                            <TableCell className='font-medium'>{prop.title}</TableCell>
                            <TableCell>Rs. {(prop.price || 0).toLocaleString()}</TableCell>
                            <TableCell><Badge>{prop.status}</Badge></TableCell>
                            <TableCell className='text-xs text-muted-foreground'>{updatedByLabel(prop.updated_by)}</TableCell>

                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value='trash'>
            <Tabs defaultValue='trash-realtors' className='space-y-4'>
              <TabsList className='bg-muted/50'>
                <TabsTrigger value='trash-admins'>Admins</TabsTrigger>
                <TabsTrigger value='trash-realtors'>Realtors</TabsTrigger>
                <TabsTrigger value='trash-non-realtors'>Non-Realtors</TabsTrigger>
                <TabsTrigger value='trash-properties'>Properties</TabsTrigger>
              </TabsList>
              
              <TabsContent value='trash-admins'>
                {renderAccountsTable('admin', 'Deleted Admins', profiles.filter(p => !!p.deleted_at && roles.find(r => r.user_id === p.user_id)?.role === 'admin'))}
              </TabsContent>
              
              <TabsContent value='trash-realtors'>
                {renderAccountsTable('realtor', 'Deleted Realtors', profiles.filter(p => !!p.deleted_at && roles.find(r => r.user_id === p.user_id)?.role === 'realtor'))}
              </TabsContent>
              
              <TabsContent value='trash-non-realtors'>
                {renderAccountsTable('user', 'Deleted Non-Realtors', profiles.filter(p => !!p.deleted_at && roles.find(r => r.user_id === p.user_id)?.role === 'user'))}
              </TabsContent>
              
              <TabsContent value='trash-properties'>
                <div className='rounded-lg border border-border overflow-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Updated By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties.filter(p => !!p.deleted_at).map(prop => (
                        <TableRow key={prop.id} className='hover:bg-muted/40'>
                          <TableCell className='font-mono text-xs text-muted-foreground'>{prop.property_code}</TableCell>
                          <TableCell className='font-medium'>{prop.title}</TableCell>
                          <TableCell className='text-xs text-muted-foreground'>{formatSafeDate(prop.deleted_at)}</TableCell>
                          <TableCell className='text-xs text-muted-foreground'>{updatedByLabel(prop.updated_by)}</TableCell>
                        </TableRow>
                      ))}
                      {properties.filter(p => !!p.deleted_at).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className='h-24 text-center text-muted-foreground'>
                            No deleted properties found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value='features'><FeaturesTab /></TabsContent>
        </Tabs>
      </main>
      <Footer />

      <RealtorFormDialog open={realtorDialogOpen} onOpenChange={setRealtorDialogOpen} realtor={selectedRealtor} onSave={handleSaveRealtor} mode={realtorDialogMode} />

      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className='max-w-md max-h-[90vh] overflow-y-auto'>
          <DialogHeader><DialogTitle>Create {createUserRole.charAt(0).toUpperCase() + createUserRole.slice(1)} Account</DialogTitle></DialogHeader>
          <div className='space-y-4'>
            <div><Label>Name *</Label><Input value={newUser.displayName} onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} placeholder='Full name' /></div>
            <div><Label>Email *</Label><Input type='email' value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder='user@example.com' /></div>
            <div><Label>Temporary Password *</Label><Input type='text' value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder='Min. 6 characters' /></div>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={() => setCreateUserOpen(false)} disabled={creatingUser}>Cancel</Button>
              <Button onClick={handleCreateUser} disabled={creatingUser} className='gap-2'>
                {creatingUser && <Loader2 className='h-4 w-4 animate-spin' />} Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={open => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle><AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { await confirmAction?.onConfirm(); setConfirmAction(null); }}>Confirm</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
