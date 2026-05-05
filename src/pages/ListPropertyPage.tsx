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
import { Upload, X, Plus, Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NEPAL_CITIES, NEPAL_DISTRICTS, CITY_TO_DISTRICT, getDistrictForCity } from '@/data/nepalLocations';
import SearchableCombobox from '@/components/SearchableCombobox';

const COMMON_FEATURES = [
  'Central AC','Hardwood Floors','Smart Home','Pool','Garage','Fireplace','Walk-in Closets',
  'Granite Countertops','Stainless Steel Appliances','Laundry Room','Fenced Yard','Patio/Deck',
  'Basement','Attic','Solar Panels','Security System',
];

const ListPropertyPage = () => {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
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
    year_built: '0',
    lot_size: '0',
    
    maintenance_fee: '0',
    bike_parking: '0',
    car_parking: '0',
    stories: '0',
  });
  const [paymentDate, setPaymentDate] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);

  useEffect(() => {
    if (!editId || !user) return;
    const fetchProperty = async () => {
      let query = supabase
        .from('user_properties')
        .select('*')
        .eq('id', editId);

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
        title: data.title,
        description: data.description ?? '',
        address: data.address,
        city: data.city,
        district: (data as any).district ?? getDistrictForCity(data.city) ?? '',
        price: String(data.price),
        bedrooms: String(data.bedrooms),
        bathrooms: String(data.bathrooms),
        sqft: data.sqft ? String(data.sqft) : '',
        property_type: data.property_type as 'apartment' | 'commercial' | 'house' | 'land',
        listing_type: data.listing_type,
        year_built: data.year_built ? String(data.year_built) : '',
        lot_size: data.lot_size ? String(data.lot_size) : '',
        
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
      setFetching(false);
    };
    fetchProperty();
  }, [editId, user, navigate]);

  const updateForm = (field: string, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'city') {
        const district = getDistrictForCity(value);
        if (district) updated.district = district;
      }
      if (field === 'district') {
        // Reset city if current city doesn't belong to the new district
        const cityDistrict = getDistrictForCity(prev.city);
        if (cityDistrict !== value) updated.city = '';
      }
      return updated;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + imageFiles.length + files.length;
    if (totalImages > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => setImagePreviews(prev => [...prev, e.target?.result as string]);
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
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature],
    );
  };

  const addCustomFeature = () => {
    if (customFeature.trim() && !selectedFeatures.includes(customFeature.trim())) {
      setSelectedFeatures(prev => [...prev, customFeature.trim()]);
      setCustomFeature('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.title || !form.address || !form.city || !form.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isAdmin) {
      if (!paymentDate || !expirationDate) {
        toast.error('Start date and expiration date are required');
        return;
      }
      if (new Date(paymentDate) >= new Date(expirationDate)) {
        toast.error('Start date must be earlier than expiration date');
        return;
      }
    }
    setLoading(true);
    try {
      const newImageUrls: string[] = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('property-images').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('property-images').getPublicUrl(filePath);
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
        features: selectedFeatures,
        images: allImages,
        maintenance_fee: parseFloat(form.maintenance_fee) || 0,
        bike_parking: parseInt(form.bike_parking) || 0,
        car_parking: parseInt(form.car_parking) || 0,
        stories: parseInt(form.stories) || 0,
        ...(isEdit ? {} : { status: 'pending' as const }),
      };

      if (isEdit) {
        let updateQuery = supabase.from('user_properties').update(payload).eq('id', editId);
        if (!isAdmin) {
          updateQuery = updateQuery.eq('user_id', user.id);
        }
        const { error } = await updateQuery;
        if (error) throw error;
        toast.success('Listing updated successfully!');
      } else {
        const { error } = await supabase.from('user_properties').insert(payload);
        if (error) throw error;
        toast.success('Property saved! Pay the listing fee from My Listings to activate it.');
      }
      navigate('/my-listings');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className='min-h-screen flex flex-col'>
      <Header />
      <main className='flex-1 container py-8 max-w-3xl'>
        <h1 className='font-display text-3xl font-bold text-foreground mb-2'>
          {isEdit ? 'Edit Listing' : 'List Your Property'}
        </h1>
        <p className='text-muted-foreground mb-8'>
          {isEdit ? 'Update the details of your property listing' : 'Fill in the details below to list your property'}
        </p>

        <form onSubmit={handleSubmit} className='space-y-8'>
          {/* Basic Info */}
          <section className='space-y-4'>
            <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>Basic Information</h2>
            <div className='space-y-2'>
              <Label htmlFor='title'>Listing Title *</Label>
              <Input id='title' value={form.title} onChange={e => updateForm('title', e.target.value)} placeholder='e.g. Beautiful Modern Home in Downtown' required />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea id='description' value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder='Describe your property...' rows={4} />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Property Type *</Label>
                <Select value={form.property_type} onValueChange={v => updateForm('property_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Select value={form.listing_type} onValueChange={v => updateForm('listing_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>Location</h2>
            <div className='space-y-2'>
              <Label htmlFor='address'>Street Address *</Label>
              <Input id='address' value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder='e.g. Thamel, Ward No. 26' required />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>City *</Label>
                <SearchableCombobox
                  value={form.city}
                  onValueChange={v => {
                    updateForm('city', v);
                    const dist = getDistrictForCity(v);
                    if (dist) updateForm('district', dist);
                  }}
                  options={NEPAL_CITIES}
                  placeholder="Select City"
                  searchPlaceholder="Search cities..."
                  className="w-full"
                />
              </div>
              <div className='space-y-2'>
                <Label>District</Label>
                <SearchableCombobox
                  value={form.district}
                  onValueChange={v => updateForm('district', v)}
                  options={NEPAL_DISTRICTS}
                  placeholder="Select District"
                  searchPlaceholder="Search districts..."
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* Details */}
          <section className='space-y-4'>
            <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>Property Details</h2>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='price'>Price (Rs.) *</Label>
                <Input id='price' type='number' value={form.price} onChange={e => updateForm('price', e.target.value)} placeholder='450000' required min='0' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='bedrooms'>Bedrooms</Label>
                <Input id='bedrooms' type='number' value={form.bedrooms} onChange={e => updateForm('bedrooms', e.target.value)} min='0' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='bathrooms'>Bathrooms</Label>
                <Input id='bathrooms' type='number' value={form.bathrooms} onChange={e => updateForm('bathrooms', e.target.value)} min='0' step='0.5' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='sqft'>Square Meter</Label>
                <Input id='sqft' type='number' value={form.sqft} onChange={e => updateForm('sqft', e.target.value)} placeholder='200' min='0' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='yearBuilt'>Year Built</Label>
                <Input id='yearBuilt' type='number' value={form.year_built} onChange={e => updateForm('year_built', e.target.value)} placeholder='2020' min='1800' max={new Date().getFullYear()} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='lotSize'>Lot Size (Aana)</Label>
                <Input id='lotSize' type='number' value={form.lot_size} onChange={e => updateForm('lot_size', e.target.value)} placeholder='4' min='0' step='0.01' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='maintenance_fee'>Maintenance Fee (Rs.)</Label>
                <Input id='maintenance_fee' type='number' value={form.maintenance_fee} onChange={e => updateForm('maintenance_fee', e.target.value)} placeholder='0' min='0' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='bike_parking'>Motor Bike Parking</Label>
                <Input id='bike_parking' type='number' value={form.bike_parking} onChange={e => updateForm('bike_parking', e.target.value)} placeholder='0' min='0' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='car_parking'>Car Parking</Label>
                <Input id='car_parking' type='number' value={form.car_parking} onChange={e => updateForm('car_parking', e.target.value)} placeholder='0' min='0' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='stories'>Stories</Label>
                <Input id='stories' type='number' value={form.stories} onChange={e => updateForm('stories', e.target.value)} placeholder='0' min='0' />
              </div>
            </div>
          </section>

          {/* Features */}
          <section className='space-y-4'>
            <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>Features & Amenities</h2>
            <div className='flex flex-wrap gap-2'>
              {COMMON_FEATURES.map(f => (
                <button key={f} type='button' onClick={() => toggleFeature(f)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selectedFeatures.includes(f) ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
                  }`}>{f}</button>
              ))}
            </div>
            <div className='flex gap-2'>
              <Input value={customFeature} onChange={e => setCustomFeature(e.target.value)} placeholder='Add custom feature...'
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomFeature())} />
              <Button type='button' variant='outline' onClick={addCustomFeature} size='icon'><Plus className='h-4 w-4' /></Button>
            </div>
            {selectedFeatures.filter(f => !COMMON_FEATURES.includes(f)).length > 0 && (
              <div className='flex flex-wrap gap-2'>
                {selectedFeatures.filter(f => !COMMON_FEATURES.includes(f)).map(f => (
                  <span key={f} className='px-3 py-1.5 rounded-full text-sm bg-accent text-accent-foreground flex items-center gap-1'>
                    {f}
                    <button type='button' onClick={() => toggleFeature(f)}><X className='h-3 w-3' /></button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Images */}
          <section className='space-y-4'>
            <h2 className='font-display text-xl font-semibold text-foreground border-b border-border pb-2'>Property Photos</h2>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {existingImages.map((src, i) => (
                <div key={`existing-${i}`} className='relative aspect-square rounded-lg overflow-hidden border border-border'>
                  <img src={src} alt='' className='w-full h-full object-cover' />
                  <button type='button' onClick={() => removeExistingImage(i)} className='absolute top-1 right-1 p-1 rounded-full bg-card/80 hover:bg-card'>
                    <X className='h-4 w-4 text-foreground' />
                  </button>
                </div>
              ))}
              {imagePreviews.map((src, i) => (
                <div key={`new-${i}`} className='relative aspect-square rounded-lg overflow-hidden border border-border'>
                  <img src={src} alt='' className='w-full h-full object-cover' />
                  <button type='button' onClick={() => removeImage(i)} className='absolute top-1 right-1 p-1 rounded-full bg-card/80 hover:bg-card'>
                    <X className='h-4 w-4 text-foreground' />
                  </button>
                </div>
              ))}
              {existingImages.length + imageFiles.length < 10 && (
                <label className='aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors'>
                  <Upload className='h-6 w-6 text-muted-foreground mb-1' />
                  <span className='text-xs text-muted-foreground'>Add Photo</span>
                  <input type='file' className='hidden' accept='image/*' multiple onChange={handleImageChange} />
                </label>
              )}
            </div>
            <p className='text-xs text-muted-foreground'>Upload up to 10 photos. First photo will be the cover image.</p>
          </section>

          {!isEdit && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Listing Fee</p>
              <p>Your property will be saved as <strong>inactive</strong>. To activate and publish it, pay the listing fee from your My Listings page:</p>
              <ul className="list-disc list-inside mt-1">
                <li>For Rent: <strong>Rs. 1,000</strong></li>
                <li>For Sale: <strong>Rs. 5,000</strong></li>
              </ul>
            </div>
          )}

          <Button type='submit' className='w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg' disabled={loading}>
            {loading ? (<><Loader2 className='h-5 w-5 mr-2 animate-spin' /> {isEdit ? 'Updating...' : 'Saving...'}</>) : (isEdit ? 'Update Listing' : 'Save Listing')}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default ListPropertyPage;
