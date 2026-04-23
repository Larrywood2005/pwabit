'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, X, Upload } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface KYCModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onSuccess?: () => void;
}

export default function KYCModal({ isOpen, onClose, balance, onSuccess }: KYCModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    identityPhoto: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for simplicity
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          identityPhoto: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.dateOfBirth || !formData.identityPhoto) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await apiClient.submitKYC({
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        identityPhoto: formData.identityPhoto
      });

      toast({
        title: 'Success',
        description: 'KYC submitted successfully. Admin will review your documents.',
        variant: 'default'
      });

      setFormData({ fullName: '', dateOfBirth: '', identityPhoto: '' });
      setStep(1);
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('[v0] KYC submission error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit KYC',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">KYC Verification</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Alert */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-semibold text-amber-700">Large Balance Detected</p>
              <p className="text-xs text-amber-600 mt-1">
                Your balance exceeds $300. KYC verification is required to withdraw funds. Typically reviewed within 4 hours.
              </p>
            </div>
          </div>

          {step === 1 ? (
            <>
              {/* Step 1: Information */}
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identityPhoto">Identity Document Photo</Label>
                  <label
                    htmlFor="identityPhoto"
                    className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="text-center">
                      <Upload size={20} className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        {formData.identityPhoto ? 'File uploaded' : 'Click to upload'}
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                    </div>
                    <input
                      id="identityPhoto"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Skip for Now
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  className="flex-1"
                  disabled={loading || !formData.fullName || !formData.dateOfBirth}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Review */}
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold text-foreground mb-2">Verification Summary</p>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground">{formData.fullName}</span></p>
                    <p><span className="text-muted-foreground">DOB:</span> <span className="font-medium text-foreground">{new Date(formData.dateOfBirth).toLocaleDateString()}</span></p>
                    <p><span className="text-muted-foreground">Document:</span> <span className="font-medium text-foreground">Uploaded</span></p>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="text-blue-600 flex-shrink-0" size={16} />
                  <p className="text-xs text-blue-600">
                    Your documents will be reviewed by our team within 24 hours. You&apos;ll receive an email with the decision.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit KYC'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
