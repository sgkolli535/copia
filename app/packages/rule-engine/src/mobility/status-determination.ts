import type {
  UserProfile,
  CountryCode,
  ResidencyStatus,
  StatusResult,
  SourceCitation,
  ConfidenceTier,
} from '@copia/types';

const ENGINE_VERSION = '1.0.0';

/**
 * Determine the user's status in a given source country for capital mobility purposes.
 * Extends core residency logic with "former" classifications:
 * - India: NRI / OCI / PIO
 * - US: citizen / former_citizen
 * - UK: deemed_domiciled / non_domiciled
 * - PT: resident / non_resident
 */
export function determineSourceCountryStatus(
  profile: UserProfile,
  sourceCountry: CountryCode,
): StatusResult {
  switch (sourceCountry) {
    case 'IN':
      return determineIndiaStatus(profile);
    case 'US':
      return determineUSStatus(profile);
    case 'GB':
      return determineUKStatus(profile);
    case 'PT':
      return determinePortugalStatus(profile);
    default: {
      const _exhaustive: never = sourceCountry;
      throw new Error(`Unsupported source country: ${_exhaustive}`);
    }
  }
}

function determineIndiaStatus(profile: UserProfile): StatusResult {
  const isCitizen = profile.citizenships.includes('IN');
  const inResidency = profile.residencies.find((r) => r.country === 'IN');
  const daysInIndia = inResidency?.daysPresent ?? 0;

  // Check for OCI/PIO status in family or profile notes
  const hasOCI = profile.residencies.some(
    (r) => r.country === 'IN' && (r.status.toLowerCase().includes('oci') || r.status.toLowerCase().includes('overseas citizen')),
  );
  const hasPIO = profile.residencies.some(
    (r) => r.country === 'IN' && r.status.toLowerCase().includes('pio'),
  );

  if (isCitizen && daysInIndia >= 182) {
    return makeResult('IN', 'resident', 'Resident Indian citizen (182+ days)', 'statutory', {
      id: 'in-res-1',
      sourceType: 'statute',
      title: 'Income Tax Act Residency',
      reference: 'Income Tax Act 1961 §6',
      url: null,
      confidence: 'statutory',
      asOfDate: '2024-01-01',
      jurisdiction: 'IN',
    });
  }

  if (isCitizen && daysInIndia < 182) {
    return makeResult('IN', 'nri', 'Non-Resident Indian (citizen, <182 days)', 'statutory', {
      id: 'in-nri-1',
      sourceType: 'statute',
      title: 'NRI Classification',
      reference: 'Income Tax Act 1961 §6; FEMA Act 1999 §2(v)',
      url: null,
      confidence: 'statutory',
      asOfDate: '2024-01-01',
      jurisdiction: 'IN',
    });
  }

  if (hasOCI) {
    return makeResult('IN', 'oci', 'Overseas Citizen of India (OCI) cardholder', 'statutory', {
      id: 'in-oci-1',
      sourceType: 'statute',
      title: 'OCI Status',
      reference: 'Citizenship Act 1955 §7A; FEMA (Non-debt Instruments) Rules 2019',
      url: null,
      confidence: 'statutory',
      asOfDate: '2024-01-01',
      jurisdiction: 'IN',
    });
  }

  if (hasPIO) {
    return makeResult('IN', 'pio', 'Person of Indian Origin (PIO)', 'interpretive', {
      id: 'in-pio-1',
      sourceType: 'regulation',
      title: 'PIO Status',
      reference: 'PIO Card Scheme (merged into OCI); FEMA definitions',
      url: null,
      confidence: 'interpretive',
      asOfDate: '2024-01-01',
      jurisdiction: 'IN',
    });
  }

  // Non-citizen, no OCI/PIO — pure non-resident
  return makeResult('IN', 'non_resident', 'Non-resident foreign national with respect to India', 'statutory', {
    id: 'in-nonres-1',
    sourceType: 'statute',
    title: 'Non-Resident Status',
    reference: 'Income Tax Act 1961 §6; FEMA Act 1999',
    url: null,
    confidence: 'statutory',
    asOfDate: '2024-01-01',
    jurisdiction: 'IN',
  });
}

