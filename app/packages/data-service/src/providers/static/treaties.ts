import type {
  CountryCode,
  TreatyEdge,
  TreatyPair,
} from '@copia/types';

// ---------------------------------------------------------------------------
// GB-US: UK-US Estate and Gift Tax Treaty (1978, amended 1979)
// ---------------------------------------------------------------------------
const GB_US: TreatyEdge = {
  pair: 'GB-US' as TreatyPair,
  countries: ['GB', 'US'],
  treatyName: 'UK-US Estate and Gift Tax Treaty (1978, amended by 1979 Protocol)',
  yearSigned: 1978,
  mliApplies: false,
  taxingRights: [
    {
      assetClass: 'immovable_property',
      right: 'shared',
      primaryCountry: null,
      articleRef: 'Art 5',
      notes: 'Situs state retains right to tax immovable property; residence state also taxes but grants credit.',
    },
    {
      assetClass: 'business_property',
      right: 'shared',
      primaryCountry: null,
      articleRef: 'Art 6',
      notes: 'Business property attributable to a permanent establishment may be taxed by the PE state.',
    },
    {
      assetClass: 'shares',
      right: 'exclusive_residence',
      primaryCountry: null,
      articleRef: 'Art 8',
      notes: 'Shares taxable only in the state of domicile/residence of the decedent.',
    },
    {
      assetClass: 'bonds',
      right: 'exclusive_residence',
      primaryCountry: null,
      articleRef: 'Art 8',
      notes: 'Debt obligations taxable only in the state of domicile/residence.',
    },
    {
      assetClass: 'bank_deposits',
      right: 'exclusive_residence',
      primaryCountry: null,
      articleRef: 'Art 8',
      notes: 'Bank deposits taxable only in the residence state.',
    },
    {
      assetClass: 'personal_property',
      right: 'exclusive_residence',
      primaryCountry: null,
      articleRef: 'Art 7',
      notes: 'Tangible movable property generally taxable only in domicile state, except property used in a PE.',
    },
    {
      assetClass: 'pension',
      right: 'exclusive_residence',
      primaryCountry: null,
      articleRef: 'Art 8',
      notes: 'Pension rights taxable in the domicile state.',
    },
    {
      assetClass: 'life_insurance',
      right: 'exclusive_residence',
      primaryCountry: null,
      articleRef: 'Art 8',
      notes: 'Life insurance proceeds taxable in the domicile state.',
    },
    {
      assetClass: 'other',
      right: 'exclusive_residence',
      primaryCountry: null,
      articleRef: 'Art 8',
      notes: 'All other property taxable in the residence/domicile state.',
    },
  ],
  reliefMethod: 'credit',
  tieBreakerRules: [
    {
      order: 1,
      test: 'permanent_home',
      description: 'The individual is deemed resident in the state where they have a permanent home available.',
      articleRef: 'Art 4(2)(a)',
    },
    {
      order: 2,
      test: 'center_of_vital_interests',
      description: 'If a permanent home exists in both states, residence is where personal and economic relations are closer.',
      articleRef: 'Art 4(2)(b)',
    },
    {
      order: 3,
      test: 'habitual_abode',
      description: 'If the center of vital interests cannot be determined, the state of habitual abode prevails.',
      articleRef: 'Art 4(2)(c)',
    },
    {
      order: 4,
      test: 'nationality',
      description: 'If habitual abode is in both or neither state, the state of nationality prevails.',
      articleRef: 'Art 4(2)(d)',
    },
    {
      order: 5,
      test: 'mutual_agreement',
      description: 'If nationality does not resolve, the competent authorities settle the question by mutual agreement.',
      articleRef: 'Art 4(2)(e)',
    },
  ],
  specialProvisions: [
    {
      id: 'us-saving-clause',
      name: 'US Saving Clause',
      description:
        'The United States reserves the right to tax its citizens and residents as if the treaty had not come into effect, subject to certain treaty benefits.',
      country: 'US',
      effect:
        'US citizens remain subject to US estate tax on worldwide assets regardless of treaty provisions. Credit is available for UK IHT paid.',
      articleRef: 'Art 4(4)',
    },
    {
      id: 'gb-domicile-deemed',
      name: 'UK Deemed Domicile Rule',
      description:
        'The UK applies a deemed domicile concept for IHT purposes (17 out of 20 tax years resident). The treaty uses its own domicile definition which may differ.',
      country: 'GB',
      effect:
        'Treaty domicile may override UK deemed domicile rules, potentially reducing UK IHT exposure for long-term UK residents who are US domiciliaries.',
      articleRef: 'Art 4(1)',
    },
    {
      id: 'gb-us-marital-deduction',
      name: 'Marital Deduction / Spousal Exemption',
      description:
        'Special provision allows a limited marital deduction for transfers to a non-citizen surviving spouse, aligned with the US unified credit.',
      country: 'US',
      effect:
        'Enables a higher effective exemption for cross-border spousal transfers than would otherwise apply under IRC section 2056(d).',
      articleRef: 'Art 10',
    },
  ],
  gaps: [
    {
      description:
        'The treaty predates many modern financial instruments (e.g., derivatives, crypto assets). Coverage for these is uncertain.',
      affectedAssetClasses: ['other'],
      riskLevel: 'medium',
      mitigation:
        'Seek professional advice on classification of modern financial instruments under the treaty.',
    },
  ],
  source: 'US-UK Estate and Gift Tax Treaty (1978)',
  lastUpdated: '2025-01-15',
};

