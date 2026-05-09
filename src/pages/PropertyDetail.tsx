import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bed,
  Bath,
  Maximize,
  MapPin,
  Calendar,
  Phone,
  MessageSquare,
  Share2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImg, setCurrentImg] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_properties')
        .select('*, profiles(display_name, phone, avatar_url)')
        .eq('id', id)
        .maybeSingle();

      if (data) setProperty(data);
      setLoading(false);
    };
    fetchProperty();
  }, [id]);

  if (loading)
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
      </div>
    );

  if (!property)
    return (
      <div className='min-h-screen flex flex-col'>
        <Header />
        <main className='flex-1 container py-20 text-center'>
          <h2 className='text-2xl font-bold'>Property not found</h2>
          <Button onClick={() => navigate('/')} className='mt-4'>
            Go Home
          </Button>
        </main>
        <Footer />
      </div>
    );

  return (
    <div className='min-h-screen flex flex-col bg-slate-50/30'>
      <Header />
      <main className='flex-1'>
        {/* MOBILE FIX: Reduce top padding on small screens */}
        <div className='container py-4 md:py-8 space-y-6 px-4'>
          <div className='flex items-center gap-2 mb-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => navigate(-1)}
              className='px-0'
            >
              <ChevronLeft className='h-4 w-4 mr-1' /> Back
            </Button>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {/* LEFT SIDE: Images & Description (Takes 2/3 space on Desktop) */}
            <div className='lg:col-span-2 space-y-6'>
              {/* IMAGE CAROUSEL: Fully responsive */}
              <div className='relative aspect-[4/3] md:aspect-video rounded-xl overflow-hidden bg-black shadow-lg'>
                <img
                  src={property.images?.[currentImg]}
                  className='w-full h-full object-contain'
                  alt={property.title}
                />
                {property.images?.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentImg(prev =>
                          prev > 0 ? prev - 1 : property.images.length - 1,
                        )
                      }
                      className='absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow hover:bg-white'
                    >
                      <ChevronLeft className='h-5 w-5' />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImg(prev =>
                          prev < property.images.length - 1 ? prev + 1 : 0,
                        )
                      }
                      className='absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow hover:bg-white'
                    >
                      <ChevronRight className='h-5 w-5' />
                    </button>
                    <div className='absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs'>
                      {currentImg + 1} / {property.images.length}
                    </div>
                  </>
                )}
              </div>

              {/* STATS BAR: Grid stacks on mobile */}
              <div className='grid grid-cols-3 gap-4 py-4 border-y bg-white rounded-lg px-4'>
                <div className='flex flex-col items-center justify-center border-r'>
                  <Bed className='h-5 w-5 text-muted-foreground mb-1' />
                  <span className='font-bold text-sm md:text-base'>
                    {property.bedrooms}
                  </span>
                  <span className='text-[10px] uppercase text-muted-foreground'>
                    Beds
                  </span>
                </div>
                <div className='flex flex-col items-center justify-center border-r'>
                  <Bath className='h-5 w-5 text-muted-foreground mb-1' />
                  <span className='font-bold text-sm md:text-base'>
                    {property.bathrooms}
                  </span>
                  <span className='text-[10px] uppercase text-muted-foreground'>
                    Baths
                  </span>
                </div>
                <div className='flex flex-col items-center justify-center'>
                  <Maximize className='h-5 w-5 text-muted-foreground mb-1' />
                  <span className='font-bold text-sm md:text-base'>
                    {property.sqft?.toLocaleString()}
                  </span>
                  <span className='text-[10px] uppercase text-muted-foreground'>
                    Sq Ft
                  </span>
                </div>
              </div>

              <div>
                <h1 className='text-2xl md:text-3xl font-bold text-foreground leading-tight'>
                  {property.title}
                </h1>
                <div className='flex items-center gap-2 text-muted-foreground mt-2'>
                  <MapPin className='h-4 w-4 shrink-0' />
                  <span className='text-sm'>
                    {property.address}, {property.city}, {property.district}
                  </span>
                </div>
              </div>

              <div className='space-y-3'>
                <h3 className='text-lg font-semibold'>About this property</h3>
                <p className='text-muted-foreground whitespace-pre-line text-sm md:text-base leading-relaxed'>
                  {property.description}
                </p>
              </div>
            </div>

            {/* RIGHT SIDE: Contact & Price (Stacks below on mobile) */}
            <div className='space-y-6'>
              <Card className='sticky top-24 border-none shadow-xl bg-primary text-primary-foreground'>
                <CardContent className='p-6 space-y-4'>
                  <div className='space-y-1'>
                    <p className='text-sm opacity-80 uppercase font-semibold tracking-wider'>
                      Price
                    </p>
                    <h2 className='text-3xl md:text-4xl font-bold'>
                      Rs. {Number(property.price).toLocaleString()}
                    </h2>
                    <Badge variant='secondary' className='mt-2 capitalize'>
                      {property.listing_type === 'sale'
                        ? 'For Sale'
                        : 'For Rent'}
                    </Badge>
                  </div>

                  <div className='pt-4 border-t border-white/20 space-y-3'>
                    <Button
                      variant='secondary'
                      className='w-full gap-2 h-12 font-bold'
                      onClick={() =>
                        window.open(`tel:${property.profiles?.phone}`)
                      }
                    >
                      <Phone className='h-4 w-4' /> Call Agent
                    </Button>
                    <Button
                      variant='outline'
                      className='w-full gap-2 h-12 bg-white/10 border-white/30 hover:bg-white/20 text-white'
                    >
                      <MessageSquare className='h-4 w-4' /> WhatsApp Inquiry
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* SELLER PROFILE INFO */}
              <Card>
                <CardContent className='p-6'>
                  <div className='flex items-center gap-4'>
                    <div className='h-12 w-12 rounded-full overflow-hidden bg-muted'>
                      {property.profiles?.avatar_url ? (
                        <img
                          src={property.profiles.avatar_url}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='h-full w-full flex items-center justify-center bg-primary text-white font-bold'>
                          {property.profiles?.display_name?.[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className='font-bold text-foreground'>
                        {property.profiles?.display_name}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Listing Agent
                      </p>
                    </div>
                  </div>
                  <div className='mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground'>
                    <div className='flex items-center gap-1'>
                      <Calendar className='h-3 w-3' /> Listed on{' '}
                      {format(new Date(property.created_at), 'MMM d')}
                    </div>
                    <div className='flex items-center gap-1'>
                      <Share2 className='h-3 w-3' /> Share
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PropertyDetail;
