import { useEffect, useRef, useState } from 'react';
import { format, addMonths } from 'date-fns';
import { CalendarIcon, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  NEPAL_CITIES,
  NEPAL_DISTRICTS,
  getDistrictForCity,
} from '@/data/nepalLocations';
import { CreditCard, ShieldCheck } from 'lucide-react';
import SimulatedPaymentForm from '@/components/SimulatedPaymentForm';
import { useFeatureFlag, FEATURE_KEYS } from '@/hooks/useFeatureFlag';
import PaymentHistoryList from '@/components/PaymentHistoryList';
import ConfirmSaveButton from '@/components/ConfirmSaveButton';
import SearchableCombobox from '@/components/SearchableCombobox';

export interface RealtorFormData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  photo_url: string;
  city: string;
  state: string;
  district: string;
  street_address: string;
  bio: string;
  years_experience: number | null;
  is_featured: boolean;
  start_date: string | null;
  expiration_date: string | null;
  payment_status: string;
  payment_bypassed: boolean;
  user_id: string | null;
  specialties: string[] | null;
  license_number: string | null;
  bypass_reason?: string | null;
  featured_start_date: string | null;
  featured_expiration_date: string | null;
  featured_payment_status: string;
  featured_payment_bypassed: boolean;
  featured_bypass_reason?: string | null;
}

// LOCAL DATE FIX: Forces initialization to local system date
const getLocalTodayStr = () => format(new Date(), 'yyyy-MM-dd');
const addMonthsLocal = (dateStr: string, months: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return format(addMonths(date, months), 'yyyy-MM-dd');
};

const buildEmptyRealtor = (): RealtorFormData => {
  const start = getLocalTodayStr();
  return {
    name: '',
    email: '',
    phone: '',
    photo_url: '',
    city: '',
    state: '',
    district: '',
    street_address: '',
    bio: '',
    years_experience: null,
    is_featured: false,
    start_date: start,
    expiration_date: addMonthsLocal(start, 1),
    payment_status: 'pending',
    payment_bypassed: false,
    user_id: null,
    specialties: null,
    license_number: null,
    bypass_reason: null,
    featured_start_date: null,
    featured_expiration_date: null,
    featured_payment_status: 'none',
    featured_payment_bypassed: false,
    featured_bypass_reason: null,
  };
};

interface RealtorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  realtor?: RealtorFormData | null;
  onSave: (data: RealtorFormData) => void;
  mode: 'create' | 'edit';
}