// ---------------------------------------------------------------------------
// IN-US: No bilateral estate/inheritance tax treaty exists
// ---------------------------------------------------------------------------
const IN_US: TreatyEdge = {
  pair: 'IN-US' as TreatyPair,
  countries: ['IN', 'US'],
  treatyName: 'No Estate/Inheritance Tax Treaty',
  yearSigned: 0,
  mliApplies: false,
  taxingRights: [
    {
      assetClass: 'immovable_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate tax treaty between US and India. India abolished estate duty in 1985.',
    },
    {
      assetClass: 'business_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage. US estate tax applies to US-situs business assets of Indian residents.',
    },
    {
      assetClass: 'shares',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'US-issued shares held by Indian residents subject to US estate tax with no treaty relief.',
    },
    {
      assetClass: 'bonds',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage for debt instruments.',
    },
    {
      assetClass: 'bank_deposits',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'US bank deposits of non-resident aliens may be exempt under IRC section 2105(b), but no treaty framework.',
    },
    {
      assetClass: 'personal_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage for tangible personal property.',
    },
    {
      assetClass: 'pension',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate tax treaty; income tax treaty (1989) may cover pension income but not estate inclusion.',
    },
    {
      assetClass: 'life_insurance',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage for life insurance proceeds in estate context.',
    },
    {
      assetClass: 'other',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage for any asset class in the estate/inheritance context.',
    },
  ],
  reliefMethod: 'none',
  tieBreakerRules: [],
  specialProvisions: [
    {
      id: 'us-unilateral-credit',
      name: 'US Unilateral Foreign Tax Credit (IRC section 2014)',
      description:
        'In the absence of a treaty, the US allows a unilateral credit under IRC section 2014 for foreign death taxes paid on property situated in the foreign country.',
      country: 'US',
      effect:
        'Limited relief: credit is available only for taxes paid to India on assets situated in India, and only to the extent of the US tax on those assets.',
      articleRef: 'IRC section 2014',
    },
  ],
  gaps: [
    {
      description:
        'No bilateral estate tax treaty exists between the US and India. India abolished its estate duty in 1985, but US estate tax still applies to US-situs assets of Indian residents and worldwide assets of US citizens/domiciliaries with Indian assets.',
      affectedAssetClasses: [
        'immovable_property',
        'business_property',
        'shares',
        'bonds',
        'bank_deposits',
        'personal_property',
        'pension',
        'life_insurance',
        'other',
      ],
      riskLevel: 'high',
      mitigation:
        'Rely on US unilateral credit under IRC section 2014 for limited relief. Consider estate planning structures (e.g., foreign trusts, gifting strategies) and consult a cross-border tax advisor.',
    },
    {
      description:
        'Non-resident aliens (Indian residents) with US-situs assets receive only a $60,000 US estate tax exemption instead of the full unified credit (~$13.61M in 2024).',
      affectedAssetClasses: ['shares', 'immovable_property', 'business_property'],
      riskLevel: 'high',
      mitigation:
        'Consider holding US equities through non-US corporate structures or using treaty-eligible jurisdictions where possible.',
    },
  ],
  source: 'No treaty in force; US domestic law (IRC sections 2014, 2101-2108)',
  lastUpdated: '2025-01-15',
};

