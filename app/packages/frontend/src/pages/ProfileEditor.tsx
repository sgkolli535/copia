import React, { useState, useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import type { UserProfile, Residency, Asset, FamilyMember, CountryCode, CurrencyCode, AssetClass, OwnershipType, RelationshipType } from '@copia/types';
import { profileAtom, planAtom, loadingAtom, errorAtom, narrationAtom, narrationLoadingAtom } from '../store/atoms';
import { api } from '../api/client';
import { emitEvent } from '../store/analytics';
import Button from '../components/Button';

// ---- Golden Persona ----

function buildGoldenPersona(): UserProfile {
  const profileId = crypto.randomUUID();
  const spouseId = crypto.randomUUID();
  const flatId = crypto.randomUUID();
  const brokerageId = crypto.randomUUID();

  return {
    id: profileId,
    name: 'Marcus Chen',
    age: 52,
    citizenships: ['US'] as CountryCode[],
    residencies: [
      {
        country: 'GB' as CountryCode,
        daysPresent: 250,
        isDomiciled: true,
        yearsResident: 12,
        status: 'Settled',
      },
    ],
    assets: [
      {
        id: flatId,
        name: 'London Flat (Kensington)',
        assetClass: 'immovable_property' as AssetClass,
        spikeLocation: 'GB' as CountryCode,
        value: 1_100_000,
        currency: 'GBP' as CurrencyCode,
        costBasis: 650_000,
        ownershipType: 'sole' as OwnershipType,
        ownershipFraction: 1,
        dateAcquired: '2015-03-15',
        notes: 'Primary residence in London',
      },
      {
        id: brokerageId,
        name: 'US Brokerage Account',
        assetClass: 'shares' as AssetClass,
        spikeLocation: 'US' as CountryCode,
        value: 2_500_000,
        currency: 'USD' as CurrencyCode,
        costBasis: 1_200_000,
        ownershipType: 'sole' as OwnershipType,
        ownershipFraction: 1,
        dateAcquired: '2008-07-20',
        notes: 'Diversified equity portfolio held at Schwab',
      },
    ],
    family: [
      {
        id: spouseId,
        name: 'Priya Sharma',
        relationship: 'spouse' as RelationshipType,
        citizenships: ['IN'] as CountryCode[],
        residency: {
          country: 'GB' as CountryCode,
          daysPresent: 250,
          isDomiciled: false,
          yearsResident: 10,
          status: 'Non-domiciled',
        },
        isBeneficiary: true,
        age: 48,
      },
    ],
    reportingCurrency: 'USD' as CurrencyCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---- Collapsible Section ----

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="font-display text-lg font-semibold text-forest-900">{title}</h3>
        <svg
          className={[
            'w-5 h-5 text-forest-400 transition-transform duration-200',
            open ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

// ---- Field Helpers ----

interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

function Field({ label, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className="block font-sans text-xs uppercase tracking-wider text-forest-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2 bg-white border border-cream-200 rounded-institutional font-sans text-sm text-forest-800 placeholder-forest-300 focus:outline-none focus:ring-2 focus:ring-forest-300 focus:border-forest-400 transition-colors';

const selectClass =
  'w-full px-3 py-2 bg-white border border-cream-200 rounded-institutional font-sans text-sm text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-300 focus:border-forest-400 transition-colors';

// ---- Main Component ----

export default function ProfileEditor() {
  const [profile, setProfile] = useAtom(profileAtom);
  const setPlan = useSetAtom(planAtom);
  const setNarration = useSetAtom(narrationAtom);
  const setNarrationLoading = useSetAtom(narrationLoadingAtom);
  const setLoading = useSetAtom(loadingAtom);
  const setError = useSetAtom(errorAtom);
  const [saving, setSaving] = useState(false);

  // Local form state -- starts from profile atom or empty
  const [formData, setFormData] = useState<UserProfile | null>(profile);

  const loadGoldenPersona = useCallback(() => {
    const persona = buildGoldenPersona();
    setFormData(persona);
  }, []);

  const updateField = useCallback(
    <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
      setFormData((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: value, updatedAt: new Date().toISOString() };
      });
    },
    [],
  );

  const updateResidency = useCallback(
    (index: number, field: keyof Residency, value: string | number | boolean) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const residencies = [...prev.residencies];
        residencies[index] = { ...residencies[index]!, [field]: value } as Residency;
        return { ...prev, residencies, updatedAt: new Date().toISOString() };
      });
    },
    [],
  );

  const addResidency = useCallback(() => {
    setFormData((prev) => {
      if (!prev) return prev;
      const newResidency: Residency = {
        country: 'US',
        daysPresent: 0,
        isDomiciled: false,
        yearsResident: 0,
        status: '',
      };
      return { ...prev, residencies: [...prev.residencies, newResidency], updatedAt: new Date().toISOString() };
    });
  }, []);

  const removeResidency = useCallback((index: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const residencies = prev.residencies.filter((_, i) => i !== index);
      return { ...prev, residencies, updatedAt: new Date().toISOString() };
    });
  }, []);

  const updateAsset = useCallback(
    (index: number, field: keyof Asset, value: string | number) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const assets = [...prev.assets];
        assets[index] = { ...assets[index]!, [field]: value } as Asset;
        return { ...prev, assets, updatedAt: new Date().toISOString() };
      });
    },
    [],
  );

  const addAsset = useCallback(() => {
    setFormData((prev) => {
      if (!prev) return prev;
      const newAsset: Asset = {
        id: crypto.randomUUID(),
        name: '',
        assetClass: 'shares',
        spikeLocation: 'US',
        value: 0,
        currency: 'USD',
        costBasis: 0,
        ownershipType: 'sole',
        ownershipFraction: 1,
        dateAcquired: new Date().toISOString().split('T')[0]!,
        notes: '',
      };
      return { ...prev, assets: [...prev.assets, newAsset], updatedAt: new Date().toISOString() };
    });
  }, []);

  const removeAsset = useCallback((index: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const assets = prev.assets.filter((_, i) => i !== index);
      return { ...prev, assets, updatedAt: new Date().toISOString() };
    });
  }, []);

  const updateFamilyMember = useCallback(
    (index: number, field: string, value: unknown) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const family = [...prev.family];
        const member = { ...family[index]! };

        if (field === 'citizenships') {
          member.citizenships = value as CountryCode[];
        } else if (field === 'residency.country') {
          member.residency = member.residency
            ? { ...member.residency, country: value as CountryCode }
            : { country: value as CountryCode, daysPresent: 0, isDomiciled: false, yearsResident: 0, status: '' };
        } else if (field === 'residency.daysPresent') {
          member.residency = member.residency
            ? { ...member.residency, daysPresent: value as number }
            : { country: 'US', daysPresent: value as number, isDomiciled: false, yearsResident: 0, status: '' };
        } else if (field === 'residency.isDomiciled') {
          member.residency = member.residency
            ? { ...member.residency, isDomiciled: value as boolean }
            : { country: 'US', daysPresent: 0, isDomiciled: value as boolean, yearsResident: 0, status: '' };
        } else if (field === 'residency.yearsResident') {
          member.residency = member.residency
            ? { ...member.residency, yearsResident: value as number }
            : { country: 'US', daysPresent: 0, isDomiciled: false, yearsResident: value as number, status: '' };
        } else if (field === 'residency.status') {
          member.residency = member.residency
            ? { ...member.residency, status: value as string }
            : { country: 'US', daysPresent: 0, isDomiciled: false, yearsResident: 0, status: value as string };
        } else {
          (member as Record<string, unknown>)[field] = value;
        }

        family[index] = member as FamilyMember;
        return { ...prev, family, updatedAt: new Date().toISOString() };
      });
    },
    [],
  );

  const addFamilyMember = useCallback(() => {
    setFormData((prev) => {
      if (!prev) return prev;
      const newMember: FamilyMember = {
        id: crypto.randomUUID(),
        name: '',
        relationship: 'spouse',
        citizenships: ['US'],
        residency: null,
        isBeneficiary: true,
        age: 30,
      };
      return { ...prev, family: [...prev.family, newMember], updatedAt: new Date().toISOString() };
    });
  }, []);

  const removeFamilyMember = useCallback((index: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const family = prev.family.filter((_, i) => i !== index);
      return { ...prev, family, updatedAt: new Date().toISOString() };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData) return;

    setSaving(true);
    setLoading(true);
    setError(null);

    try {
      setProfile(formData);

      emitEvent({
        type: 'profile_created',
        timestamp: new Date().toISOString(),
        sessionId: 'prototype',
        jurisdictionCount: new Set([
          ...formData.residencies.map((r) => r.country),
          ...formData.citizenships,
          ...formData.assets.map((a) => a.spikeLocation),
        ]).size,
        assetCount: formData.assets.length,
        familyMemberCount: formData.family.length,
      });

      const startTime = Date.now();
      const result = await api.computePlan(formData);
      const computeTimeMs = Date.now() - startTime;

      setPlan(result);

      // Kick off AI narration in background (non-blocking)
      setNarration(null);
      setNarrationLoading(true);
      api.narratePlan(result).then(
        (text) => { setNarration(text); setNarrationLoading(false); },
        () => { setNarrationLoading(false); },
      );

      emitEvent({
        type: 'plan_computed',
        timestamp: new Date().toISOString(),
        sessionId: 'prototype',
        jurisdictions: [...new Set(result.liabilities.map((l) => l.jurisdiction))],
        totalExposure: result.totalExposure,
        conflictCount: result.conflicts.length,
        computeTimeMs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute estate plan');
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }, [formData, setProfile, setPlan, setNarration, setNarrationLoading, setLoading, setError]);

  const countryOptions: { value: CountryCode; label: string }[] = [
    { value: 'US', label: 'United States' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'IN', label: 'India' },
    { value: 'PT', label: 'Portugal' },
  ];

  const currencyOptions: { value: CurrencyCode; label: string }[] = [
    { value: 'USD', label: 'USD' },
    { value: 'GBP', label: 'GBP' },
    { value: 'INR', label: 'INR' },
    { value: 'EUR', label: 'EUR' },
  ];

  const assetClassOptions: { value: AssetClass; label: string }[] = [
    { value: 'immovable_property', label: 'Immovable Property' },
    { value: 'shares', label: 'Shares' },
    { value: 'bonds', label: 'Bonds' },
    { value: 'bank_deposits', label: 'Bank Deposits' },
    { value: 'business_property', label: 'Business Property' },
    { value: 'personal_property', label: 'Personal Property' },
    { value: 'pension', label: 'Pension' },
    { value: 'life_insurance', label: 'Life Insurance' },
    { value: 'other', label: 'Other' },
  ];

  const ownershipOptions: { value: OwnershipType; label: string }[] = [
    { value: 'sole', label: 'Sole' },
    { value: 'joint_tenancy', label: 'Joint Tenancy' },
    { value: 'tenancy_in_common', label: 'Tenancy in Common' },
    { value: 'community_property', label: 'Community Property' },
    { value: 'trust', label: 'Trust' },
  ];

  const relationshipOptions: { value: RelationshipType; label: string }[] = [
    { value: 'spouse', label: 'Spouse' },
    { value: 'child', label: 'Child' },
    { value: 'parent', label: 'Parent' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl font-semibold text-forest-900">Profile Editor</h1>
        <Button variant="secondary" size="sm" onClick={loadGoldenPersona}>
          Load Golden Persona
        </Button>
      </div>
      <p className="font-serif text-forest-600 mb-8">
        Configure the estate owner profile, residencies, assets, and family members.
      </p>

      {!formData ? (
        <div className="card text-center py-12">
          <p className="font-serif text-forest-500 mb-4">
            Start by loading the golden persona or creating a new profile.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={loadGoldenPersona}>Load Golden Persona</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFormData({
                  id: crypto.randomUUID(),
                  name: '',
                  age: 0,
                  citizenships: [],
                  residencies: [],
                  assets: [],
                  family: [],
                  reportingCurrency: 'USD',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }}
            >
              Create Empty Profile
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {/* Personal Info */}
          <CollapsibleSection title="Personal Information">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" className="col-span-2">
                <input
                  type="text"
                  className={inputClass}
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Full legal name"
                />
              </Field>
              <Field label="Age">
                <input
                  type="number"
                  className={inputClass}
                  value={formData.age}
                  onChange={(e) => updateField('age', parseInt(e.target.value, 10) || 0)}
                  min={0}
                  max={120}
                />
              </Field>
              <Field label="Reporting Currency">
                <select
                  className={selectClass}
                  value={formData.reportingCurrency}
                  onChange={(e) => updateField('reportingCurrency', e.target.value as CurrencyCode)}
                >
                  {currencyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Citizenships" className="col-span-2">
                <div className="flex flex-wrap gap-2">
                  {countryOptions.map((opt) => {
                    const isSelected = formData.citizenships.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? formData.citizenships.filter((c) => c !== opt.value)
                            : [...formData.citizenships, opt.value];
                          updateField('citizenships', updated as CountryCode[]);
                        }}
                        className={[
                          'px-3 py-1.5 rounded-institutional font-mono text-sm border transition-colors',
                          isSelected
                            ? 'bg-forest-500 text-white border-forest-500'
                            : 'bg-white text-forest-600 border-cream-200 hover:border-forest-300',
                        ].join(' ')}
                      >
                        {opt.value}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </CollapsibleSection>

          {/* Residency History */}
          <CollapsibleSection title="Residency History">
            {formData.residencies.length === 0 && (
              <p className="font-serif text-sm text-forest-400 mb-4">No residencies added yet.</p>
            )}
            {formData.residencies.map((residency, index) => (
              <div
                key={index}
                className="border border-cream-200 rounded-institutional p-4 mb-3 bg-cream-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-sans text-sm font-semibold text-forest-700">
                    Residency #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeResidency(index)}
                    className="font-sans text-xs text-danger-500 hover:text-danger-600"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Country">
                    <select
                      className={selectClass}
                      value={residency.country}
                      onChange={(e) => updateResidency(index, 'country', e.target.value)}
                    >
                      {countryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Days Present">
                    <input
                      type="number"
                      className={inputClass}
                      value={residency.daysPresent}
                      onChange={(e) =>
                        updateResidency(index, 'daysPresent', parseInt(e.target.value, 10) || 0)
                      }
                      min={0}
                      max={365}
                    />
                  </Field>
                  <Field label="Years Resident">
                    <input
                      type="number"
                      className={inputClass}
                      value={residency.yearsResident}
                      onChange={(e) =>
                        updateResidency(index, 'yearsResident', parseInt(e.target.value, 10) || 0)
                      }
                      min={0}
                    />
                  </Field>
                  <Field label="Status">
                    <input
                      type="text"
                      className={inputClass}
                      value={residency.status}
                      onChange={(e) => updateResidency(index, 'status', e.target.value)}
                      placeholder="e.g. Settled, Non-dom"
                    />
                  </Field>
                  <Field label="Domiciled">
                    <div className="flex items-center h-[38px]">
                      <input
                        type="checkbox"
                        checked={residency.isDomiciled}
                        onChange={(e) => updateResidency(index, 'isDomiciled', e.target.checked)}
                        className="w-4 h-4 text-forest-500 border-cream-200 rounded-sm focus:ring-forest-300"
                      />
                      <span className="ml-2 font-sans text-sm text-forest-600">
                        {residency.isDomiciled ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </Field>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addResidency}>
              + Add Residency
            </Button>
          </CollapsibleSection>

          {/* Assets */}
          <CollapsibleSection title="Assets">
            {formData.assets.length === 0 && (
              <p className="font-serif text-sm text-forest-400 mb-4">No assets added yet.</p>
            )}
            {formData.assets.map((asset, index) => (
              <div
                key={asset.id}
                className="border border-cream-200 rounded-institutional p-4 mb-3 bg-cream-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-sans text-sm font-semibold text-forest-700">
                    {asset.name || `Asset #${index + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAsset(index)}
                    className="font-sans text-xs text-danger-500 hover:text-danger-600"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name" className="col-span-2">
                    <input
                      type="text"
                      className={inputClass}
                      value={asset.name}
                      onChange={(e) => updateAsset(index, 'name', e.target.value)}
                      placeholder="Asset name"
                    />
                  </Field>
                  <Field label="Asset Class">
                    <select
                      className={selectClass}
                      value={asset.assetClass}
                      onChange={(e) => updateAsset(index, 'assetClass', e.target.value)}
                    >
                      {assetClassOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Location (Situs)">
                    <select
                      className={selectClass}
                      value={asset.spikeLocation}
                      onChange={(e) => updateAsset(index, 'spikeLocation', e.target.value)}
                    >
                      {countryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Value">
                    <input
                      type="number"
                      className={inputClass}
                      value={asset.value}
                      onChange={(e) =>
                        updateAsset(index, 'value', parseFloat(e.target.value) || 0)
                      }
                      min={0}
                    />
                  </Field>
                  <Field label="Currency">
                    <select
                      className={selectClass}
                      value={asset.currency}
                      onChange={(e) => updateAsset(index, 'currency', e.target.value)}
                    >
                      {currencyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cost Basis">
                    <input
                      type="number"
                      className={inputClass}
                      value={asset.costBasis}
                      onChange={(e) =>
                        updateAsset(index, 'costBasis', parseFloat(e.target.value) || 0)
                      }
                      min={0}
                    />
                  </Field>
                  <Field label="Ownership Type">
                    <select
                      className={selectClass}
                      value={asset.ownershipType}
                      onChange={(e) => updateAsset(index, 'ownershipType', e.target.value)}
                    >
                      {ownershipOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ownership Fraction">
                    <input
                      type="number"
                      className={inputClass}
                      value={asset.ownershipFraction}
                      onChange={(e) =>
                        updateAsset(index, 'ownershipFraction', parseFloat(e.target.value) || 0)
                      }
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </Field>
                  <Field label="Date Acquired">
                    <input
                      type="date"
                      className={inputClass}
                      value={asset.dateAcquired.split('T')[0]}
                      onChange={(e) => updateAsset(index, 'dateAcquired', e.target.value)}
                    />
                  </Field>
                  <Field label="Notes" className="col-span-2">
                    <input
                      type="text"
                      className={inputClass}
                      value={asset.notes}
                      onChange={(e) => updateAsset(index, 'notes', e.target.value)}
                      placeholder="Additional notes"
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addAsset}>
              + Add Asset
            </Button>
          </CollapsibleSection>

          {/* Family Members */}
          <CollapsibleSection title="Family Members">
            {formData.family.length === 0 && (
              <p className="font-serif text-sm text-forest-400 mb-4">
                No family members added yet.
              </p>
            )}
            {formData.family.map((member, index) => (
              <div
                key={member.id}
                className="border border-cream-200 rounded-institutional p-4 mb-3 bg-cream-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-sans text-sm font-semibold text-forest-700">
                    {member.name || `Member #${index + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFamilyMember(index)}
                    className="font-sans text-xs text-danger-500 hover:text-danger-600"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name">
                    <input
                      type="text"
                      className={inputClass}
                      value={member.name}
                      onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Relationship">
                    <select
                      className={selectClass}
                      value={member.relationship}
                      onChange={(e) => updateFamilyMember(index, 'relationship', e.target.value)}
                    >
                      {relationshipOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Age">
                    <input
                      type="number"
                      className={inputClass}
                      value={member.age}
                      onChange={(e) =>
                        updateFamilyMember(index, 'age', parseInt(e.target.value, 10) || 0)
                      }
                      min={0}
                      max={120}
                    />
                  </Field>
                  <Field label="Beneficiary">
                    <div className="flex items-center h-[38px]">
                      <input
                        type="checkbox"
                        checked={member.isBeneficiary}
                        onChange={(e) =>
                          updateFamilyMember(index, 'isBeneficiary', e.target.checked)
                        }
                        className="w-4 h-4 text-forest-500 border-cream-200 rounded-sm focus:ring-forest-300"
                      />
                      <span className="ml-2 font-sans text-sm text-forest-600">
                        {member.isBeneficiary ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </Field>
                  <Field label="Citizenships" className="col-span-2">
                    <div className="flex flex-wrap gap-2">
                      {countryOptions.map((opt) => {
                        const isSelected = member.citizenships.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? member.citizenships.filter((c) => c !== opt.value)
                                : [...member.citizenships, opt.value];
                              updateFamilyMember(index, 'citizenships', updated);
                            }}
                            className={[
                              'px-3 py-1.5 rounded-institutional font-mono text-sm border transition-colors',
                              isSelected
                                ? 'bg-forest-500 text-white border-forest-500'
                                : 'bg-white text-forest-600 border-cream-200 hover:border-forest-300',
                            ].join(' ')}
                          >
                            {opt.value}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  {/* Residency sub-section */}
                  <div className="col-span-2 border-t border-cream-200 pt-3 mt-1">
                    <span className="font-sans text-xs uppercase tracking-wider text-forest-400 mb-2 block">
                      Residency
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Country">
                        <select
                          className={selectClass}
                          value={member.residency?.country ?? 'US'}
                          onChange={(e) =>
                            updateFamilyMember(index, 'residency.country', e.target.value)
                          }
                        >
                          {countryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Days Present">
                        <input
                          type="number"
                          className={inputClass}
                          value={member.residency?.daysPresent ?? 0}
                          onChange={(e) =>
                            updateFamilyMember(
                              index,
                              'residency.daysPresent',
                              parseInt(e.target.value, 10) || 0,
                            )
                          }
                          min={0}
                          max={365}
                        />
                      </Field>
                      <Field label="Years Resident">
                        <input
                          type="number"
                          className={inputClass}
                          value={member.residency?.yearsResident ?? 0}
                          onChange={(e) =>
                            updateFamilyMember(
                              index,
                              'residency.yearsResident',
                              parseInt(e.target.value, 10) || 0,
                            )
                          }
                          min={0}
                        />
                      </Field>
                      <Field label="Status">
                        <input
                          type="text"
                          className={inputClass}
                          value={member.residency?.status ?? ''}
                          onChange={(e) =>
                            updateFamilyMember(index, 'residency.status', e.target.value)
                          }
                          placeholder="e.g. Non-domiciled"
                        />
                      </Field>
                      <Field label="Domiciled">
                        <div className="flex items-center h-[38px]">
                          <input
                            type="checkbox"
                            checked={member.residency?.isDomiciled ?? false}
                            onChange={(e) =>
                              updateFamilyMember(index, 'residency.isDomiciled', e.target.checked)
                            }
                            className="w-4 h-4 text-forest-500 border-cream-200 rounded-sm focus:ring-forest-300"
                          />
                          <span className="ml-2 font-sans text-sm text-forest-600">
                            {member.residency?.isDomiciled ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addFamilyMember}>
              + Add Family Member
            </Button>
          </CollapsibleSection>

          {/* Save / Compute */}
          <div className="flex items-center justify-end gap-3 mt-6 pb-8">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Computing...' : 'Save & Compute Plan'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
