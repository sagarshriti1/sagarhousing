import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, CheckCircle2 } from "lucide-react";

interface SimulatedPaymentFormProps {
  paid: boolean;
  onPaymentComplete: () => void;
  amount?: number;
  label?: string;
}

const SimulatedPaymentForm = ({
  paid,
  onPaymentComplete,
  amount = 5000,
  label = "Realtor listing fee",
}: SimulatedPaymentFormProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [processing, setProcessing] = useState(false);

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const isValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.length === 5 &&
    cvc.length >= 3 &&
    cardName.length > 0;

  const handlePay = async () => {
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setProcessing(false);
    onPaymentComplete();
  };

  if (paid) {
    return (
      <div className="p-4 rounded-md border border-border bg-background text-center space-y-2">
        <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
        <p className="text-sm font-medium text-foreground">Payment Complete</p>
        <p className="text-xs text-muted-foreground">{label} has been paid</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Lock className="h-4 w-4 text-muted-foreground" />
        Simulated Payment — Rs. {amount.toLocaleString()}
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Cardholder Name</Label>
          <Input
            placeholder="John Doe"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Card Number</Label>
          <Input
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            maxLength={19}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Expiry</Label>
            <Input
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              maxLength={5}
            />
          </div>
          <div>
            <Label className="text-xs">CVC</Label>
            <Input
              placeholder="123"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
            />
          </div>
        </div>
      </div>
      <Button
        className="w-full gap-2"
        onClick={handlePay}
        disabled={!isValid || processing}
      >
        <CreditCard className="h-4 w-4" />
        {processing ? "Processing..." : `Pay Rs. ${amount.toLocaleString()}`}
      </Button>
      <p className="text-[10px] text-center text-muted-foreground">
        This is a simulated payment. No real charges will be made.
      </p>
    </div>
  );
};

export default SimulatedPaymentForm;