// ---------------------------------------------------------------------------
// PT-US: No specific estate/inheritance tax treaty
// ---------------------------------------------------------------------------
const PT_US: TreatyEdge = {
  pair: 'PT-US' as TreatyPair,
  countries: ['PT', 'US'],
  treatyName: 'No Estate/Inheritance Tax Treaty',
  yearSigned: 0,
  mliApplies: false,
  taxingRights: [
    {
      assetClass: 'immovable_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate tax treaty. Portugal applies Imposto do Selo (stamp duty) at 10% on Portuguese-situs assets.',
    },
    {
      assetClass: 'business_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage. Each country applies its own domestic rules.',
    },
    {
      assetClass: 'shares',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'US estate tax applies to US-situs shares; Portugal stamp duty applies to Portuguese-situs assets.',
    },
    {
      assetClass: 'bonds',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage for debt instruments.',
    },
    {
      assetClass: 'bank_deposits',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage. Portuguese bank deposits may attract stamp duty.',
    },
    {
      assetClass: 'personal_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage for tangible personal property.',
    },
    {
      assetClass: 'pension',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate tax treaty. US-Portugal income tax treaty (1994) covers pension income but not estate matters.',
    },
    {
      assetClass: 'life_insurance',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage for life insurance in the estate context.',
    },
    {
      assetClass: 'other',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No treaty coverage for any asset class in the estate/inheritance context.',
    },
  ],
  reliefMethod: 'none',
  tieBreakerRules: [],
  specialProvisions: [
    {
      id: 'us-unilateral-credit-pt',
      name: 'US Unilateral Foreign Tax Credit (IRC section 2014)',
      description:
        'The US allows a unilateral credit for foreign death taxes paid to Portugal on property situated in Portugal.',
      country: 'US',
      effect:
        'Limited relief for stamp duty paid in Portugal on Portuguese-situs assets, credited against US estate tax.',
      articleRef: 'IRC section 2014',
    },
    {
      id: 'pt-nhr-regime',
      name: 'Portugal Non-Habitual Resident (NHR) Regime',
      description:
        'Portugal\'s NHR regime provides favorable income tax treatment for 10 years but does not affect inheritance/stamp duty obligations.',
      country: 'PT',
      effect:
        'NHR status does not exempt from Imposto do Selo on inherited Portuguese-situs assets. Relevant for income tax planning only.',
      articleRef: 'Decree-Law 249/2009',
    },
  ],
  gaps: [
    {
      description:
        'No bilateral estate/inheritance tax treaty between the US and Portugal. Risk of double taxation is partially mitigated by Portugal\'s relatively low stamp duty rate (10%).',
      affectedAssetClasses: [
        'immovable_property',
        'business_property',
        'shares',
        'bonds',
        'bank_deposits',
        'personal_property',
        'pension',
        'life_insurance',
        'other',
      ],
      riskLevel: 'medium',
      mitigation:
        'Portugal stamp duty (Imposto do Selo) at 10% is significantly lower than US estate tax rates (up to 40%). Use IRC section 2014 unilateral credit. Double taxation risk is limited due to the rate differential.',
    },
    {
      description:
        'Non-resident aliens (Portuguese residents) with US-situs assets receive only a $60,000 US estate tax exemption.',
      affectedAssetClasses: ['shares', 'immovable_property', 'business_property'],
      riskLevel: 'medium',
      mitigation:
        'Consider holding US equities through non-US corporate structures. Portugal\'s EU membership may offer planning opportunities via other EU member state treaties.',
    },
  ],
  source: 'No treaty in force; US domestic law (IRC sections 2014, 2101-2108); Portugal Codigo do Imposto do Selo',
  lastUpdated: '2025-01-15',
};

