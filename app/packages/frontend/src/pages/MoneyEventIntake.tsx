import React, { useState } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import type { MoneyEvent, MoneyEventType, CountryCode, CurrencyCode, ResidencyStatus } from '@copia/types';
import { moneyEventAtom, mobilityResultAtom, profileAtom, loadingAtom, errorAtom } from '../store/atoms';

const eventTypes: { value: MoneyEventType; label: string }[] = [
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'property_sale', label: 'Property Sale' },
  { value: 'business_exit', label: 'Business Exit' },
  { value: 'pension', label: 'Pension' },
  { value: 'settlement', label: 'Settlement' },
  { value: 'gift', label: 'Gift' },
  { value: 'investment_liquidation', label: 'Investment Liquidation' },
];

const countries: { value: CountryCode; label: string }[] = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IN', label: 'India' },
  { value: 'PT', label: 'Portugal' },
];

const currencies: CurrencyCode[] = ['USD', 'GBP', 'INR', 'EUR'];

const statuses: { value: ResidencyStatus; label: string }[] = [
  { value: 'citizen', label: 'Citizen' },
  { value: 'resident', label: 'Resident' },
  { value: 'nri', label: 'NRI' },
  { value: 'oci', label: 'OCI' },
  { value: 'non_resident', label: 'Non-Resident' },
  { value: 'non_domiciled', label: 'Non-Domiciled' },
  { value: 'deemed_domiciled', label: 'Deemed Domiciled' },
  { value: 'former_citizen', label: 'Former Citizen' },
];

export default function MoneyEventIntake() {
  const profile = useAtomValue(profileAtom);
  const setMoneyEvent = useSetAtom(moneyEventAtom);
  const setLoading = useSetAtom(loadingAtom);
  const setError = useSetAtom(errorAtom);
  const navigate = useNavigate();

  const [type, setType] = useState<MoneyEventType>('inheritance');
  const [sourceCountry, setSourceCountry] = useState<CountryCode>('IN');
  const [destinationCountry, setDestinationCountry] = useState<CountryCode>('GB');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [relatedAsset, setRelatedAsset] = useState('');
  const [relationship, setRelationship] = useState('');
  const [userStatus, setUserStatus] = useState<ResidencyStatus>('nri');
  const [description, setDescription] = useState('');

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white border border-cream-200 rounded-institutional p-8 max-w-md">
          <p className="font-sans text-sm text-forest-600 mb-4">
            A profile is required before analyzing a money event.
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 bg-forest-500 text-white rounded-institutional text-sm font-medium hover:bg-forest-600 transition-colors"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    const event: MoneyEvent = {
      id: crypto.randomUUID(),
      type,
      sourceCountry,
      destinationCountry,
      amount: parsedAmount,
      currency,
      date,
      relatedAsset,
      relationship,
      userStatusInSource: userStatus,
      description,
    };

    setMoneyEvent(event);
    navigate('/mobility');
  }

  const selectClass =
    'w-full px-3 py-2 border border-cream-300 rounded-institutional text-sm font-sans text-forest-900 bg-white focus:outline-none focus:ring-1 focus:ring-forest-400';
  const inputClass = selectClass;
  const labelClass = 'block font-sans text-xs font-semibold text-forest-600 uppercase tracking-wide mb-1';

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-forest-900 mb-1">Money Event</h2>
      <p className="font-sans text-sm text-forest-500 mb-6">
        Describe a cross-border money event to analyze capital controls, costs, and permitted actions.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-cream-200 rounded-institutional p-6 space-y-4 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Event Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as MoneyEventType)} className={selectClass}>
              {eventTypes.map((et) => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Your Status in Source</label>
            <select value={userStatus} onChange={(e) => setUserStatus(e.target.value as ResidencyStatus)} className={selectClass}>
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Source Country</label>
            <select value={sourceCountry} onChange={(e) => setSourceCountry(e.target.value as CountryCode)} className={selectClass}>
              {countries.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Destination Country</label>
            <select value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value as CountryCode)} className={selectClass}>
              {countries.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Amount</label>
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1,000,000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className={selectClass}>
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Related Asset</label>
            <input type="text" value={relatedAsset} onChange={(e) => setRelatedAsset(e.target.value)} placeholder="e.g. Flat in Mumbai" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Relationship (if applicable)</label>
          <input type="text" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. father, spouse" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the event in your own words..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2.5 bg-forest-500 text-white rounded-institutional text-sm font-medium hover:bg-forest-600 transition-colors"
        >
          Analyze Money Event
        </button>
      </form>
    </div>
  );
}
