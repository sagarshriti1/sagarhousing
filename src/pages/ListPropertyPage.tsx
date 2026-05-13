import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import {
  Upload,
  X,
  Plus,
  Loader2,
  CalendarIcon,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import SimulatedPaymentForm from '@/components/SimulatedPaymentForm';
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
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  NEPAL_CITIES,
  NEPAL_DISTRICTS,
  getDistrictForCity,
} from '@/data/nepalLocations';
import SearchableCombobox from '@/components/SearchableCombobox';
import { useFeatureFlag, FEATURE_KEYS } from '@/hooks/useFeatureFlag';
import PaymentHistoryList from '@/components/PaymentHistoryList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const COMMON_FEATURES = [
  'Central AC',
  'Hardwood Floors',
  'Smart Home',
  'Pool',
  'Garage',
  'Fireplace',
  'Walk-in Closets',
  'Granite Countertops',
  'Stainless Steel Appliances',
  'Laundry Room',
  'Fenced Yard',
  'Patio/Deck',
  'Basement',
  'Attic',
  'Solar Panels',
  'Security System',
];

// LOCAL DATE HELPERS (Fixes the May 8 -> May 7 timezone shift)
const getLocalTodayStr = () => format(new Date(), 'yyyy-MM-dd');
const addMonthsLocal = (dateStr: string, months: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return format(addMonths(date, months), 'yyyy-MM-dd');
};