// ---------------------------------------------------------------------------
// GB-IN: UK-India DTAA (1993) - income/capital gains only, no estate/IHT
// ---------------------------------------------------------------------------
const GB_IN: TreatyEdge = {
  pair: 'GB-IN' as TreatyPair,
  countries: ['GB', 'IN'],
  treatyName: 'UK-India Double Taxation Avoidance Convention (1993)',
  yearSigned: 1993,
  mliApplies: true,
  taxingRights: [
    {
      assetClass: 'immovable_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A (Art 6 covers income from immovable property only)',
      notes: 'The DTAA covers income from immovable property but not inheritance or estate taxation of such property.',
    },
    {
      assetClass: 'business_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'DTAA covers business profits (Art 7) but not estate/IHT treatment of business property.',
    },
    {
      assetClass: 'shares',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'Capital gains on shares are covered (Art 13) but not estate/IHT inclusion of shares.',
    },
    {
      assetClass: 'bonds',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'Interest income is covered (Art 11) but not estate tax on bonds.',
    },
    {
      assetClass: 'bank_deposits',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate/IHT coverage. Interest on deposits covered for income tax purposes only.',
    },
    {
      assetClass: 'personal_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate/IHT coverage for personal property under this treaty.',
    },
    {
      assetClass: 'pension',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A (Art 19 covers pension income)',
      notes: 'Pension income covered for income tax; estate/IHT treatment of pension funds not covered.',
    },
    {
      assetClass: 'life_insurance',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate/IHT coverage for life insurance proceeds.',
    },
    {
      assetClass: 'other',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'The treaty does not cover estate, inheritance, or gift taxes for any asset class.',
    },
  ],
  reliefMethod: 'credit',
  tieBreakerRules: [
    {
      order: 1,
      test: 'permanent_home',
      description: 'Residence in the state where a permanent home is available (income tax treaty tie-breaker; no estate-specific tie-breaker).',
      articleRef: 'Art 4(2)(a)',
    },
    {
      order: 2,
      test: 'center_of_vital_interests',
      description: 'Where personal and economic relations are closer.',
      articleRef: 'Art 4(2)(b)',
    },
    {
      order: 3,
      test: 'habitual_abode',
      description: 'The state of habitual abode.',
      articleRef: 'Art 4(2)(c)',
    },
    {
      order: 4,
      test: 'nationality',
      description: 'The state of which the individual is a national.',
      articleRef: 'Art 4(2)(d)',
    },
    {
      order: 5,
      test: 'mutual_agreement',
      description: 'Competent authorities settle the question by mutual agreement.',
      articleRef: 'Art 4(2)(e)',
    },
  ],
  specialProvisions: [
    {
      id: 'india-no-estate-duty',
      name: 'India Abolished Estate Duty',
      description:
        'India abolished its estate duty in 1985. There is no Indian estate or inheritance tax currently in force.',
      country: 'IN',
      effect:
        'Double taxation risk is one-sided: UK IHT may apply to Indian-situs assets of UK-domiciled individuals, but India imposes no reciprocal estate tax.',
      articleRef: 'Estate Duty (Abolition) Act, 1985',
    },
  ],
  gaps: [
    {
      description:
        'The UK-India DTAA covers income and capital gains taxes but does NOT cover inheritance tax (IHT) or estate duty. UK IHT may apply to worldwide assets of UK-domiciled individuals with Indian assets.',
      affectedAssetClasses: [
        'immovable_property',
        'business_property',
        'shares',
        'bonds',
        'bank_deposits',
        'personal_property',
        'pension',
        'life_insurance',
        'other',
      ],
      riskLevel: 'medium',
      mitigation:
        'Since India has no estate tax, double taxation is unlikely in practice. However, UK IHT applies to worldwide assets of UK-domiciled persons. Consider UK excluded property trusts for Indian-situs assets if the individual is non-UK domiciled.',
    },
  ],
  source: 'UK-India DTAA (1993, amended by 2013 Protocol); India Estate Duty (Abolition) Act 1985',
  lastUpdated: '2025-01-15',
};

