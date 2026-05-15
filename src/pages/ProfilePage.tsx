import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Camera,
  CreditCard,
  Loader2,
  User as UserIcon,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  NEPAL_DISTRICTS,
  NEPAL_CITIES,
  getDistrictForCity,
} from '@/data/nepalLocations';
import SearchableCombobox from '@/components/SearchableCombobox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ConfirmSaveButton from '@/components/ConfirmSaveButton';
import { format } from 'date-fns';

import SimulatedPaymentForm from '@/components/SimulatedPaymentForm';
import { useFeatureFlag, FEATURE_KEYS } from '@/hooks/useFeatureFlag';
import { logPayment } from '@/lib/paymentHistory';
import { Badge } from '@/components/ui/badge';
import {
  isFeaturedActive,
  addOneMonthISO,
  todayISO,
  markFeaturedExpiredIfNeeded,
} from '@/lib/featuredStatus';

const parseLocation = (
  loc: string | null | undefined,
): { city: string; district: string } => {
  if (!loc) return { city: '', district: '' };
  const [city, district] = loc.split(',').map(s => s.trim());
  return { city: city || '', district: district || '' };
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

const formatLocalDate = (dateStr: string | null | undefined) => {
  const d = safeParseDate(dateStr);
  if (!d) return '—';
  return format(d, 'MMM d, yyyy');
};

interface ProfileData {
  id?: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  location: string | null;
  street_address: string | null;
  avatar_url: string | null;
  contact_details: string | null;
  bio: string | null;
  created_at?: string | null;
}

interface RealtorRow {
  id: string;
  name: string;
  is_featured: boolean;
  featured_start_date: string | null;
  featured_expiration_date: string | null;
  featured_payment_status: string | null;
  start_date: string | null;
  expiration_date: string | null;
}

const ProfilePage = () => {
  const { user, role } = useAuth();
  const {
    fee: FEATURED_FEE,
    isFree: featuredFree,
    promoLabel: featuredPromoLabel,
  } = useFeatureFlag(FEATURE_KEYS.FEATURED_REALTOR);
  const [realtor, setRealtor] = useState<RealtorRow | null>(null);
  const [activating, setActivating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>(
    {},
  );

  const [profile, setProfileState] = useState<ProfileData>({
    display_name: '',
    email: '',
    phone: '',
    job_title: '',
    location: '',
    street_address: '',
    avatar_url: '',
    contact_details: '',
    bio: '',
    created_at: null,
  });

  const setProfile = (
    next: ProfileData | ((p: ProfileData) => ProfileData),
  ) => {
    setDirty(true);
    setProfileState(next as any);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        toast.error('Failed to load profile');
      } else if (data) {
        setProfileState({
          id: data.id,
          display_name: data.display_name ?? '',
          email: data.email ?? user.email ?? '',
          phone: data.phone ?? '',
          job_title: data.job_title ?? '',
          location: data.location ?? '',
          street_address: (data as any).street_address ?? '',
          avatar_url: data.avatar_url ?? '',
          contact_details: (data as any).contact_details ?? '',
          bio: (data as any).bio ?? '',
          created_at: data.created_at ?? null,
        });
      } else {
        setProfileState(p => ({ ...p, email: user.email ?? '' }));
      }
      setDirty(false);
      setLoading(false);
    })();
  }, [user]);

  const fetchRealtor = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('realtors')
      .select(
        'id, name, is_featured, featured_start_date, featured_expiration_date, featured_payment_status, start_date, expiration_date',
      )
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const expired = await markFeaturedExpiredIfNeeded(data.id, data);
      if (expired) {
        setRealtor({
          ...data,
          is_featured: false,
          featured_payment_status: 'expired',
        });
      } else {
        setRealtor(data);
      }
    } else {
      setRealtor(null);
    }
  };

  useEffect(() => {
    if (role === 'realtor') fetchRealtor();
  }, [role, user]);

  const handleBecomeFeatured = async () => {
    if (!user) return;
    setActivating(true);

    const start = todayISO();
    const expiration = addOneMonthISO(start);
    const status = featuredFree ? 'promotion' : 'paid';

    let current = realtor;

    if (!current) {
      const loc = parseLocation(profile.location);
      const { data, error } = await supabase
        .from('realtors')
        .insert({
          user_id: user.id,
          name: profile.display_name || user.email || 'Realtor',
          email: profile.email || user.email,
          phone: profile.phone,
          street_address: profile.street_address,
          city: loc.city,
          district: loc.district,
          state: 'Nepal',
          payment_status: 'paid',
          is_featured: true,
          featured_start_date: start,
          featured_expiration_date: expiration,
          featured_payment_status: status,
          start_date: start,
          expiration_date: expiration,
        })
        .select(
          'id, name, is_featured, featured_start_date, featured_expiration_date, featured_payment_status, start_date, expiration_date',
        )
        .single();
      if (error || !data) {
        toast.error('Failed to create realtor profile');
        setActivating(false);
        return;
      }
      current = data;
      setRealtor(data);
    } else {
      const { error } = await supabase
        .from('realtors')
        .update({
          is_featured: true,
          featured_start_date: start,
          featured_expiration_date: expiration,
          featured_payment_status: status,
        })
        .eq('id', current.id);
      if (error) {
        toast.error('Failed to mark as featured');
        setActivating(false);
        return;
      }
      setRealtor({
        ...current,
        is_featured: true,
        featured_start_date: start,
        featured_expiration_date: expiration,
        featured_payment_status: status,
      });
    }

    await logPayment({
      user_id: user.id,
      service_key: FEATURE_KEYS.FEATURED_REALTOR,
      service_label: 'Featured Realtor',
      related_type: 'realtor',
      related_id: current.id,
      related_label: current.name,
      amount: featuredFree ? 0 : FEATURED_FEE,
      status: featuredFree ? 'promotion' : 'paid',
      promo_label: featuredFree ? featuredPromoLabel : null,
      expiration_date: new Date(expiration + 'T00:00:00').toISOString(),
    });

    toast.success("You're now featured! ⭐", {
      description: featuredFree
        ? 'Free promotion applied — your profile is boosted in the directory.'
        : `Payment of Rs. ${FEATURED_FEE.toLocaleString()} received.`,
    });
    setActivating(false);
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('realtor-photos')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage
        .from('realtor-photos')
        .getPublicUrl(path);
      setProfile(p => ({ ...p, avatar_url: data.publicUrl }));
      toast.success('Image uploaded');
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const errs: Record<string, string> = {};
    if (!profile.display_name || !profile.display_name.trim())
      errs.display_name = 'Display name is required';
    if (Object.keys(errs).length) {
      setProfileErrors(errs);
      return;
    }
    setProfileErrors({});
    setSaving(true);

    const payload = {
      user_id: user.id,
      display_name: profile.display_name,
      phone: profile.phone,
      job_title: profile.job_title,
      location: profile.location,
      street_address: profile.street_address,
      avatar_url: profile.avatar_url,
      email: profile.email,
      contact_details: profile.contact_details,
      bio: profile.bio,
    };

    const { error } = profile.id
      ? await supabase.from('profiles').update(payload).eq('id', profile.id)
      : await supabase.from('profiles').insert(payload);

    if (!error && role === 'realtor' && realtor?.id) {
      const loc = parseLocation(profile.location);
      await supabase
        .from('realtors')
        .update({
          photo_url: profile.avatar_url,
          bio: profile.bio,
          name: profile.display_name || user.email || 'Realtor',
          phone: profile.phone,
          city: loc.city,
          district: loc.district,
          street_address: profile.street_address,
        })
        .eq('id', realtor.id);
    }

    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setDirty(false);
      toast.success('Profile updated');
    }
  };

  if (!user) {
    return (
      <div className='min-h-screen flex flex-col'>
        <Header />
        <main className='flex-1 container py-12'>
          <p className='text-muted-foreground'>
            Please sign in to view your profile.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const loc = parseLocation(profile.location);

  return (
    <div className='min-h-screen flex flex-col bg-background'>
      <Header />
      <main className='flex-1 container py-8 max-w-3xl'>
        <h1 className='text-3xl font-display font-bold mb-6'>My Profile</h1>
        <Tabs defaultValue='info' className='space-y-6'>
          <TabsList>
            <TabsTrigger value='info' className='gap-2'>
              <UserIcon className='h-4 w-4' /> Personal Info
            </TabsTrigger>
            {role === 'realtor' && (
              <TabsTrigger value='promote' className='gap-2'>
                <CreditCard className='h-4 w-4' /> Promote Your Profile
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value='info'>
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className='space-y-5'>
                {loading ? (
                  <div className='flex justify-center py-10'>
                    <Loader2 className='animate-spin' />
                  </div>
                ) : (
                  <>
                    <div className='flex items-center gap-4'>
                      <Avatar className='h-20 w-20'>
                        <AvatarImage src={profile.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {profile.display_name?.[0] ?? user.email?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <input
                          ref={fileInputRef}
                          type='file'
                          accept='image/*'
                          className='hidden'
                          onChange={e =>
                            e.target.files?.[0] &&
                            handleUpload(e.target.files[0])
                          }
                        />
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <Loader2 className='h-4 w-4 animate-spin mr-2' />
                          ) : (
                            <Camera className='h-4 w-4 mr-2' />
                          )}
                          Upload Photo
                        </Button>
                      </div>
                    </div>

                    <div className='grid gap-4 sm:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label>Display Name *</Label>
                        <Input
                          value={profile.display_name ?? ''}
                          onChange={e => {
                            setProfile({
                              ...profile,
                              display_name: e.target.value,
                            });
                            if (profileErrors.display_name)
                              setProfileErrors(({ display_name, ...r }) => r);
                          }}
                          maxLength={100}
                        />
                        {profileErrors.display_name && (
                          <p className='text-xs text-destructive'>
                            {profileErrors.display_name}
                          </p>
                        )}
                      </div>
                      <div className='space-y-2'>
                        <Label>Email</Label>
                        <Input value={profile.email ?? ''} disabled />
                      </div>
                      <div className='space-y-2'>
                        <Label>Phone</Label>
                        <Input
                          value={profile.phone ?? ''}
                          onChange={e =>
                            setProfile({ ...profile, phone: e.target.value })
                          }
                          maxLength={30}
                        />
                      </div>
                      <div className='space-y-2'>
                        <Label>Job Title</Label>
                        <Input
                          value={profile.job_title ?? ''}
                          onChange={e =>
                            setProfile({
                              ...profile,
                              job_title: e.target.value,
                            })
                          }
                          maxLength={100}
                        />
                      </div>
                      <div className='col-span-2'>
                        <Label>Street Address</Label>
                        <Input
                          value={profile.street_address ?? ''}
                          onChange={e =>
                            setProfile({
                              ...profile,
                              street_address: e.target.value,
                            })
                          }
                          placeholder='e.g. Thamel, Ward No. 26'
                        />
                      </div>
                      <div className='space-y-2'>
                        <Label>City</Label>
                        <SearchableCombobox
                          value={loc.city}
                          onValueChange={city => {
                            const district =
                              getDistrictForCity(city) || loc.district;
                            setProfile({
                              ...profile,
                              location: joinLocation(city, district),
                            });
                          }}
                          options={NEPAL_CITIES}
                          placeholder='Select City'
                          searchPlaceholder='Search cities...'
                        />
                      </div>
                      <div className='space-y-2'>
                        <Label>District</Label>
                        <SearchableCombobox
                          value={loc.district}
                          onValueChange={district => {
                            const cityDist = getDistrictForCity(loc.city);
                            const nextCity =
                              cityDist && cityDist !== district ? '' : loc.city;
                            setProfile({
                              ...profile,
                              location: joinLocation(nextCity, district),
                            });
                          }}
                          options={NEPAL_DISTRICTS}
                          placeholder='Select District'
                          searchPlaceholder='Search districts...'
                        />
                      </div>
                    </div>

                    <div className='grid gap-4 sm:grid-cols-2 p-4 bg-muted/30 rounded-lg border border-border'>
                      <div className='space-y-1'>
                        <Label className='text-muted-foreground'>
                          Profile Created
                        </Label>
                        <p className='text-sm font-medium'>
                          {profile.created_at
                            ? format(
                                new Date(profile.created_at),
                                'MMM d, yyyy',
                              )
                            : '—'}
                        </p>
                      </div>
                      {role === 'realtor' && realtor && (
                        <>
                          <div className='space-y-1'>
                            <Label className='text-muted-foreground'>
                              Subscription Start
                            </Label>
                            <p className='text-sm font-medium'>
                              {formatLocalDate(realtor.start_date)}
                            </p>
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-muted-foreground'>
                              Subscription End
                            </Label>
                            <p className='text-sm font-medium'>
                              {formatLocalDate(realtor.expiration_date)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label>Additional Info</Label>
                      <Textarea
                        rows={6}
                        maxLength={600}
                        placeholder='Phone, WhatsApp, office address, etc.'
                        value={profile.contact_details ?? ''}
                        onChange={e => {
                          const lines = e.target.value.split('\n');
                          const trimmed =
                            lines.length > 6
                              ? lines.slice(0, 6).join('\n')
                              : e.target.value;
                          setProfile({ ...profile, contact_details: trimmed });
                        }}
                        className='resize-none'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label>About Me</Label>
                      <Textarea
                        rows={5}
                        maxLength={1000}
                        placeholder='Tell others a bit about yourself...'
                        value={profile.bio ?? ''}
                        onChange={e =>
                          setProfile({ ...profile, bio: e.target.value })
                        }
                      />
                    </div>

                    <ConfirmSaveButton
                      onConfirm={handleSave}
                      disabled={saving || !dirty}
                    >
                      {saving && (
                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                      )}
                      Save Changes
                    </ConfirmSaveButton>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* THE MISSING FEATURED TAB RESTORED */}
          {role === 'realtor' && (
            <TabsContent value='promote'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <CreditCard className='h-5 w-5 text-primary' />
                    Promote Your Profile
                  </CardTitle>
                  <CardDescription>
                    Stand out in the Realtor Directory by becoming a Featured
                    Agent.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  {realtor &&
                    (() => {
                      const featuredActive = isFeaturedActive(realtor);
                      const expiration = realtor.featured_expiration_date;
                      return (
                        <>
                          <div className='flex items-center justify-between rounded-md border p-4 bg-muted/30'>
                            <div className='space-y-1'>
                              <p className='text-sm font-medium'>
                                {realtor.name}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {featuredActive
                                  ? `Boosted in the directory · active until ${formatLocalDate(expiration)}`
                                  : 'Standard listing · not boosted'}
                              </p>
                            </div>
                            <Badge
                              variant={featuredActive ? 'default' : 'secondary'}
                              className={
                                featuredActive
                                  ? 'bg-badge-new text-badge-new-foreground'
                                  : ''
                              }
                            >
                              {featuredActive ? 'Featured ⭐' : 'Not Featured'}
                            </Badge>
                          </div>

                          {!featuredActive && (
                            <div className='space-y-4'>
                              <div className='rounded-lg border border-accent/40 bg-accent/5 p-4 text-sm'>
                                <h4 className='font-semibold text-accent mb-2 flex items-center gap-2'>
                                  <Star className='h-4 w-4 fill-accent' /> Why
                                  become featured?
                                </h4>
                                <ul className='list-disc list-inside space-y-1 text-muted-foreground'>
                                  <li>
                                    Appear at the top of the Realtor Directory
                                  </li>
                                  <li>
                                    Highlighted profile card to attract more
                                    buyers
                                  </li>
                                  <li>Build trust and authority instantly</li>
                                </ul>
                              </div>

                              <SimulatedPaymentForm
                                paid={false}
                                onPaymentComplete={handleBecomeFeatured}
                                amount={featuredFree ? 0 : FEATURED_FEE}
                                label='Featured Realtor Status (1 Month)'
                                buttonText={
                                  featuredFree
                                    ? 'Activate Free Promotion'
                                    : undefined
                                }
                                isProcessing={activating}
                              />
                              {featuredFree && (
                                <p className='text-xs text-center text-muted-foreground'>
                                  🎉{' '}
                                  {featuredPromoLabel ||
                                    'Special promotion: Featured status is free!'}
                                </p>
                              )}
                            </div>
                          )}

                          {featuredActive && (
                            <div className='rounded-lg border p-6 text-center space-y-3'>
                              <Star className='h-10 w-10 text-yellow-500 fill-yellow-500 mx-auto' />
                              <h3 className='font-semibold text-lg'>
                                You are currently featured!
                              </h3>
                              <p className='text-muted-foreground text-sm max-w-sm mx-auto'>
                                Your profile is being actively promoted to
                                buyers across the platform. You can renew this
                                status once it expires.
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