const ListPropertyPage = () => {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === 'admin';
  const saleFlag = useFeatureFlag(FEATURE_KEYS.PROPERTY_SALE);
  const rentFlag = useFeatureFlag(FEATURE_KEYS.PROPERTY_RENT);
  const limitBypassFlag = useFeatureFlag(FEATURE_KEYS.NON_REALTOR_LIMIT_BYPASS);
  // bypass_payment=true means the limit IS enforced; fee stores the max count
  const isLimitEnforced = limitBypassFlag.flag?.bypass_payment ?? true;
  const LISTING_LIMIT = Math.max(1, limitBypassFlag.flag?.fee ?? 2);
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEdit = !!editId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customFeature, setCustomFeature] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    district: '',
    price: '0',
    bedrooms: '0',
    bathrooms: '0',
    sqft: '0',
    property_type: 'house' as 'apartment' | 'commercial' | 'house' | 'land',
    listing_type: 'sale' as 'sale' | 'rent',
    year_built: '',
    lot_size: '0',
    lot_unit: 'Aana',
    maintenance_fee: '0',
    bike_parking: '0',
    car_parking: '0',
    stories: '0',
  });

  const [paymentDate, setPaymentDate] = useState<string | null>(
    isAdmin && !isEdit ? getLocalTodayStr() : null,
  );
  const [expirationDate, setExpirationDate] = useState<string | null>(
    isAdmin && !isEdit ? addMonthsLocal(getLocalTodayStr(), 1) : null,
  );
  const [propertyCode, setPropertyCode] = useState<number | null>(null);
  const [bypassReason, setBypassReason] = useState<string>('');
  const [bypassPayment, setBypassPayment] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<
    'pending' | 'paid' | 'bypassed' | 'promotion'
  >('pending');
  const [currentStatus, setCurrentStatus] = useState<
    'active' | 'pending' | 'sold' | 'rented'
  >('pending');
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [reactivatePayOpen, setReactivatePayOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (k: string) =>
    setErrors(prev => {
      if (!prev[k]) return prev;
      const { [k]: _, ...rest } = prev;
      return rest;
    });
  const [isDirty, setIsDirty] = useState(false);
  const [confirmBackOpen, setConfirmBackOpen] = useState(false);

  const isRealtor = role === 'realtor';
  const isStandardUser = !!user && !isRealtor && role !== 'admin';
  const [existingListingCount, setExistingListingCount] = useState<
    number | null
  >(null);
  const atListingLimit =
    isLimitEnforced &&
    isStandardUser &&
    !isEdit &&
    existingListingCount !== null &&
    existingListingCount >= LISTING_LIMIT;
  const limitMessage = `You've reached the ${LISTING_LIMIT}-listing limit for standard accounts. Delete an existing listing or upgrade to a Realtor account to post more.`;

  const [realtorInactive, setRealtorInactive] = useState(false);

  // EXACT MESSAGE AS REQUESTED
  const realtorInactiveMessage =
    'Your Realtor profile is inactive or expired. Please renew your Realtor subscription before posting new listings.';

  useEffect(() => {
    if (authLoading || !user || isEdit || !isStandardUser) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('user_properties')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (!cancelled) setExistingListingCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isEdit, isStandardUser, authLoading]);

  useEffect(() => {
    if (authLoading || !user || !isRealtor || isEdit) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('realtors')
        .select('payment_status, expiration_date')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const active =
        !!data &&
        (data.payment_status === 'paid' ||
          data.payment_status === 'promotion' ||
          data.payment_status === 'bypassed') &&
        (!data.expiration_date || new Date(data.expiration_date) > new Date());
      setRealtorInactive(!active);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isRealtor, isEdit, authLoading]);

  useEffect(() => {
    if (!fetching) setIsDirty(true);
  }, [
    form,
    selectedFeatures,
    imageFiles,
    existingImages,
    paymentDate,
    expirationDate,
    fetching,
  ]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const backTarget = isAdmin ? '/admin?tab=properties' : (-1 as const);
  const goBack = () => {
    if (typeof backTarget === 'string') navigate(backTarget);
    else navigate(backTarget);
  };
  const handleBack = () => {
    if (isDirty) setConfirmBackOpen(true);
    else goBack();
  };

  useEffect(() => {
    if (authLoading || !editId || !user) return;
    const fetchProperty = async () => {
      let query = supabase.from('user_properties').select('*').eq('id', editId);

      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        toast.error('Property not found');
        navigate('/my-listings');
        return;
      }

      setForm({
        title: data.title ?? '',
        description: data.description ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        district:
          (data as any).district ?? getDistrictForCity(data.city ?? '') ?? '',
        price: data.price != null ? String(data.price) : '0',
        bedrooms: data.bedrooms != null ? String(data.bedrooms) : '0',
        bathrooms: data.bathrooms != null ? String(data.bathrooms) : '0',
        sqft: data.sqft != null ? String(data.sqft) : '0',
        property_type: (data.property_type ?? 'house') as
          | 'apartment'
          | 'commercial'
          | 'house'
          | 'land',
        listing_type: data.listing_type ?? 'sale',
        year_built: data.year_built != null ? String(data.year_built) : '',
        lot_size: data.lot_size != null ? String(data.lot_size) : '0',
        lot_unit: ((data as any).lot_unit as string) || 'Aana',

        maintenance_fee: String((data as any).maintenance_fee ?? 0),
        bike_parking: String((data as any).bike_parking ?? 0),
        car_parking: String((data as any).car_parking ?? 0),
        stories: String((data as any).stories ?? 0),
      });
      setSelectedFeatures(data.features ?? []);
      setExistingImages(data.images ?? []);

      const pd = (data as any).payment_date;
      const ed = (data as any).expiration_date;
      setPaymentDate(pd ? pd.split('T')[0] : null);
      setExpirationDate(ed ? ed.split('T')[0] : null);

      setPropertyCode((data as any).property_code ?? null);
      setCurrentStatus(((data as any).status ?? 'pending') as any);
      setFetching(false);
      setIsDirty(false); // Reset dirty state after load
    };
    fetchProperty();
  }, [editId, user, navigate, isAdmin, authLoading]);

  const handleDeactivateNow = async () => {
    if (!editId) return;
    setStatusBusy(true);
    const { error } = await supabase
      .from('user_properties')
      .update({ status: 'pending' as const })
      .eq('id', editId);
    setStatusBusy(false);
    setConfirmDeactivateOpen(false);
    if (error) {
      toast.error('Failed to deactivate listing');
      return;
    }
    setCurrentStatus('pending');
    toast.success('Listing deactivated');
  };

  const handleReactivateClick = async () => {
    if (!editId) return;
    const withinPeriod =
      expirationDate && new Date(expirationDate) > new Date();
    const flag = form.listing_type === 'rent' ? rentFlag : saleFlag;
    if (withinPeriod || isAdmin) {
      setStatusBusy(true);
      const { error } = await supabase
        .from('user_properties')
        .update({ status: 'active' as const })
        .eq('id', editId);
      setStatusBusy(false);
      if (error) {
        toast.error('Failed to reactivate listing');
        return;
      }
      setCurrentStatus('active');
      toast.success('Listing reactivated');
      return;
    }
    if (flag.isFree) {
      await completeReactivationPayment();
      return;
    }
    setReactivatePayOpen(true);
  };

  const completeReactivationPayment = async () => {
    if (!editId || !user) return;

    const startDate = getLocalTodayStr();
    const expiryDate = addMonthsLocal(startDate, 1);

    const { error } = await supabase
      .from('user_properties')
      .update({
        status: 'active' as const,
        payment_date: startDate,
        expiration_date: expiryDate,
      } as any)
      .eq('id', editId);
    if (error) {
      toast.error('Failed to activate listing');
      return;
    }
    const flag = form.listing_type === 'rent' ? rentFlag : saleFlag;
    const { logPayment } = await import('@/lib/paymentHistory');
    await logPayment({
      user_id: user.id,
      service_key:
        form.listing_type === 'rent'
          ? FEATURE_KEYS.PROPERTY_RENT
          : FEATURE_KEYS.PROPERTY_SALE,
      service_label:
        form.listing_type === 'rent'
          ? 'Property Listing — For Rent'
          : 'Property Listing — For Sale',
      related_type: 'property',
      related_id: editId,
      related_label: form.title,
      amount: flag.isFree ? 0 : flag.fee,
      status: flag.isFree ? 'promotion' : 'paid',
      promo_label: flag.isFree ? flag.promoLabel : null,
      expiration_date: expiryDate,
    });
    setCurrentStatus('active');
    setPaymentDate(startDate);
    setExpirationDate(expiryDate);
    setReactivatePayOpen(false);
    toast.success(
      'Payment successful! Your listing is now active for 1 month 🎉',
    );
  };

  const updateForm = (field: string, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'city') {
        const district = getDistrictForCity(value);
        if (district) updated.district = district;
      }
      if (field === 'district') {
        const cityDistrict = getDistrictForCity(prev.city);
        if (cityDistrict !== value) updated.city = '';
      }
      return updated;
    });
    clearError(field);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages =
      existingImages.length + imageFiles.length + files.length;
    if (totalImages > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e =>
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature],
    );
  };

  const addCustomFeature = () => {
    if (
      customFeature.trim() &&
      !selectedFeatures.includes(customFeature.trim())
    ) {
      setSelectedFeatures(prev => [...prev, customFeature.trim()]);
      setCustomFeature('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!isEdit && isStandardUser && isLimitEnforced) {
      const { count } = await supabase
        .from('user_properties')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if ((count ?? 0) >= LISTING_LIMIT) {
        toast.error(limitMessage);
        setExistingListingCount(count ?? 0);
        return;
      }
    }

    if (!isEdit && isRealtor) {
      const { data } = await supabase
        .from('realtors')
        .select('payment_status, expiration_date')
        .eq('user_id', user.id)
        .maybeSingle();
      const active =
        !!data &&
        (data.payment_status === 'paid' ||
          data.payment_status === 'promotion' ||
          data.payment_status === 'bypassed') &&
        (!data.expiration_date || new Date(data.expiration_date) > new Date());
      if (!active) {
        setRealtorInactive(true);
        toast.error(realtorInactiveMessage);
        return;
      }
    }

    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'Listing title is required';
    if (!form.address.trim()) newErrors.address = 'Street address is required';
    if (!form.district.trim()) newErrors.district = 'Please select a district';
    if (!form.price || parseFloat(form.price) <= 0)
      newErrors.price = 'Price must be greater than 0';

    const flag = form.listing_type === 'rent' ? rentFlag : saleFlag;
    if (isAdmin) {
      if (!paymentDate) newErrors.paymentDate = 'Start date is required';
      if (!expirationDate)
        newErrors.expirationDate = 'Expiration date is required';
      if (
        paymentDate &&
        expirationDate &&
        new Date(paymentDate) >= new Date(expirationDate)
      ) {
        newErrors.expirationDate = 'Expiration date must be after start date';
      }
      if (!isEdit && !flag.isFree) {
        if (!bypassPayment && paymentStatus !== 'paid') {
          newErrors.payment =
            'Please complete payment or enable bypass with a reason';
        }
        if (bypassPayment && bypassReason.trim().length < 3) {
          newErrors.bypassReason =
            'Please provide a reason for bypassing payment (min 3 characters)';
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstKey = Object.keys(newErrors)[0];
      const el =
        document.getElementById(firstKey) ||
        document.querySelector(`[data-field="${firstKey}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const newImageUrls: string[] = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const {
          data: { publicUrl },
        } = supabase.storage.from('property-images').getPublicUrl(filePath);
        newImageUrls.push(publicUrl);
      }

      const allImages = [...existingImages, ...newImageUrls];

      const payload = {
        user_id: user.id,
        title: form.title,
        description: form.description || null,
        address: form.address,
        city: form.city,
        district: form.district,
        state: '',
        zip_code: '',
        price: parseFloat(form.price),
        bedrooms: parseInt(form.bedrooms),
        bathrooms: parseFloat(form.bathrooms),
        sqft: form.sqft ? parseInt(form.sqft) : null,
        property_type: form.property_type,
        listing_type: form.listing_type,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        lot_size: form.lot_size ? parseFloat(form.lot_size) : null,
        lot_unit: form.lot_unit || 'Aana',
        features: selectedFeatures,
        images: allImages,
        maintenance_fee: parseFloat(form.maintenance_fee) || 0,
        bike_parking: parseInt(form.bike_parking) || 0,
        car_parking: parseInt(form.car_parking) || 0,
        stories: parseInt(form.stories) || 0,
        ...(isAdmin && paymentDate ? { payment_date: paymentDate } : {}),
        ...(isAdmin && expirationDate
          ? { expiration_date: expirationDate }
          : {}),
        ...(isEdit
          ? {}
          : { status: isAdmin ? ('active' as const) : ('pending' as const) }),
      };

      if (isEdit) {
        let updateQuery = supabase
          .from('user_properties')
          .update(payload)
          .eq('id', editId);
        if (!isAdmin) {
          updateQuery = updateQuery.eq('user_id', user.id);
        }
        const { error } = await updateQuery;
        if (error) throw error;
        toast.success('Listing updated successfully!');
      } else {
        const { data: inserted, error } = await supabase
          .from('user_properties')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (isAdmin && inserted) {
          const { logPayment } = await import('@/lib/paymentHistory');
          const finalStatus: 'paid' | 'bypassed' | 'promotion' = flag.isFree
            ? 'promotion'
            : paymentStatus === 'paid'
              ? 'paid'
              : 'bypassed';
          await logPayment({
            user_id: user.id,
            service_key:
              form.listing_type === 'rent'
                ? FEATURE_KEYS.PROPERTY_RENT
                : FEATURE_KEYS.PROPERTY_SALE,
            service_label:
              form.listing_type === 'rent'
                ? 'Property Listing — For Rent'
                : 'Property Listing — For Sale',
            related_type: 'property',
            related_id: (inserted as any).id,
            related_label: form.title,
            amount: finalStatus === 'paid' ? flag.fee : 0,
            status: finalStatus,
            promo_label: flag.isFree ? flag.promoLabel : null,
            expiration_date: expirationDate,
            notes:
              finalStatus === 'bypassed'
                ? `Payment bypassed by admin. Reason: ${bypassReason.trim() || '(no reason provided)'}`
                : null,
          });
        }
        toast.success(
          isAdmin
            ? 'Property created and activated!'
            : 'Property saved! Pay the listing fee from My Listings to activate it.',
        );
      }
      setIsDirty(false);
      navigate(-1);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // REFRESH PROTECTION
  if (authLoading || fetching) {
    return (
      <div className='min-h-screen flex flex-col'>
        <Header />
        <main className='flex-1 flex items-center justify-center'>
          <Loader2 className='h-8 w-8 animate-spin text-accent' />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <main className='flex-1 container py-8 max-w-3xl'>
        <Button
          type='button'
          variant='ghost'
          onClick={handleBack}
          className='mb-4 -ml-3 gap-2'
        >
          <ArrowLeft className='h-4 w-4' /> Back
        </Button>
        <h1 className='font-display text-3xl font-bold text-foreground mb-2'>
          {isEdit ? 'Edit Listing' : 'List Your Property'}
        </h1>
        <p className='text-muted-foreground mb-8'>
          {isEdit
            ? 'Update the details of your property listing'
            : 'Fill in the details below to list your property'}
        </p>

        {atListingLimit && (
          <Alert variant='destructive' className='mb-6'>
            <AlertTitle>Listing limit reached</AlertTitle>
            <AlertDescription>{limitMessage}</AlertDescription>
          </Alert>
        )}

        {realtorInactive && !isEdit && (
          <Alert variant='destructive' className='mb-6'>
            <AlertTitle>Realtor profile inactive</AlertTitle>
            <AlertDescription>{realtorInactiveMessage}</AlertDescription>
          </Alert>
        )}

        {isEdit && (
          <div className='mb-6 rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 flex-wrap'>
              <Badge
                className={`border-0 capitalize ${currentStatus === 'active' ? 'bg-badge-new text-badge-new-foreground' : 'bg-yellow-500 text-foreground'}`}
              >
                {currentStatus === 'active' ? 'Active' : 'Inactive'}
              </Badge>
              {currentStatus === 'active' && expirationDate && (
                <span className='text-sm text-muted-foreground'>
                  Active until{' '}
                  {format(
                    new Date(expirationDate + 'T00:00:00'),
                    'MMM d, yyyy',
                  )}
                </span>
              )}
              {currentStatus !== 'active' &&
                expirationDate &&
                new Date(expirationDate) > new Date() && (
                  <span className='text-sm text-muted-foreground'>
                    Paid period until{' '}
                    {format(
                      new Date(expirationDate + 'T00:00:00'),
                      'MMM d, yyyy',
                    )}{' '}
                    — reactivation is free
                  </span>
                )}
            </div>
            <div className='flex items-center gap-2'>
              <Label htmlFor='status-toggle' className='text-sm'>
                {currentStatus === 'active' ? 'Active' : 'Inactive'}
              </Label>
              <Switch
                id='status-toggle'
                checked={currentStatus === 'active'}
                disabled={statusBusy}
                onCheckedChange={checked => {
                  if (checked) handleReactivateClick();
                  else setConfirmDeactivateOpen(true);
                }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-8'>
          {/* Basic Info */}
          <section className='space-y-4'>
            <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>
              Basic Information
            </h2>
            {isEdit && propertyCode != null && (
              <div className='space-y-2'>
                <Label htmlFor='property_code'>Property ID</Label>
                <Input
                  id='property_code'
                  value={`#${propertyCode}`}
                  readOnly
                  disabled
                  className='font-mono bg-muted'
                />
              </div>
            )}
            <div className='space-y-2'>
              <Label htmlFor='title'>Listing Title *</Label>
              <Input
                id='title'
                value={form.title}
                onChange={e => updateForm('title', e.target.value)}
                placeholder='e.g. Beautiful Modern Home in Downtown'
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p className='text-xs text-destructive'>{errors.title}</p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                value={form.description}
                onChange={e => updateForm('description', e.target.value)}
                placeholder='Describe your property...'
                rows={4}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Property Type *</Label>
                <Select
                  value={form.property_type}
                  onValueChange={v => updateForm('property_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='apartment'>Apartment</SelectItem>
                    <SelectItem value='commercial'>Commercial</SelectItem>
                    <SelectItem value='house'>House</SelectItem>
                    <SelectItem value='land'>Land</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Listing Type *</Label>
                <Select
                  value={form.listing_type}
                  onValueChange={v => updateForm('listing_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='sale'>For Sale</SelectItem>
                    <SelectItem value='rent'>For Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Location */}
          <section className='space-y-4'>
            <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>
              Location
            </h2>
            <div className='space-y-2'>
              <Label htmlFor='address'>Street Address *</Label>
              <Input
                id='address'
                value={form.address}
                onChange={e => updateForm('address', e.target.value)}
                placeholder='e.g. Thamel, Ward No. 26'
                aria-invalid={!!errors.address}
              />
              {errors.address && (
                <p className='text-xs text-destructive'>{errors.address}</p>
              )}
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>City</Label>
                <SearchableCombobox
                  value={form.city}
                  onValueChange={v => {
                    updateForm('city', v);
                    const dist = getDistrictForCity(v);
                    if (dist) updateForm('district', dist);
                  }}
                  options={NEPAL_CITIES}
                  placeholder='Select City'
                  searchPlaceholder='Search cities...'
                  className='w-full'
                />
              </div>
              <div className='space-y-2' data-field='district'>
                <Label>District *</Label>
                <SearchableCombobox
                  value={form.district}
                  onValueChange={v => updateForm('district', v)}
                  options={NEPAL_DISTRICTS}
                  placeholder='Select District'
                  searchPlaceholder='Search districts...'
                  className='w-full'
                />
                {errors.district && (
                  <p className='text-xs text-destructive'>{errors.district}</p>
                )}
              </div>
            </div>
          </section>

          {/* Details */}
          <section className='space-y-4'>
            <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>
              Property Details
            </h2>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='price'>Price (Rs.) *</Label>
                <Input
                  id='price'
                  type='number'
                  value={form.price}
                  onFocus={e => e.currentTarget.select()}
                  onChange={e => updateForm('price', e.target.value)}
                  placeholder='450000'
                  min='0'
                  aria-invalid={!!errors.price}
                />
                {errors.price && (
                  <p className='text-xs text-destructive'>{errors.price}</p>
                )}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='bedrooms'>Bedrooms</Label>
                <Input
                  id='bedrooms'
                  type='number'
                  value={form.bedrooms}
                  onFocus={e => e.currentTarget.select()}
                  onChange={e => updateForm('bedrooms', e.target.value)}
                  min='0'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='bathrooms'>Bathrooms</Label>
                <Input
                  id='bathrooms'
                  type='number'
                  value={form.bathrooms}
                  onFocus={e => e.currentTarget.select()}
                  onChange={e => updateForm('bathrooms', e.target.value)}
                  min='0'
                  step='0.5'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='sqft'>Square Meter</Label>
                <Input
                  id='sqft'
                  type='number'
                  value={form.sqft}
                  onFocus={e => e.currentTarget.select()}
                  onChange={e => updateForm('sqft', e.target.value)}
                  placeholder='200'
                  min='0'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='yearBuilt'>Year Built</Label>
                <Input
                  id='yearBuilt'
                  type='number'
                  value={form.year_built}
                  onFocus={e => e.currentTarget.select()}
                  onChange={e => updateForm('year_built', e.target.value)}
                  placeholder='2020'
                  min='1800'
                  max={new Date().getFullYear()}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='lotSize'>Lot Size</Label>
                <div className='flex gap-2'>
                  <Input
                    id='lotSize'
                    type='number'
                    value={form.lot_size}
                    onFocus={e => e.currentTarget.select()}
                    onChange={e => updateForm('lot_size', e.target.value)}
                    placeholder='4'
                    min='0'
                    step='0.01'
                    className='flex-1'
                  />
                  <Select
                    value={form.lot_unit}
                    onValueChange={v => updateForm('lot_unit', v)}
                  >
                    <SelectTrigger className='w-[110px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'Aana',
                        'Bigha',
                        'Daam',
                        'Dhur',
                        'Katha',
                        'Paisa',
                        'Ropani',
                        'Sq. Ft.',
                      ].map(u => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='maintenance_fee'>Maintenance Fee (Rs.)</Label>
                <Input
                  id='maintenance_fee'
                  type='number'
                  value={form.maintenance_fee}
                  onFocus={e => e.currentTarget.select()}
                  onChange={e => updateForm('maintenance_fee', e.target.value)}
                  placeholder='0'
                  min='0'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='bike_parking'>Motor Bike Parking</Label>
                <Input
                  id='bike_parking'
                  type='number'
                  value={form.bike_parking}
                  onFocus={e => e.currentTarget.select()}
                  onChange={e => updateForm('bike_parking', e.target.value)}
                  placeholder='0'
                  min='0'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='car_parking'>Car Parking</Label>
                <Input
                  id='car_parking'
                  type='number'
                  value={form.car_parking}
                  onFocus={e => e.currentTarget.select()}
                  onChange={e => updateForm('car_parking', e.target.value)}
                  placeholder='0'
                  min='0'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='stories'>Stories</Label>
                <Input
                  id='stories'
                  type='number'
                  value={form.stories}
                  onFocus={e => e.currentTarget.select()}
                  onChange={e => updateForm('stories', e.target.value)}
                  placeholder='0'
                  min='0'
                />
              </div>
            </div>
          </section>

          {/* Features */}
          <section className='space-y-4'>
            <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>
              Features & Amenities
            </h2>
            <div className='flex flex-wrap gap-2'>
              {COMMON_FEATURES.map(f => (
                <button
                  key={f}
                  type='button'
                  onClick={() => toggleFeature(f)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selectedFeatures.includes(f)
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className='flex gap-2'>
              <Input
                value={customFeature}
                onChange={e => setCustomFeature(e.target.value)}
                placeholder='Add custom feature...'
                onKeyDown={e =>
                  e.key === 'Enter' && (e.preventDefault(), addCustomFeature())
                }
              />
              <Button
                type='button'
                variant='outline'
                onClick={addCustomFeature}
                size='icon'
              >
                <Plus className='h-4 w-4' />
              </Button>
            </div>
            {selectedFeatures.filter(f => !COMMON_FEATURES.includes(f)).length >
              0 && (
              <div className='flex flex-wrap gap-2'>
                {selectedFeatures
                  .filter(f => !COMMON_FEATURES.includes(f))
                  .map(f => (
                    <span
                      key={f}
                      className='px-3 py-1.5 rounded-full text-sm bg-accent text-accent-foreground flex items-center gap-1'
                    >
                      {f}
                      <button type='button' onClick={() => toggleFeature(f)}>
                        <X className='h-3 w-3' />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </section>

          {/* Images */}
          <section className='space-y-4'>
            <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>
              Property Photos
            </h2>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {existingImages.map((src, i) => (
                <div
                  key={`existing-${i}`}
                  className='relative aspect-square rounded-lg overflow-hidden border border-border'
                >
                  <img
                    src={src}
                    alt=''
                    className='w-full h-full object-cover'
                  />
                  <button
                    type='button'
                    onClick={() => removeExistingImage(i)}
                    className='absolute top-1 right-1 p-1 rounded-full bg-card/80 hover:bg-card'
                  >
                    <X className='h-4 w-4 text-foreground' />
                  </button>
                </div>
              ))}
              {imagePreviews.map((src, i) => (
                <div
                  key={`new-${i}`}
                  className='relative aspect-square rounded-lg overflow-hidden border border-border'
                >
                  <img
                    src={src}
                    alt=''
                    className='w-full h-full object-cover'
                  />
                  <button
                    type='button'
                    onClick={() => removeImage(i)}
                    className='absolute top-1 right-1 p-1 rounded-full bg-card/80 hover:bg-card'
                  >
                    <X className='h-4 w-4 text-foreground' />
                  </button>
                </div>
              ))}
              {existingImages.length + imageFiles.length < 10 && (
                <label className='aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors'>
                  <Upload className='h-6 w-6 text-muted-foreground mb-1' />
                  <span className='text-xs text-muted-foreground'>
                    Add Photo
                  </span>
                  <input
                    type='file'
                    className='hidden'
                    accept='image/*'
                    multiple
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
            <p className='text-xs text-muted-foreground'>
              Upload up to 10 photos. First photo will be the cover image.
            </p>
          </section>

          {isAdmin &&
            (() => {
              const flag = form.listing_type === 'rent' ? rentFlag : saleFlag;
              const showPaymentUI = !isEdit && !flag.isFree;
              return (
                <section className='space-y-4'>
                  <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>
                    Subscription & Payment
                  </h2>

                  {showPaymentUI && (
                    <div className='rounded-lg border border-border p-4 space-y-4 bg-muted/30'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-sm font-medium text-foreground'>
                            Payment Status
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Payment is required to activate this listing
                          </p>
                        </div>
                        <Badge
                          variant={
                            paymentStatus === 'paid'
                              ? 'default'
                              : paymentStatus === 'bypassed'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {paymentStatus === 'paid'
                            ? 'Paid'
                            : paymentStatus === 'bypassed'
                              ? 'Bypassed'
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
                            Skip payment verification for this listing
                          </p>
                        </div>
                        <Checkbox
                          checked={bypassPayment}
                          onCheckedChange={checked => {
                            const c = !!checked;
                            setBypassPayment(c);
                            setPaymentStatus(
                              c
                                ? 'bypassed'
                                : paymentStatus === 'paid'
                                  ? 'paid'
                                  : 'pending',
                            );
                            if (!c) setBypassReason('');
                          }}
                        />
                      </div>

                      {bypassPayment && (
                        <div
                          className='space-y-2 p-3 rounded-md border border-amber-500/40 bg-amber-500/5'
                          data-field='bypassReason'
                        >
                          <Label>
                            Reason for bypass{' '}
                            <span className='text-destructive'>*</span>
                          </Label>
                          <Textarea
                            value={bypassReason}
                            onChange={e => {
                              setBypassReason(e.target.value);
                              clearError('bypassReason');
                            }}
                            placeholder='Explain why payment is being bypassed (e.g. complimentary listing, partner agreement, manual offline payment)…'
                            rows={2}
                            aria-invalid={!!errors.bypassReason}
                          />
                          {errors.bypassReason ? (
                            <p className='text-xs text-destructive'>
                              {errors.bypassReason}
                            </p>
                          ) : (
                            <p className='text-xs text-muted-foreground'>
                              Mandatory. This reason will appear in the payment
                              history for both the admin and the listing owner.
                            </p>
                          )}
                        </div>
                      )}

                      {!bypassPayment && (
                        <div data-field='payment' className='space-y-2'>
                          <SimulatedPaymentForm
                            paid={paymentStatus === 'paid'}
                            onPaymentComplete={() => {
                              setPaymentStatus('paid');
                              clearError('payment');
                            }}
                            amount={flag.fee}
                            label={
                              form.listing_type === 'rent'
                                ? 'Rent listing fee'
                                : 'Sale listing fee'
                            }
                          />
                          {errors.payment && (
                            <p className='text-xs text-destructive'>
                              {errors.payment}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {showPaymentUI && <Separator />}

                  <div>
                    <h3 className='font-medium text-foreground mb-3 flex items-center gap-2'>
                      <CalendarIcon className='h-4 w-4 text-muted-foreground' />{' '}
                      Listing Period
                    </h3>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='space-y-2' data-field='paymentDate'>
                        <Label>Start Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type='button'
                              variant='outline'
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !paymentDate && 'text-muted-foreground',
                              )}
                            >
                              <CalendarIcon className='mr-2 h-4 w-4' />
                              {paymentDate
                                ? format(
                                    new Date(paymentDate + 'T00:00:00'),
                                    'PPP',
                                  )
                                : 'Pick start date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0' align='start'>
                            <Calendar
                              mode='single'
                              selected={
                                paymentDate
                                  ? new Date(paymentDate + 'T00:00:00')
                                  : undefined
                              }
                              onSelect={d => {
                                if (!d) {
                                  setPaymentDate(null);
                                  return;
                                }
                                const s = format(d, 'yyyy-MM-dd');
                                setPaymentDate(s);
                                setExpirationDate(addMonthsLocal(s, 1));
                                clearError('paymentDate');
                                clearError('expirationDate');
                              }}
                              initialFocus
                              className={cn('p-3 pointer-events-auto')}
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.paymentDate && (
                          <p className='text-xs text-destructive'>
                            {errors.paymentDate}
                          </p>
                        )}
                      </div>
                      <div className='space-y-2' data-field='expirationDate'>
                        <Label>Expiration Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type='button'
                              variant='outline'
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !expirationDate && 'text-muted-foreground',
                              )}
                            >
                              <CalendarIcon className='mr-2 h-4 w-4' />
                              {expirationDate
                                ? format(
                                    new Date(expirationDate + 'T00:00:00'),
                                    'PPP',
                                  )
                                : 'Pick expiration date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0' align='start'>
                            <Calendar
                              mode='single'
                              selected={
                                expirationDate
                                  ? new Date(expirationDate + 'T00:00:00')
                                  : undefined
                              }
                              onSelect={d => {
                                setExpirationDate(
                                  d ? format(d, 'yyyy-MM-dd') : null,
                                );
                                clearError('expirationDate');
                              }}
                              initialFocus
                              className={cn('p-3 pointer-events-auto')}
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.expirationDate && (
                          <p className='text-xs text-destructive'>
                            {errors.expirationDate}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })()}

          {!isEdit && !isAdmin && (
            <div className='rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground'>
              <p className='font-medium text-foreground mb-1'>Listing Fee</p>
              <p>
                Your property will be saved as <strong>inactive</strong>. To
                activate and publish it, pay the listing fee from your My
                Listings page:
              </p>
              <ul className='list-disc list-inside mt-1'>
                <li>
                  For Rent:{' '}
                  <strong>
                    {rentFlag.isFree
                      ? 'Free 🎉'
                      : `Rs. ${rentFlag.fee.toLocaleString()}`}
                  </strong>
                  {rentFlag.isFree && rentFlag.promoLabel
                    ? ` — ${rentFlag.promoLabel}`
                    : ''}
                </li>
                <li>
                  For Sale:{' '}
                  <strong>
                    {saleFlag.isFree
                      ? 'Free 🎉'
                      : `Rs. ${saleFlag.fee.toLocaleString()}`}
                  </strong>
                  {saleFlag.isFree && saleFlag.promoLabel
                    ? ` — ${saleFlag.promoLabel}`
                    : ''}
                </li>
              </ul>
            </div>
          )}

          {isEdit && isAdmin && editId && (
            <section className='space-y-3'>
              <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>
                Payment History
              </h2>
              <PaymentHistoryList
                relatedType='property'
                relatedId={editId}
                canEditNotes
                compact
              />
            </section>
          )}

          <div className='flex gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={handleBack}
              className='py-6 text-lg gap-2'
              disabled={loading}
            >
              <ArrowLeft className='h-5 w-5' /> Back
            </Button>
            <Button
              type='submit'
              className='flex-1 bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg'
              disabled={
                loading || atListingLimit || (realtorInactive && !isEdit)
              }
            >
              {loading ? (
                <>
                  <Loader2 className='h-5 w-5 mr-2 animate-spin' />{' '}
                  {isEdit ? 'Updating...' : 'Saving...'}
                </>
              ) : isEdit ? (
                'Update Listing'
              ) : (
                'Save Listing'
              )}
            </Button>
          </div>
        </form>
      </main>
      <Footer />

      <AlertDialog open={confirmBackOpen} onOpenChange={setConfirmBackOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you leave this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on page</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsDirty(false);
                setConfirmBackOpen(false);
                goBack();
              }}
            >
              Discard & leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDeactivateOpen}
        onOpenChange={setConfirmDeactivateOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Your listing will be hidden from buyers. You can reactivate it any
              time
              {expirationDate && new Date(expirationDate) > new Date()
                ? ' for free while your paid period is still valid.'
                : '.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateNow}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reactivatePayOpen} onOpenChange={setReactivatePayOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Reactivate Listing</DialogTitle>
            <DialogDescription>
              Your active period has expired. Pay the listing fee to reactivate{' '}
              <strong>{form.title}</strong> for another month.
            </DialogDescription>
          </DialogHeader>
          <SimulatedPaymentForm
            paid={false}
            onPaymentComplete={completeReactivationPayment}
            amount={(form.listing_type === 'rent' ? rentFlag : saleFlag).fee}
            label={`Listing fee (${form.listing_type === 'rent' ? 'Rental' : 'Sale'})`}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListPropertyPage;