// ---------------------------------------------------------------------------
// GB-PT: UK-Portugal Double Taxation Convention (1968) - income only
// ---------------------------------------------------------------------------
const GB_PT: TreatyEdge = {
  pair: 'GB-PT' as TreatyPair,
  countries: ['GB', 'PT'],
  treatyName: 'UK-Portugal Double Taxation Convention (1968)',
  yearSigned: 1968,
  mliApplies: true,
  taxingRights: [
    {
      assetClass: 'immovable_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A (Art 6 covers income from immovable property only)',
      notes: 'Treaty covers income from immovable property but not inheritance/estate taxation.',
    },
    {
      assetClass: 'business_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'Business profits covered (Art 7) but not estate/IHT treatment.',
    },
    {
      assetClass: 'shares',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'Capital gains on shares may be covered (Art 13) but estate/IHT is not.',
    },
    {
      assetClass: 'bonds',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'Interest income covered (Art 11) but not estate tax on bonds.',
    },
    {
      assetClass: 'bank_deposits',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate/IHT coverage for bank deposits.',
    },
    {
      assetClass: 'personal_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate/IHT coverage for personal property.',
    },
    {
      assetClass: 'pension',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'Pension income covered for income tax only; estate treatment not covered.',
    },
    {
      assetClass: 'life_insurance',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate/IHT coverage for life insurance.',
    },
    {
      assetClass: 'other',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'The treaty does not cover estate, inheritance, or gift taxes.',
    },
  ],
  reliefMethod: 'credit',
  tieBreakerRules: [
    {
      order: 1,
      test: 'permanent_home',
      description: 'Residence in the state where a permanent home is available (income tax treaty tie-breaker).',
      articleRef: 'Art 4(2)(a)',
    },
    {
      order: 2,
      test: 'center_of_vital_interests',
      description: 'Where personal and economic relations are closer.',
      articleRef: 'Art 4(2)(b)',
    },
    {
      order: 3,
      test: 'habitual_abode',
      description: 'The state of habitual abode.',
      articleRef: 'Art 4(2)(c)',
    },
    {
      order: 4,
      test: 'nationality',
      description: 'The state of which the individual is a national.',
      articleRef: 'Art 4(2)(d)',
    },
    {
      order: 5,
      test: 'mutual_agreement',
      description: 'Competent authorities settle the question by mutual agreement.',
      articleRef: 'Art 4(2)(e)',
    },
  ],
  specialProvisions: [
    {
      id: 'eu-succession-regulation',
      name: 'EU Succession Regulation (Brussels IV)',
      description:
        'EU Regulation 650/2012 allows a person to choose the law of their nationality to govern succession. Portugal applies this regulation; the UK does not (post-Brexit).',
      country: 'PT',
      effect:
        'Portuguese-situs assets of a UK national may be subject to UK succession law if the decedent chose UK law under Brussels IV. This does not affect tax but simplifies cross-border administration.',
      articleRef: 'EU Regulation 650/2012, Art 22',
    },
    {
      id: 'pt-stamp-duty-low-rate',
      name: 'Portugal Stamp Duty (Imposto do Selo)',
      description:
        'Portugal levies a 10% stamp duty (Imposto do Selo) on gratuitous transfers including inheritances, but exempts spouses, descendants, and ascendants.',
      country: 'PT',
      effect:
        'For transfers to close family members, Portugal imposes no inheritance tax. For others, the 10% rate is much lower than UK IHT at 40%.',
      articleRef: 'Codigo do Imposto do Selo, Art 1(3)',
    },
  ],
  gaps: [
    {
      description:
        'The UK-Portugal DTC covers income and capital gains only. No estate/inheritance tax treaty exists. UK IHT (40%) may apply to worldwide assets of UK-domiciled individuals alongside Portugal stamp duty (10%).',
      affectedAssetClasses: [
        'immovable_property',
        'business_property',
        'shares',
        'bonds',
        'bank_deposits',
        'personal_property',
        'pension',
        'life_insurance',
        'other',
      ],
      riskLevel: 'medium',
      mitigation:
        'UK unilateral relief under IHTA 1984 s.159 may provide credit for Portuguese stamp duty paid. Portugal exempts close family members from stamp duty, reducing double taxation risk. Consider excluded property trust structures for non-UK domiciliaries.',
    },
  ],
  source: 'UK-Portugal DTC (1968); Portugal Codigo do Imposto do Selo; IHTA 1984 s.159',
  lastUpdated: '2025-01-15',
};

