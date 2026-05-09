import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedRealtors } from '@/hooks/useSavedRealtors';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Star,
  Award,
  Plus,
  Check,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

interface Realtor {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  city: string;
  district: string;
  bio: string | null;
  specialties: string[] | null;
  years_experience: number | null;
  is_featured: boolean;
  featured_expiration_date?: string | null;
}

const FindRealtors = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useSavedRealtors();
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  const [hybridSearch, setHybridSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealtors = async () => {
      setLoading(true);

      let query = supabase
        .from('realtors')
        .select('*')
        .order('is_featured', { ascending: false })
        .limit(6);

      if (hybridSearch.trim()) {
        const matchStr = `%${hybridSearch.trim()}%`;
        query = query.or(
          `name.ilike.${matchStr},city.ilike.${matchStr},district.ilike.${matchStr}`,
        );
      }

      const { data } = await query;
      const today = new Date(new Date().toDateString());

      const userIds = data?.map(r => r.user_id).filter(Boolean) || [];
      const profilesMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, avatar_url')
          .in('user_id', userIds);
        profilesData?.forEach(p => {
          if (p.avatar_url) profilesMap[p.user_id] = p.avatar_url;
        });
      }

      const normalized = (data ?? []).map((r: any) => ({
        ...r,
        photo_url: r.photo_url || (r.user_id ? profilesMap[r.user_id] : null),
        is_featured:
          r.is_featured &&
          (!r.featured_expiration_date ||
            new Date(r.featured_expiration_date + 'T00:00:00') >= today),
      }));

      setRealtors(normalized);
      setLoading(false);
    };

    const debounce = setTimeout(fetchRealtors, 300);
    return () => clearTimeout(debounce);
  }, [hybridSearch]);

  return (
    <section className='bg-slate-50/50 py-12 md:py-16'>
      <div className='container px-4'>
        {/* HEADER & SEARCH SECTION - Left Aligned Stack */}
        <div className='flex flex-col items-start space-y-6 mb-10'>
          <div className='space-y-1'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground'>
              Find Local <span className='text-[#FF6B00]'>Realtors</span>
            </h2>
            {/* Restored original verbiage */}
            <p className='text-muted-foreground mt-1'>
              Connect with experienced agents in your area
            </p>
          </div>

          <div className='relative w-full max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search by Name, City, or District...'
              className='pl-10 h-12 bg-white border-slate-200 focus-visible:ring-[#FF6B00] shadow-sm text-base'
              value={hybridSearch}
              onFocus={e => e.target.select()}
              onChange={e => setHybridSearch(e.target.value)}
            />
          </div>
        </div>

        {/* RESULTS GRID */}
        {loading ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className='bg-white rounded-xl border p-6 animate-pulse h-48'
              />
            ))}
          </div>
        ) : realtors.length === 0 ? (
          <div className='text-center py-16 bg-white rounded-xl border border-dashed border-slate-300'>
            <MapPin className='h-12 w-12 mx-auto text-slate-300 mb-3' />
            <p className='text-slate-600 text-lg font-medium'>
              No matches found for "{hybridSearch}"
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {realtors.map(realtor => (
              <Link
                to={`/realtor/${realtor.id}`}
                key={realtor.id}
                className={`bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-all block relative ${realtor.is_featured ? 'border-[#FF6B00] ring-1 ring-[#FF6B00]/20' : 'border-slate-200'}`}
              >
                <div className='flex items-center gap-4 mb-4'>
                  <div className='h-16 w-16 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-50'>
                    {realtor.photo_url ? (
                      <img
                        src={realtor.photo_url}
                        alt={realtor.name}
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <div className='h-full w-full flex items-center justify-center text-xl font-bold text-slate-300'>
                        <User className='h-8 w-8' />
                      </div>
                    )}
                  </div>
                  <div className='min-w-0'>
                    <h3 className='text-lg font-bold text-slate-900 truncate'>
                      {realtor.name}
                    </h3>
                    <p className='flex items-center gap-1 text-sm text-slate-500'>
                      <MapPin className='h-3.5 w-3.5 shrink-0 text-[#FF6B00]' />
                      <span className='truncate'>
                        {realtor.city}
                        {realtor.district ? `, ${realtor.district}` : ''}
                      </span>
                    </p>
                  </div>
                </div>

                <p className='text-sm text-slate-600 line-clamp-2 mb-4 h-10'>
                  {realtor.bio || 'Helping you find your dream home in Nepal.'}
                </p>

                <div className='flex items-center justify-between pt-4 border-t border-slate-100'>
                  <span className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                    View Profile
                  </span>
                  <ChevronRight className='h-4 w-4 text-[#FF6B00]' />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FindRealtors;
