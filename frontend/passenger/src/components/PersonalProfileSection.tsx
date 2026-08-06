import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { UserProfileUpdatePayload, GenderType } from '../types';
import {
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Shield,
  CreditCard,
  Globe,
  Camera,
  Save,
  Check,
  Lock,
  Sparkles,
  Heart,
  Calendar,
  Building,
  Navigation
} from 'lucide-react';

export const PersonalProfileSection: React.FC = () => {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile, uploadPhoto } = useProfile();

  const [name, setName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [gender, setGender] = useState<GenderType | ''>('');
  const [dob, setDob] = useState<string>('');

  const [primaryEmail, setPrimaryEmail] = useState<string>('');
  const [secondaryPhone, setSecondaryPhone] = useState<string>('');
  const [secondaryEmail, setSecondaryEmail] = useState<string>('');

  const [addressLine1, setAddressLine1] = useState<string>('');
  const [addressLine2, setAddressLine2] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');

  const [emergencyName, setEmergencyName] = useState<string>('');
  const [emergencyPhone, setEmergencyPhone] = useState<string>('');
  const [emergencyRelationship, setEmergencyRelationship] = useState<string>('');

  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string>('CASH');
  const [upiId, setUpiId] = useState<string>('');
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en');
  const [theme, setTheme] = useState<string>('light');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPrimaryEmail(user.email || '');
    }
    if (profile) {
      setBio(profile.bio || '');
      setGender(profile.gender || '');
      setDob(profile.dob || '');
      setSecondaryPhone(profile.secondary_phone || '');
      setSecondaryEmail(profile.secondary_email || '');
      setAddressLine1(profile.address_line1 || '');
      setAddressLine2(profile.address_line2 || '');
      setCity(profile.city || '');
      setState(profile.state || '');
      setCountry(profile.country || '');
      setPostalCode(profile.postal_code || '');
      setEmergencyName(profile.emergency_contact_name || '');
      setEmergencyPhone(profile.emergency_contact_phone || '');
      setEmergencyRelationship(profile.emergency_contact_relationship || '');
      setDefaultPaymentMethod(profile.default_payment_method || 'CASH');
      setUpiId(profile.upi_id || '');
      setPreferredLanguage(profile.preferred_language || 'en');
      setTheme(profile.theme || 'light');
    }
  }, [user, profile]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be less than 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await uploadPhoto(base64String);
        setIsUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload photo', err);
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: UserProfileUpdatePayload = {
        name,
        bio,
        gender: (gender as GenderType) || undefined,
        dob,
        secondary_phone: secondaryPhone,
        secondary_email: secondaryEmail,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state,
        country,
        postal_code: postalCode,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        emergency_contact_relationship: emergencyRelationship,
        default_payment_method: defaultPaymentMethod,
        upi_id: upiId,
        preferred_language: preferredLanguage,
        theme,
      };

      await updateProfile(payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <span className="animate-pulse font-medium text-xs">Loading profile details...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[22px] p-6 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
      {/* Profile Header & Avatar Upload */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile Avatar"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[#0EA5E9]/30 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#0EA5E9] to-[#0284C7] text-white flex items-center justify-center font-extrabold text-3xl shadow-[0_4px_14px_rgba(14,165,233,0.35)]">
                {name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'P'}
              </div>
            )}
            <label className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white">
              <Camera className="w-6 h-6" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                disabled={isUploadingPhoto}
                className="hidden"
              />
            </label>
            {isUploadingPhoto && (
              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center text-white text-[10px] font-bold">
                Uploading...
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-gray-900 text-xl tracking-tight">{name || 'Passenger Profile'}</h3>
              <span className="text-[10px] font-bold text-[#0284C7] bg-[#E0F2FE] px-2.5 py-0.5 rounded-full border border-[#0EA5E9]/20 uppercase">
                {user?.role || 'PASSENGER'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Complete personal details to unlock instant booking perks
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-200 shadow-sm animate-bounce">
            <Check className="w-4 h-4 text-emerald-600" />
            Profile Updated!
          </span>
        )}
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Basic Personal Information */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-[#0EA5E9]" /> Personal Details
          </h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                placeholder="Your legal full name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as GenderType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
              <div className="relative">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Bio / Headline</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={255}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                placeholder="Short bio or passenger note..."
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="pt-2 border-t border-gray-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-[#0EA5E9]" /> Contact Information
          </h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                <span>Primary Phone (Registered)</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Lock className="w-3 h-3" /> Locked</span>
              </label>
              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs font-semibold">
                <Phone className="w-3.5 h-3.5 text-[#0EA5E9]" />
                <span>{user?.phone || 'Not available'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Email</label>
              <input
                type="email"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                placeholder="primary@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Secondary Phone</label>
              <input
                type="text"
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                placeholder="+91 Alternative Phone"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Secondary Email</label>
              <input
                type="email"
                value={secondaryEmail}
                onChange={(e) => setSecondaryEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                placeholder="secondary@email.com"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Residential Address */}
        <div className="pt-2 border-t border-gray-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#0EA5E9]" /> Residential Address
          </h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Address Line 1</label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                placeholder="House / Apartment No., Street Name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Address Line 2</label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                placeholder="Landmark, Area"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                placeholder="e.g. Bangalore, Mumbai"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">State / Province</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                placeholder="e.g. Karnataka"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                placeholder="560001"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Emergency Contacts & Payment Options */}
        <div className="pt-2 border-t border-gray-100">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Emergency Contacts */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-500" /> Emergency SOS Contact
              </h4>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                  placeholder="e.g. Spouse / Parent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship</label>
                <input
                  type="text"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                  placeholder="e.g. Brother, Friend"
                />
              </div>
            </div>

            {/* Payment & UPI Preferences */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Payment & UPI Options
              </h4>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Payment Method</label>
                <select
                  value={defaultPaymentMethod}
                  onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                >
                  <option value="CASH">Cash Payment</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="UPI">UPI AutoPay</option>
                  <option value="WALLET">Bid2Ride Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] bg-white"
                  placeholder="username@upi"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-white font-extrabold text-xs flex items-center gap-2 shadow-[0_4px_14px_rgba(14,165,233,0.35)] transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Changes...' : 'Save Personal Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};