const RealtorFormDialog = ({
  open,
  onOpenChange,
  realtor,
  onSave,
  mode,
}: RealtorFormDialogProps) => {
  const isCreate = mode === 'create';
  const {
    fee: realtorFee,
    isFree: realtorPromoFree,
    promoLabel: realtorPromoLabel,
  } = useFeatureFlag(
    isCreate ? FEATURE_KEYS.REALTOR_SIGNUP : FEATURE_KEYS.REALTOR_RENEWAL,
  );
  const {
    fee: featuredFee,
    isFree: featuredPromoFree,
    promoLabel: featuredPromoLabel,
  } = useFeatureFlag(FEATURE_KEYS.FEATURED_REALTOR);

  const [form, setFormState] = useState<RealtorFormData>(
    realtor ?? buildEmptyRealtor(),
  );
  const [dirty, setDirty] = useState(false);
  const setForm: typeof setFormState = next => {
    setDirty(true);
    setFormState(next as any);
  };

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [bypassPayment, setBypassPayment] = useState(
    realtor?.payment_bypassed ?? false,
  );
  const [bypassFeatured, setBypassFeatured] = useState(
    realtor?.featured_payment_bypassed ?? false,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (k: string) =>
    setErrors(prev => {
      if (!prev[k]) return prev;
      const { [k]: _, ...rest } = prev;
      return rest;
    });

  useEffect(() => {
    if (open) {
      setFormState(realtor ?? buildEmptyRealtor());
      setBypassPayment(realtor?.payment_bypassed ?? false);
      setBypassFeatured(realtor?.featured_payment_bypassed ?? false);
      setDirty(false);
      setErrors({});
    }
  }, [open, realtor]);

  useEffect(() => {
    if (
      realtorPromoFree &&
      form.payment_status !== 'promotion' &&
      form.payment_status !== 'paid'
    ) {
      const now = getLocalTodayStr();
      setForm(prev => ({
        ...prev,
        payment_status: 'promotion',
        payment_bypassed: true,
        start_date: now,
        expiration_date: addMonthsLocal(now, 1),
      }));
    }
  }, [realtorPromoFree, form.payment_status]);

  const handleCityChange = (city: string) => {
    const district = getDistrictForCity(city);
    setForm(prev => ({
      ...prev,
      city,
      ...(district ? { state: district, district } : {}),
    }));
  };

  const handleDistrictChange = (district: string) => {
    const cityDistrict = getDistrictForCity(form.city);
    setForm(prev => ({
      ...prev,
      state: district,
      district,
      ...(cityDistrict !== district ? { city: '' } : {}),
    }));
  };

  const handleBypassToggle = (checked: boolean) => {
    setBypassPayment(checked);
    const now = getLocalTodayStr();
    setForm(prev => ({
      ...prev,
      payment_bypassed: checked,
      payment_status: checked ? 'bypassed' : 'pending',
      bypass_reason: checked ? (prev.bypass_reason ?? '') : null,
      start_date: checked ? now : prev.start_date,
      expiration_date: checked ? addMonthsLocal(now, 1) : prev.expiration_date,
    }));
  };

  const handleBypassFeaturedToggle = (checked: boolean) => {
    setBypassFeatured(checked);
    const now = getLocalTodayStr();
    setForm(prev => {
      return {
        ...prev,
        featured_payment_bypassed: checked,
        featured_payment_status: checked
          ? 'bypassed'
          : prev.featured_payment_status === 'bypassed'
            ? 'none'
            : prev.featured_payment_status,
        is_featured: checked ? true : prev.is_featured,
        featured_start_date: checked ? now : prev.featured_start_date,
        featured_expiration_date: checked
          ? addMonthsLocal(now, 1)
          : prev.featured_expiration_date,
        featured_bypass_reason: checked
          ? (prev.featured_bypass_reason ?? '')
          : null,
      };
    });
  };

  const handleFeaturedToggle = (checked: boolean) => {
    setForm(prev => {
      if (checked) {
        const start = prev.featured_start_date || getLocalTodayStr();
        const end = prev.featured_expiration_date || addMonthsLocal(start, 1);
        return {
          ...prev,
          is_featured: true,
          featured_start_date: start,
          featured_expiration_date: end,
          featured_payment_status:
            prev.featured_payment_status === 'none' ||
            !prev.featured_payment_status
              ? featuredPromoFree
                ? 'promotion'
                : 'bypassed'
              : prev.featured_payment_status,
        };
      }
      return { ...prev, is_featured: false };
    });
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (!(form.district || form.state))
      errs.district = 'Please select a district';
    if (!form.start_date) errs.start_date = 'Start date is required';
    if (!form.expiration_date)
      errs.expiration_date = 'Expiration date is required';

    if (
      bypassPayment &&
      !realtorPromoFree &&
      (!form.bypass_reason || form.bypass_reason.trim().length < 3)
    ) {
      errs.bypass_reason = 'Please provide a reason for bypassing payment';
    }

    if (form.is_featured) {
      if (!form.featured_start_date)
        errs.featured_start_date = 'Featured start date is required';
      if (!form.featured_expiration_date)
        errs.featured_expiration_date = 'Featured expiration date is required';
      if (
        bypassFeatured &&
        !featuredPromoFree &&
        (!form.featured_bypass_reason ||
          form.featured_bypass_reason.trim().length < 3)
      ) {
        errs.featured_bypass_reason =
          'Please provide a reason for bypassing featured payment';
      }
    }

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {isCreate ? 'Create Realtor Profile' : 'Edit Realtor'}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={e => {
                  setForm({ ...form, name: e.target.value });
                  clearError('name');
                }}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className='text-xs text-destructive mt-1'>{errors.name}</p>
              )}
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type='email'
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value });
                  clearError('email');
                }}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className='text-xs text-destructive mt-1'>{errors.email}</p>
              )}
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={form.phone}
                onChange={e => {
                  setForm({ ...form, phone: e.target.value });
                  clearError('phone');
                }}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className='text-xs text-destructive mt-1'>{errors.phone}</p>
              )}
            </div>
            <div>
              <Label>Years Experience</Label>
              <Input
                type='number'
                value={form.years_experience ?? ''}
                onChange={e =>
                  setForm({
                    ...form,
                    years_experience: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              />
            </div>
            <div>
              <Label>License Number</Label>
              <Input
                value={form.license_number ?? ''}
                onChange={e =>
                  setForm({ ...form, license_number: e.target.value })
                }
                placeholder='e.g. 12345'
              />
            </div>
            <div>
              <Label>Specialties</Label>
              <Input
                value={form.specialties?.join(', ') ?? ''}
                onChange={e =>
                  setForm({
                    ...form,
                    specialties: e.target.value
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder='Residential, Commercial, etc.'
              />
            </div>
            <div className='col-span-2'>
              <Label>Street Address</Label>
              <Input
                value={form.street_address ?? ''}
                onChange={e =>
                  setForm({ ...form, street_address: e.target.value })
                }
                placeholder='e.g. Thamel, Ward No. 26'
              />
            </div>
            <div>
              <Label>City</Label>
              <SearchableCombobox
                value={form.city}
                onValueChange={handleCityChange}
                options={NEPAL_CITIES}
                placeholder='Select City'
                searchPlaceholder='Search cities...'
                className='w-full'
              />
            </div>
            <div>
              <Label>District *</Label>
              <SearchableCombobox
                value={form.state || form.district}
                onValueChange={v => {
                  handleDistrictChange(v);
                  clearError('district');
                }}
                options={NEPAL_DISTRICTS}
                placeholder='Select District'
                searchPlaceholder='Search districts...'
                className='w-full'
              />
              {errors.district && (
                <p className='text-xs text-destructive mt-1'>{errors.district}</p>
              )}
            </div>
          </div>

          <div>
            <Label>About Me (Bio)</Label>
            <Textarea
              value={form.bio ?? ''}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              maxLength={1000}
            />
          </div>

          <div>
            <Label>Profile Photo</Label>
            <div className='flex items-center gap-4 mt-1'>
              <div className='h-16 w-16 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center'>
                {form.photo_url ? (
                  <img
                    src={form.photo_url}
                    alt='Realtor'
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <Camera className='h-6 w-6 text-muted-foreground' />
                )}
              </div>
              <div className='space-y-1'>
                <input
                  ref={photoInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/')) {
                      toast.error('Please select an image');
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('Image must be under 5MB');
                      return;
                    }
                    setUploadingPhoto(true);
                    const ext = file.name.split('.').pop();
                    const folder =
                      form.user_id || form.id || `new-${Date.now()}`;
                    const filePath = `${folder}/photo-${Date.now()}.${ext}`;
                    const { error } = await supabase.storage
                      .from('realtor-photos')
                      .upload(filePath, file, { upsert: true });
                    if (error) {
                      toast.error('Failed to upload photo');
                      setUploadingPhoto(false);
                      return;
                    }
                    const { data: urlData } = supabase.storage
                      .from('realtor-photos')
                      .getPublicUrl(filePath);
                    setForm({ ...form, photo_url: urlData.publicUrl });
                    toast.success('Photo uploaded!');
                    setUploadingPhoto(false);
                  }}
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={uploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className='gap-2'
                >
                  {uploadingPhoto ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Camera className='h-4 w-4' />
                  )}
                  {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </Button>
                <p className='text-xs text-muted-foreground'>
                  JPG, PNG or WebP. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <Accordion
            type='multiple'
            defaultValue={[]}
            className='w-full space-y-4'
          >
            {/* FULLY RESTORED: Featured Subscription Collapsible */}
            <AccordionItem
              value='featured'
              className='border rounded-lg bg-card px-4'
            >
              <AccordionTrigger className='hover:no-underline py-4'>
                <div className='flex items-center gap-2'>
                  <CreditCard className='h-5 w-5 text-yellow-500' />
                  <h3 className='font-semibold text-foreground'>
                    Featured Subscription
                  </h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className='pt-2 pb-4'>
                <div className='rounded-lg border border-border p-4 space-y-4 bg-muted/30'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-foreground'>
                        Featured / Advertised
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Boosts this realtor in the directory.
                      </p>
                    </div>
                    <Switch
                      checked={form.is_featured}
                      onCheckedChange={handleFeaturedToggle}
                    />
                  </div>

                  {form.is_featured && (
                    <>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                          <Label>Featured Start *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant='outline'
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !form.featured_start_date &&
                                    'text-muted-foreground',
                                )}
                              >
                                <CalendarIcon className='mr-2 h-4 w-4' />
                                {form.featured_start_date
                                  ? format(
                                      new Date(
                                        form.featured_start_date + 'T00:00:00',
                                      ),
                                      'PPP',
                                    )
                                  : 'Pick start date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className='w-auto p-0'
                              align='start'
                            >
                              <Calendar
                                mode='single'
                                selected={
                                  form.featured_start_date
                                    ? new Date(
                                        form.featured_start_date + 'T00:00:00',
                                      )
                                    : undefined
                                }
                                onSelect={date => {
                                  if (!date) {
                                    setForm({
                                      ...form,
                                      featured_start_date: null,
                                    });
                                    return;
                                  }
                                  const s = format(date, 'yyyy-MM-dd');
                                  setForm({
                                    ...form,
                                    featured_start_date: s,
                                    featured_expiration_date: addMonthsLocal(
                                      s,
                                      1,
                                    ),
                                  });
                                  clearError('featured_start_date');
                                  clearError('featured_expiration_date');
                                }}
                                initialFocus
                                className={cn('p-3 pointer-events-auto')}
                              />
                            </PopoverContent>
                          </Popover>
                          {errors.featured_start_date && (
                            <p className='text-xs text-destructive'>
                              {errors.featured_start_date}
                            </p>
                          )}
                        </div>
                        <div className='space-y-2'>
                          <Label>Featured Expiration *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant='outline'
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !form.featured_expiration_date &&
                                    'text-muted-foreground',
                                )}
                              >
                                <CalendarIcon className='mr-2 h-4 w-4' />
                                {form.featured_expiration_date
                                  ? format(
                                      new Date(
                                        form.featured_expiration_date +
                                          'T00:00:00',
                                      ),
                                      'PPP',
                                    )
                                  : 'Pick expiration date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className='w-auto p-0'
                              align='start'
                            >
                              <Calendar
                                mode='single'
                                selected={
                                  form.featured_expiration_date
                                    ? new Date(
                                        form.featured_expiration_date +
                                          'T00:00:00',
                                      )
                                    : undefined
                                }
                                onSelect={date => {
                                  setForm({
                                    ...form,
                                    featured_expiration_date: date
                                      ? format(date, 'yyyy-MM-dd')
                                      : null,
                                  });
                                  clearError('featured_expiration_date');
                                }}
                                disabled={
                                  form.featured_start_date
                                    ? {
                                        from: new Date(-8640000000000000),
                                        to: new Date(
                                          form.featured_start_date +
                                            'T00:00:00',
                                        ),
                                      }
                                    : undefined
                                }
                                initialFocus
                                className={cn('p-3 pointer-events-auto')}
                              />
                            </PopoverContent>
                          </Popover>
                          {errors.featured_expiration_date && (
                            <p className='text-xs text-destructive'>
                              {errors.featured_expiration_date}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-sm font-medium text-foreground'>
                            Featured Payment Status
                          </p>
                        </div>
                        <Badge
                          variant={
                            form.featured_payment_status === 'paid'
                              ? 'default'
                              : form.featured_payment_status === 'bypassed' ||
                                  form.featured_payment_status === 'promotion'
                                ? 'secondary'
                                : 'destructive'
                          }
                          className='capitalize'
                        >
                          {form.featured_payment_status || 'none'}
                        </Badge>
                      </div>

                      <div className='flex items-center gap-3 p-3 rounded-md border border-dashed border-border bg-background'>
                        <ShieldCheck className='h-5 w-5 text-accent shrink-0' />
                        <div className='flex-1'>
                          <p className='text-sm font-medium text-foreground'>
                            Bypass Featured Payment
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Skip featured payment for this realtor
                          </p>
                        </div>
                        <Checkbox
                          checked={bypassFeatured || featuredPromoFree}
                          disabled={featuredPromoFree}
                          onCheckedChange={checked =>
                            handleBypassFeaturedToggle(!!checked)
                          }
                        />
                      </div>

                      {bypassFeatured && !featuredPromoFree && (
                        <div className='space-y-2 p-3 rounded-md border border-amber-500/40 bg-amber-500/5'>
                          <Label className='text-sm'>
                            Reason for bypass{' '}
                            <span className='text-destructive'>*</span>
                          </Label>
                          <Textarea
                            value={form.featured_bypass_reason ?? ''}
                            onChange={e => {
                              setForm({
                                ...form,
                                featured_bypass_reason: e.target.value,
                              });
                              clearError('featured_bypass_reason');
                            }}
                            placeholder='Explain why featured payment is being bypassed…'
                            rows={2}
                            aria-invalid={!!errors.featured_bypass_reason}
                          />
                          {errors.featured_bypass_reason && (
                            <p className='text-xs text-destructive'>
                              {errors.featured_bypass_reason}
                            </p>
                          )}
                        </div>
                      )}

                      {!bypassFeatured &&
                        !featuredPromoFree &&
                        form.featured_payment_status !== 'paid' && (
                          <SimulatedPaymentForm
                            paid={false}
                            onPaymentComplete={() => {
                              const now = getLocalTodayStr();
                              setForm(prev => ({
                                ...prev,
                                featured_payment_status: 'paid',
                                featured_start_date: now,
                                featured_expiration_date: addMonthsLocal(
                                  now,
                                  1,
                                ),
                              }));
                            }}
                            amount={featuredFee}
                            label='Featured Realtor placement'
                          />
                        )}
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* FULLY RESTORED: Subscription & Payments Collapsible */}
            <AccordionItem
              value='subscription'
              className='border rounded-lg bg-card px-4'
            >
              <AccordionTrigger className='hover:no-underline py-4'>
                <div className='flex items-center gap-2'>
                  <CreditCard className='h-5 w-5 text-primary' />
                  <h3 className='font-semibold text-foreground'>
                    Subscription & Payment
                  </h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className='pt-2 pb-4 space-y-6'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant='outline'
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !form.start_date && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className='mr-2 h-4 w-4' />
                          {form.start_date
                            ? format(
                                new Date(form.start_date + 'T00:00:00'),
                                'PPP',
                              )
                            : 'Pick start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={
                            form.start_date
                              ? new Date(form.start_date + 'T00:00:00')
                              : undefined
                          }
                          onSelect={date => {
                            if (!date) {
                              setForm({ ...form, start_date: null });
                              return;
                            }
                            const s = format(date, 'yyyy-MM-dd');
                            setForm({
                              ...form,
                              start_date: s,
                              expiration_date: addMonthsLocal(s, 1),
                            });
                            clearError('start_date');
                            clearError('expiration_date');
                          }}
                          initialFocus
                          className={cn('p-3 pointer-events-auto')}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.start_date && (
                      <p className='text-xs text-destructive'>
                        {errors.start_date}
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label>Expiration Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant='outline'
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !form.expiration_date && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className='mr-2 h-4 w-4' />
                          {form.expiration_date
                            ? format(
                                new Date(form.expiration_date + 'T00:00:00'),
                                'PPP',
                              )
                            : 'Pick expiration date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={
                            form.expiration_date
                              ? new Date(form.expiration_date + 'T00:00:00')
                              : undefined
                          }
                          onSelect={date => {
                            setForm({
                              ...form,
                              expiration_date: date
                                ? format(date, 'yyyy-MM-dd')
                                : null,
                            });
                            clearError('expiration_date');
                          }}
                          disabled={
                            form.start_date
                              ? {
                                  from: new Date(-8640000000000000),
                                  to: new Date(form.start_date + 'T00:00:00'),
                                }
                              : undefined
                          }
                          initialFocus
                          className={cn('p-3 pointer-events-auto')}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.expiration_date && (
                      <p className='text-xs text-destructive'>
                        {errors.expiration_date}
                      </p>
                    )}
                  </div>
                </div>

                <div className='rounded-lg border border-border p-4 space-y-4 bg-muted/30'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-foreground'>
                        Payment Status
                      </p>
                    </div>
                    <Badge
                      variant={
                        form.payment_status === 'paid'
                          ? 'default'
                          : form.payment_status === 'bypassed' ||
                              form.payment_status === 'promotion'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {form.payment_status === 'paid'
                        ? 'Paid'
                        : form.payment_status === 'bypassed'
                          ? 'Bypassed'
                          : form.payment_status === 'promotion'
                            ? 'Promotion (Free)'
                            : 'Pending'}
                    </Badge>
                  </div>

                  <div className='flex items-center gap-3 p-3 rounded-md border border-dashed border-border bg-background'>
                    <ShieldCheck className='h-5 w-5 text-accent shrink-0' />
                    <div className='flex-1'>
                      <p className='text-sm font-medium text-foreground'>
                        Bypass Payment
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Skip payment verification for this realtor
                      </p>
                    </div>
                    <Checkbox
                      checked={bypassPayment || realtorPromoFree}
                      disabled={realtorPromoFree}
                      onCheckedChange={checked => handleBypassToggle(!!checked)}
                    />
                  </div>

                  {bypassPayment && !realtorPromoFree && (
                    <div className='space-y-2 p-3 rounded-md border border-amber-500/40 bg-amber-500/5'>
                      <Label className='text-sm'>
                        Reason for bypass{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Textarea
                        value={form.bypass_reason ?? ''}
                        onChange={e => {
                          setForm({ ...form, bypass_reason: e.target.value });
                          clearError('bypass_reason');
                        }}
                        placeholder='Explain why payment is being bypassed...'
                        rows={2}
                        aria-invalid={!!errors.bypass_reason}
                      />
                      {errors.bypass_reason && (
                        <p className='text-xs text-destructive'>
                          {errors.bypass_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {!bypassPayment && !realtorPromoFree && (
                    <SimulatedPaymentForm
                      paid={form.payment_status === 'paid'}
                      onPaymentComplete={() => {
                        const now = getLocalTodayStr();
                        setForm(prev => ({
                          ...prev,
                          payment_status: 'paid',
                          start_date: now,
                          expiration_date: addMonthsLocal(now, 1),
                        }));
                      }}
                      amount={realtorFee}
                      label={
                        isCreate ? 'Realtor signup fee' : 'Realtor renewal fee'
                      }
                    />
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {!isCreate && form.id && (
            <>
              <Separator />
              <div className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <CreditCard className='h-5 w-5 text-primary' />
                  <h3 className='font-semibold text-foreground'>
                    Payment History
                  </h3>
                </div>
                <PaymentHistoryList
                  relatedType='realtor'
                  relatedId={form.id}
                  canEditNotes
                  compact
                />
              </div>
            </>
          )}

          <Separator />

          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isCreate ? (
              <Button onClick={handleSubmit}>Create Realtor</Button>
            ) : (
              <ConfirmSaveButton onConfirm={handleSubmit} disabled={!dirty}>
                Save Changes
              </ConfirmSaveButton>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RealtorFormDialog;