// ---------------------------------------------------------------------------
// IN-PT: India-Portugal DTAA (2000) - income only, India has no estate tax
// ---------------------------------------------------------------------------
const IN_PT: TreatyEdge = {
  pair: 'IN-PT' as TreatyPair,
  countries: ['IN', 'PT'],
  treatyName: 'India-Portugal Double Taxation Avoidance Agreement (2000)',
  yearSigned: 2000,
  mliApplies: true,
  taxingRights: [
    {
      assetClass: 'immovable_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A (Art 6 covers income from immovable property only)',
      notes: 'Treaty covers income from immovable property but not inheritance/estate taxation.',
    },
    {
      assetClass: 'business_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'Business profits covered (Art 7) but not estate/inheritance taxation.',
    },
    {
      assetClass: 'shares',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'Capital gains on shares covered (Art 13) but not estate/inheritance inclusion.',
    },
    {
      assetClass: 'bonds',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'Interest income covered (Art 11) but not estate taxation of bonds.',
    },
    {
      assetClass: 'bank_deposits',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate/inheritance coverage for bank deposits.',
    },
    {
      assetClass: 'personal_property',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate/inheritance coverage for personal property.',
    },
    {
      assetClass: 'pension',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'Pension income covered for income tax; estate treatment not covered.',
    },
    {
      assetClass: 'life_insurance',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'No estate/inheritance coverage for life insurance.',
    },
    {
      assetClass: 'other',
      right: 'not_covered',
      primaryCountry: null,
      articleRef: 'N/A',
      notes: 'The treaty does not cover estate, inheritance, or gift taxes.',
    },
  ],
  reliefMethod: 'credit',
  tieBreakerRules: [
    {
      order: 1,
      test: 'permanent_home',
      description: 'Residence in the state where a permanent home is available (income tax treaty tie-breaker).',
      articleRef: 'Art 4(2)(a)',
    },
    {
      order: 2,
      test: 'center_of_vital_interests',
      description: 'Where personal and economic relations are closer.',
      articleRef: 'Art 4(2)(b)',
    },
    {
      order: 3,
      test: 'habitual_abode',
      description: 'The state of habitual abode.',
      articleRef: 'Art 4(2)(c)',
    },
    {
      order: 4,
      test: 'nationality',
      description: 'The state of which the individual is a national.',
      articleRef: 'Art 4(2)(d)',
    },
    {
      order: 5,
      test: 'mutual_agreement',
      description: 'Competent authorities settle the question by mutual agreement.',
      articleRef: 'Art 4(2)(e)',
    },
  ],
  specialProvisions: [
    {
      id: 'india-no-estate-duty-in-pt',
      name: 'India Abolished Estate Duty',
      description:
        'India abolished its estate duty in 1985. There is currently no estate or inheritance tax in India.',
      country: 'IN',
      effect:
        'No risk of Indian estate tax. Double taxation risk is limited to Portugal\'s stamp duty (Imposto do Selo) which only applies to Portuguese-situs gratuitous transfers.',
      articleRef: 'Estate Duty (Abolition) Act, 1985',
    },
    {
      id: 'pt-stamp-duty-family-exempt',
      name: 'Portugal Stamp Duty Family Exemption',
      description:
        'Portugal exempts spouses, descendants, and ascendants from stamp duty on inheritances.',
      country: 'PT',
      effect:
        'For transfers to close family members, there is effectively no inheritance tax in either country, eliminating double taxation concerns entirely.',
      articleRef: 'Codigo do Imposto do Selo, Art 6(e)',
    },
  ],
  gaps: [
    {
      description:
        'The India-Portugal DTAA covers income tax only. Neither country currently imposes a comprehensive estate/inheritance tax (India abolished estate duty; Portugal charges only 10% stamp duty with family exemptions).',
      affectedAssetClasses: [
        'immovable_property',
        'business_property',
        'shares',
        'bonds',
        'bank_deposits',
        'personal_property',
        'pension',
        'life_insurance',
        'other',
      ],
      riskLevel: 'low',
      mitigation:
        'Practical double taxation risk is minimal since India has no estate tax and Portugal\'s stamp duty is limited (10% with family exemptions). No specific action needed for most cross-border estates.',
    },
  ],
  source: 'India-Portugal DTAA (2000); India Estate Duty (Abolition) Act 1985; Portugal Codigo do Imposto do Selo',
  lastUpdated: '2025-01-15',
};

// ---------------------------------------------------------------------------
// Exported collection and lookup helper
// ---------------------------------------------------------------------------

export const TREATY_EDGES: TreatyEdge[] = [
  GB_US,
  IN_US,
  PT_US,
  GB_IN,
  GB_PT,
  IN_PT,
];

/**
 * Look up the treaty edge for a given pair of country codes.
 * The order of the arguments does not matter; the pair key is
 * always alphabetically sorted.
 */
export function getTreatyEdge(
  a: CountryCode,
  b: CountryCode,
): TreatyEdge | undefined {
  const sorted = [a, b].sort() as [CountryCode, CountryCode];
  const key = `${sorted[0]}-${sorted[1]}` as TreatyPair;
  return TREATY_EDGES.find((edge) => edge.pair === key);
}
