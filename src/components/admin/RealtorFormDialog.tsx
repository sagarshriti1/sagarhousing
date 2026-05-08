import { useEffect, useRef, useState } from 'react';
import { format, addMonths } from 'date-fns';
import { CalendarIcon, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
}

const getLocalTodayStr = () => format(new Date(), 'yyyy-MM-dd');
const addMonthsLocal = (dateStr: string, months: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return format(addMonths(date, months), 'yyyy-MM-dd');
};

const buildEmptyRealtor = (): RealtorFormData => ({
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
  start_date: getLocalTodayStr(),
  expiration_date: addMonthsLocal(getLocalTodayStr(), 1),
  payment_status: 'pending',
  payment_bypassed: false,
  user_id: null,
});

const RealtorFormDialog = ({
  open,
  onOpenChange,
  realtor,
  onSave,
  mode,
}: any) => {
  const isCreate = mode === 'create';
  const { fee: realtorFee } = useFeatureFlag(
    isCreate ? FEATURE_KEYS.REALTOR_SIGNUP : FEATURE_KEYS.REALTOR_RENEWAL,
  );
  const [form, setForm] = useState<RealtorFormData>(
    realtor ?? buildEmptyRealtor(),
  );
  const [bypassPayment, setBypassPayment] = useState(
    realtor?.payment_bypassed ?? false,
  );

  useEffect(() => {
    if (open) setForm(realtor ?? buildEmptyRealtor());
  }, [open, realtor]);

  const handleBypassToggle = (checked: boolean) => {
    setBypassPayment(checked);
    const now = getLocalTodayStr();
    setForm(prev => ({
      ...prev,
      payment_bypassed: checked,
      payment_status: checked ? 'bypassed' : 'pending',
      start_date: checked ? now : prev.start_date,
      expiration_date: checked ? addMonthsLocal(now, 1) : prev.expiration_date,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {isCreate ? 'Create Realtor' : 'Edit Realtor'}
          </DialogTitle>
        </DialogHeader>
        <div className='space-y-6'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>City</Label>
              <Select
                value={form.city}
                onValueChange={v =>
                  setForm({
                    ...form,
                    city: v,
                    district: getDistrictForCity(v) || '',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
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
          </div>
          <Accordion type='multiple' defaultValue={[]} className='w-full'>
            <AccordionItem value='payment' className='border rounded-lg px-4'>
              <AccordionTrigger>Subscription & Payment</AccordionTrigger>
              <AccordionContent className='space-y-4 pt-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type='date'
                      value={form.start_date || ''}
                      onChange={e =>
                        setForm({ ...form, start_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Expiration Date</Label>
                    <Input
                      type='date'
                      value={form.expiration_date || ''}
                      onChange={e =>
                        setForm({ ...form, expiration_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className='flex items-center justify-between p-4 bg-muted rounded-lg'>
                  <div className='flex items-center gap-2'>
                    <Checkbox
                      checked={bypassPayment}
                      onCheckedChange={c => handleBypassToggle(!!c)}
                    />
                    <Label>Bypass Payment</Label>
                  </div>
                  <Badge
                    variant={
                      form.payment_status === 'paid' ? 'default' : 'secondary'
                    }
                  >
                    {form.payment_status}
                  </Badge>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onSave(form)}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RealtorFormDialog;