function determineUSStatus(profile: UserProfile): StatusResult {
  const isCitizen = profile.citizenships.includes('US');
  const usResidency = profile.residencies.find((r) => r.country === 'US');

  if (isCitizen) {
    return makeResult('US', 'citizen', 'US citizen — worldwide estate and gift tax applies regardless of residence', 'statutory', {
      id: 'us-cit-1',
      sourceType: 'statute',
      title: 'US Citizenship-Based Taxation',
      reference: 'IRC §2001; IRC §2501',
      url: null,
      confidence: 'statutory',
      asOfDate: '2024-01-01',
      jurisdiction: 'US',
    });
  }

  if (usResidency && usResidency.daysPresent >= 183) {
    return makeResult('US', 'resident', 'US resident alien (substantial presence)', 'statutory', {
      id: 'us-res-1',
      sourceType: 'statute',
      title: 'Substantial Presence Test',
      reference: 'IRC §7701(b)',
      url: null,
      confidence: 'statutory',
      asOfDate: '2024-01-01',
      jurisdiction: 'US',
    });
  }

  // Check if former citizen (look for US in family citizenships or status hints)
  const formerCitizenHint = profile.residencies.some(
    (r) => r.country === 'US' && r.status.toLowerCase().includes('former'),
  );
  if (formerCitizenHint) {
    return makeResult('US', 'former_citizen', 'Former US citizen — covered expatriate rules may apply (IRC §877A)', 'interpretive', {
      id: 'us-former-1',
      sourceType: 'statute',
      title: 'Covered Expatriate Rules',
      reference: 'IRC §877A; IRC §2801',
      url: null,
      confidence: 'interpretive',
      asOfDate: '2024-01-01',
      jurisdiction: 'US',
    });
  }

  return makeResult('US', 'non_resident', 'Non-resident alien — US estate tax only on US-situs assets', 'statutory', {
    id: 'us-nra-1',
    sourceType: 'statute',
    title: 'Non-Resident Alien Status',
    reference: 'IRC §2101-2108',
    url: null,
    confidence: 'statutory',
    asOfDate: '2024-01-01',
    jurisdiction: 'US',
  });
}

function determineUKStatus(profile: UserProfile): StatusResult {
  const gbResidency = profile.residencies.find((r) => r.country === 'GB');
  const yearsResident = gbResidency?.yearsResident ?? 0;
  const isDomiciled = gbResidency?.isDomiciled ?? false;

  if (isDomiciled || yearsResident >= 15) {
    const status: ResidencyStatus = yearsResident >= 15 && !isDomiciled ? 'deemed_domiciled' : 'resident';
    const desc =
      yearsResident >= 15 && !isDomiciled
        ? `Deemed domiciled in UK (${yearsResident} of 20 years resident) — worldwide IHT applies`
        : 'UK domiciled — worldwide IHT applies';

    return makeResult('GB', status, desc, 'statutory', {
      id: 'gb-dom-1',
      sourceType: 'statute',
      title: 'UK Domicile/Deemed Domicile',
      reference: 'IHTA 1984 §267; Finance (No. 2) Act 2017 §30',
      url: null,
      confidence: 'statutory',
      asOfDate: '2024-01-01',
      jurisdiction: 'GB',
    });
  }

  if (gbResidency && gbResidency.daysPresent > 0) {
    return makeResult('GB', 'non_domiciled', 'UK resident, non-domiciled — remittance basis available for IHT/income', 'statutory', {
      id: 'gb-nondom-1',
      sourceType: 'statute',
      title: 'Non-Domiciled UK Resident',
      reference: 'IHTA 1984 §6(1); HMRC RDRM',
      url: null,
      confidence: 'statutory',
      asOfDate: '2024-01-01',
      jurisdiction: 'GB',
    });
  }

  return makeResult('GB', 'non_resident', 'Non-UK resident — IHT only on UK-situs assets', 'statutory', {
    id: 'gb-nonres-1',
    sourceType: 'statute',
    title: 'Non-UK Resident',
    reference: 'IHTA 1984; Finance Act 2013 Schedule 45',
    url: null,
    confidence: 'statutory',
    asOfDate: '2024-01-01',
    jurisdiction: 'GB',
  });
}

function determinePortugalStatus(profile: UserProfile): StatusResult {
  const ptResidency = profile.residencies.find((r) => r.country === 'PT');

  if (ptResidency && ptResidency.daysPresent >= 183) {
    const isNHR = ptResidency.status.toLowerCase().includes('nhr');
    if (isNHR) {
      return makeResult('PT', 'resident', 'Portuguese tax resident under NHR regime', 'statutory', {
        id: 'pt-nhr-1',
        sourceType: 'statute',
        title: 'NHR Regime',
        reference: 'CIRS Art. 16; Decreto-Lei 249/2009',
        url: null,
        confidence: 'statutory',
        asOfDate: '2024-01-01',
        jurisdiction: 'PT',
      });
    }

    return makeResult('PT', 'resident', 'Portuguese tax resident (183+ days)', 'statutory', {
      id: 'pt-res-1',
      sourceType: 'statute',
      title: 'Portuguese Residency',
      reference: 'CIRS Art. 16',
      url: null,
      confidence: 'statutory',
      asOfDate: '2024-01-01',
      jurisdiction: 'PT',
    });
  }

  return makeResult('PT', 'non_resident', 'Non-resident in Portugal — taxed only on Portuguese-source income', 'statutory', {
    id: 'pt-nonres-1',
    sourceType: 'statute',
    title: 'Portuguese Non-Resident',
    reference: 'CIRS Art. 16',
    url: null,
    confidence: 'statutory',
    asOfDate: '2024-01-01',
    jurisdiction: 'PT',
  });
}

function makeResult(
  sourceCountry: CountryCode,
  status: ResidencyStatus,
  description: string,
  confidence: ConfidenceTier,
  citation: SourceCitation,
): StatusResult {
  return {
    sourceCountry,
    status,
    description,
    citations: [citation],
    confidence,
  };
}
