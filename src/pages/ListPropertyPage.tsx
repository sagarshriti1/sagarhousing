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
  CreditCard,
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
import { format } from 'date-fns';
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

const ListPropertyPage = () => {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
  const saleFlag = useFeatureFlag(FEATURE_KEYS.PROPERTY_SALE);
  const rentFlag = useFeatureFlag(FEATURE_KEYS.PROPERTY_RENT);
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

  const addMonthsStr = (s: string, m: number) => {
    const d = new Date(s);
    d.setMonth(d.getMonth() + m);
    return format(d, 'yyyy-MM-dd');
  };

  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const [paymentDate, setPaymentDate] = useState<string | null>(
    isAdmin && !isEdit ? todayDateStr : null,
  );
  const [expirationDate, setExpirationDate] = useState<string | null>(
    isAdmin && !isEdit ? addMonthsStr(todayDateStr, 1) : null,
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
  const [isDirty, setIsDirty] = useState(false);
  const [confirmBackOpen, setConfirmBackOpen] = useState(false);

  const FREE_USER_LISTING_LIMIT = 2;
  const isRealtor = role === 'realtor';
  const isStandardUser = !!user && !isRealtor && role !== 'admin';
  const [existingListingCount, setExistingListingCount] = useState<
    number | null
  >(null);
  const atListingLimit =
    isStandardUser &&
    !isEdit &&
    existingListingCount !== null &&
    existingListingCount >= FREE_USER_LISTING_LIMIT;
  const limitMessage = `You've reached the ${FREE_USER_LISTING_LIMIT}-listing limit for standard accounts. Delete an existing listing or upgrade to a Realtor account to post more.`;

  const [realtorInactive, setRealtorInactive] = useState(false);
  const realtorInactiveMessage =
    'Your Realtor profile is inactive or expired. Please renew your Realtor subscription before posting new listings.';

  const clearError = (k: string) =>
    setErrors(prev => {
      if (!prev[k]) return prev;
      const { [k]: _, ...rest } = prev;
      return rest;
    });

  useEffect(() => {
    if (!user || isEdit || !isStandardUser) return;
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
  }, [user, isEdit, isStandardUser]);

  useEffect(() => {
    if (!user || !isRealtor || isEdit) return;
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
  }, [user, isRealtor, isEdit]);

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
    else navigate(-1);
  };
  const handleBack = () => {
    if (isDirty) setConfirmBackOpen(true);
    else goBack();
  };

  useEffect(() => {
    if (!editId || !user) return;
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
      setPaymentDate(pd ? format(new Date(pd), 'yyyy-MM-dd') : null);
      setExpirationDate(ed ? format(new Date(ed), 'yyyy-MM-dd') : null);
      setPropertyCode((data as any).property_code ?? null);
      setCurrentStatus(((data as any).status ?? 'pending') as any);
      setFetching(false);
    };
    fetchProperty();
  }, [editId, user, navigate, isAdmin]);

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
    const now = new Date();
    const expiration = new Date(now);
    expiration.setMonth(expiration.getMonth() + 1);

    // Standardize dates to local YYYY-MM-DD strings for consistent logic
    const startDate = format(now, 'yyyy-MM-dd');
    const expiryDate = format(expiration, 'yyyy-MM-dd');

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

    if (!isEdit && isStandardUser) {
      const { count } = await supabase
        .from('user_properties')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if ((count ?? 0) >= FREE_USER_LISTING_LIMIT) {
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
          isAdmin ? 'Property created and activated!' : 'Property saved!',
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

  if (fetching) {
    return (
      <div className='min-h-screen flex flex-col'>
        <Header />
        <main className='flex-1 flex items-center justify-center text-muted-foreground'>
          Loading...
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
                  Active until {format(new Date(expirationDate), 'MMM d, yyyy')}
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
              <div className='space-y-2'>
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
                  onChange={e => updateForm('price', e.target.value)}
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
                  onChange={e => updateForm('bathrooms', e.target.value)}
                  min='0'
                  step='0.5'
                />
              </div>
            </div>
          </section>

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
          </section>

          {isAdmin && (
            <section className='space-y-4'>
              <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>
                Subscription & Payment
              </h2>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
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
                          ? format(new Date(paymentDate), 'PPP')
                          : 'Pick start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0' align='start'>
                      <Calendar
                        mode='single'
                        selected={
                          paymentDate ? new Date(paymentDate) : undefined
                        }
                        onSelect={d => {
                          if (!d) {
                            setPaymentDate(null);
                            return;
                          }
                          const s = format(d, 'yyyy-MM-dd');
                          setPaymentDate(s);
                          setExpirationDate(addMonthsStr(s, 1));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className='space-y-2'>
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
                          ? format(new Date(expirationDate), 'PPP')
                          : 'Pick expiration date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0' align='start'>
                      <Calendar
                        mode='single'
                        selected={
                          expirationDate ? new Date(expirationDate) : undefined
                        }
                        onSelect={d => {
                          setExpirationDate(d ? format(d, 'yyyy-MM-dd') : null);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
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
              Your listing will be hidden from buyers.
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
              Pay the listing fee to reactivate <strong>{form.title}</strong>{' '}
              for another month.
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
