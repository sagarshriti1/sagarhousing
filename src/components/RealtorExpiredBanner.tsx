import { useState } from "react";
import { AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SimulatedPaymentForm from "@/components/SimulatedPaymentForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RealtorExpiredBannerProps {
  realtorId: string;
  onRenewed: () => void;
}

const RENEWAL_FEE = 5000;

const RealtorExpiredBanner = ({ realtorId, onRenewed }: RealtorExpiredBannerProps) => {
  const [showPayment, setShowPayment] = useState(false);
  const [paid, setPaid] = useState(false);

  const handlePaymentComplete = async () => {
    const now = new Date();
    const expiration = new Date(now);
    expiration.setMonth(expiration.getMonth() + 1);

    const { error } = await supabase
      .from("realtors")
      .update({
        payment_status: "paid",
        start_date: now.toISOString().split("T")[0],
        expiration_date: expiration.toISOString().split("T")[0],
      })
      .eq("id", realtorId);

    if (error) {
      toast.error("Failed to renew subscription");
      return;
    }

    setPaid(true);
    toast.success("Subscription renewed! Redirecting...");
    setTimeout(() => onRenewed(), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
          <CardTitle className="text-xl">Subscription Expired</CardTitle>
          <CardDescription>
            Your realtor profile subscription has expired. Please renew to continue accessing your dashboard and appear in the directory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPayment && !paid && (
            <Button onClick={() => setShowPayment(true)} className="w-full gap-2">
              <CreditCard className="h-4 w-4" />
              Renew Subscription — Rs. {RENEWAL_FEE.toLocaleString()}/month
            </Button>
          )}
          {showPayment && (
            <SimulatedPaymentForm
              paid={paid}
              onPaymentComplete={handlePaymentComplete}
              amount={RENEWAL_FEE}
              label="Realtor monthly subscription"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealtorExpiredBanner;
