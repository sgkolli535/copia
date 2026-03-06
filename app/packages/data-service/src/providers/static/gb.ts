import type { Jurisdiction, CapitalControlRules } from '@copia/types';

/**
 * United Kingdom jurisdiction data.
 *
 * Sourced from HMRC Inheritance Tax guidance, Finance Act 2006,
 * Finance (No. 2) Act 2015, and HMRC manuals (IHTM, RDRM).
 * Reflects 2023-2024 tax year figures.
 */
export const GB_JURISDICTION: Jurisdiction = {
  code: 'GB',
  name: 'United Kingdom',
  currency: 'GBP',

  residencyRules: [
    {
      testType: 'domicile',
      daysThreshold: null,
      description:
        'UK Inheritance Tax (IHT) is primarily based on domicile, not residence. Individuals domiciled in the UK are subject to IHT on worldwide assets. Non-UK-domiciled individuals are subject to IHT only on UK-situs assets.',
      categories: [
        {
          id: 'gb-domiciled',
          name: 'UK Domiciled',
          description:
            'Domicile of origin (born in UK with UK-domiciled parent), domicile of choice (settled in UK with intent to remain permanently), or deemed domicile. Subject to IHT on worldwide assets.',
          taxScope: 'worldwide',
        },
        {
          id: 'gb-non-domiciled',
          name: 'Non-UK Domiciled',
          description:
            'Individuals not domiciled in the UK are taxed only on UK-situs assets for IHT purposes. May claim the remittance basis for income and capital gains tax.',
          taxScope: 'domestic',
        },
        {
          id: 'gb-deemed-domiciled',
          name: 'Deemed Domiciled',
          description:
            'An individual becomes deemed UK-domiciled for IHT purposes after being UK resident for at least 15 of the previous 20 tax years. Also applies to anyone born in the UK with a UK domicile of origin who later becomes UK resident.',
          taxScope: 'worldwide',
        },
      ],
      source: 'IHTA 1984 §267; Finance (No. 2) Act 2017 §30',
    },
    {
      testType: 'statutory',
      daysThreshold: null,
      description:
        'The Statutory Residence Test (SRT) determines UK tax residence for income tax and capital gains tax purposes. It uses a combination of automatic overseas tests, automatic UK tests, and sufficient ties tests based on days spent in the UK.',
      categories: [
        {
          id: 'gb-srt-resident',
          name: 'UK Tax Resident (SRT)',
          description:
            'Meets one of the automatic UK tests (e.g., 183+ days in UK, only home in UK) or sufficient ties test. Subject to UK income tax and CGT.',
          taxScope: 'worldwide',
        },
        {
          id: 'gb-srt-non-resident',
          name: 'UK Non-Resident (SRT)',
          description:
            'Meets an automatic overseas test or does not satisfy sufficient ties. Not subject to UK income tax or CGT except on UK-source income and UK property gains.',
          taxScope: 'domestic',
        },
      ],
      source: 'Finance Act 2013 Schedule 45; HMRC RDR3',
    },
  ],

  estateTax: {
    exists: true,
    taxBase: 'estate',
    brackets: [
      { from: 0, to: 325_000, rate: 0.0 },
      { from: 325_000, to: null, rate: 0.40 },
    ],
    exemptions: [
      {
        name: 'Nil-Rate Band (NRB)',
        amount: 325_000,
        conditions:
          'Standard threshold below which no IHT is charged. Frozen at this level through April 2028. Unused NRB can be transferred to a surviving spouse.',
        source: 'IHTA 1984 §7; Autumn Statement 2022',
      },
      {
        name: 'Residence Nil-Rate Band (RNRB)',
        amount: 175_000,
        conditions:
          'Additional threshold available when the deceased\'s main residence is passed to direct descendants (children, grandchildren). Tapers by £1 for every £2 the estate exceeds £2M. Transferable to surviving spouse. Frozen through April 2028.',
        source: 'IHTA 1984 §8D-8M; Finance (No. 2) Act 2015',
      },
      {
        name: 'Charitable Exemption',
        amount: 0,
        conditions:
          'Gifts to qualifying UK charities are completely exempt from IHT with no monetary limit. If 10% or more of the net estate is left to charity, the IHT rate on the remaining taxable estate is reduced from 40% to 36%.',
        source: 'IHTA 1984 §23; Finance Act 2012 Schedule 33',
      },
    ],
    spousalProvisions: [
      {
        name: 'Spouse/Civil Partner Exemption',
        description:
          'Transfers between spouses or civil partners who are both UK-domiciled are completely exempt from IHT with no upper limit.',
        conditions: 'Both parties must be domiciled (or deemed domiciled) in the UK.',
        source: 'IHTA 1984 §18',
      },
      {
        name: 'Non-Domiciled Spouse Limit',
        description:
          'Where the transferor is UK-domiciled but the recipient spouse is non-UK-domiciled, the spousal exemption is limited to £325,000. The non-domiciled spouse may elect to be treated as UK-domiciled for IHT purposes to receive the unlimited exemption.',
        conditions:
          'Receiving spouse is non-UK-domiciled and has not elected to be treated as UK-domiciled.',
        source: 'IHTA 1984 §18(2); Finance Act 2013 §177',
      },
      {
        name: 'Transferable Nil-Rate Band',
        description:
          'Any unused portion of the first spouse\'s NRB (and RNRB) can be transferred to the surviving spouse, effectively doubling the nil-rate bands to £650,000 (NRB) and £350,000 (RNRB) for the surviving spouse\'s estate.',
        conditions:
          'Claim must be made on the surviving spouse\'s IHT return. The percentage of unused NRB is transferred, not the absolute amount.',
        source: 'IHTA 1984 §8A-8C',
      },
    ],
    specialRules: [
      {
        id: 'gb-pet',
        name: 'Potentially Exempt Transfer (PET) - 7-Year Rule',
        description:
          'Lifetime gifts to individuals become PETs. If the donor survives 7 years, the gift is fully exempt from IHT. If the donor dies within 7 years, the gift is brought back into the estate for IHT. Taper relief reduces the tax: 0-3 years: 100% of the death rate; 3-4 years: 80%; 4-5 years: 60%; 5-6 years: 40%; 6-7 years: 20%.',
        trigger: 'Donor dies within 7 years of making a lifetime gift to an individual.',
        effect:
          'Gift value is added to the estate for IHT calculation, with taper relief reducing the effective rate based on time elapsed.',
        source: 'IHTA 1984 §3A; IHTA 1984 §7(4) (taper relief)',
      },
      {
        id: 'gb-deemed-domicile',
        name: 'Deemed Domicile Rule',
        description:
          'An individual who has been UK resident for at least 15 of the previous 20 tax years is treated as domiciled in the UK for IHT purposes, bringing worldwide assets within scope of IHT.',
        trigger: 'UK residence in at least 15 of the previous 20 tax years.',
        effect: 'Worldwide assets become subject to UK IHT, as if UK-domiciled.',
        source: 'IHTA 1984 §267; Finance (No. 2) Act 2017',
      },
      {
        id: 'gb-business-relief',
        name: 'Business Property Relief (BPR)',
        description:
          'Qualifying business assets may attract 100% or 50% relief from IHT. 100% relief applies to qualifying unquoted trading company shares and sole trader businesses. 50% relief applies to controlling holdings of quoted shares, land/buildings used by a partnership or company.',
        trigger: 'Ownership of qualifying business property for at least 2 years before transfer.',
        effect: 'Reduces the taxable value of the business property by 50% or 100%.',
        source: 'IHTA 1984 §103-114',
      },
      {
        id: 'gb-agricultural-relief',
        name: 'Agricultural Property Relief (APR)',
        description:
          'Agricultural property in the UK, Channel Islands, Isle of Man, or EEA may attract 100% or 50% relief. The rate depends on the nature of the interest and whether the owner has vacant possession.',
        trigger: 'Ownership and occupation/management of qualifying agricultural property for at least 2 years (or 7 years if let).',
        effect: 'Reduces the agricultural value of the property by 50% or 100% for IHT purposes.',
        source: 'IHTA 1984 §115-124C',
      },
    ],
    currency: 'GBP',
  },

  giftTax: {
    exists: true,
    annualExclusion: 3_000,
    lifetimeExemption: null,
    spousalExclusion: Infinity,
    nonCitizenSpousalExclusion: 325_000,
    brackets: [
      { from: 0, to: 325_000, rate: 0.0 },
      { from: 325_000, to: null, rate: 0.40 },
    ],
    currency: 'GBP',
    specialRules: [
      {
        id: 'gb-pet-gift',
        name: 'Potentially Exempt Transfers',
        description:
          'Gifts to individuals are PETs. They are immediately outside the estate if the donor survives 7 years. If the donor dies within 7 years, the gift is taxed as part of the estate with taper relief available after 3 years.',
        trigger: 'Gift made by an individual to another individual (not to a trust).',
        effect: 'No immediate tax; fully exempt after 7 years; taxed with taper relief if donor dies within 7 years.',
        source: 'IHTA 1984 §3A',
      },
      {
        id: 'gb-small-gifts',
        name: 'Small Gifts Exemption',
        description:
          'Gifts of up to £250 per recipient per tax year are exempt from IHT. This applies per recipient and cannot be combined with the annual exemption for the same recipient.',
        trigger: 'Gifts of £250 or less to any one person in a tax year.',
        effect: 'Fully exempt from IHT.',
        source: 'IHTA 1984 §20',
      },
      {
        id: 'gb-marriage-gifts',
        name: 'Marriage/Civil Partnership Gift Exemption',
        description:
          'Gifts in consideration of marriage or civil partnership are exempt up to: £5,000 from a parent, £2,500 from a grandparent or remoter ancestor, £1,000 from any other person.',
        trigger: 'Gift made in consideration of a marriage or civil partnership.',
        effect: 'Exempt up to the relevant limit.',
        source: 'IHTA 1984 §22',
      },
      {
        id: 'gb-normal-expenditure',
        name: 'Normal Expenditure Out of Income',
        description:
          'Regular gifts made out of income (not capital) that form part of the donor\'s normal expenditure and leave the donor with sufficient income to maintain their usual standard of living are fully exempt from IHT, with no monetary limit.',
        trigger: 'Habitual pattern of gifts from income, not affecting donor\'s standard of living.',
        effect: 'Unlimited exemption from IHT.',
        source: 'IHTA 1984 §21',
      },
    ],
  },

  capitalGainsTax: {
    exists: true,
    shortTermBrackets: [
      { from: 0, to: 6_000, rate: 0.0 },
      { from: 6_000, to: 37_700, rate: 0.10 },
      { from: 37_700, to: null, rate: 0.20 },
    ],
    longTermBrackets: [
      { from: 0, to: 6_000, rate: 0.0 },
      { from: 6_000, to: 37_700, rate: 0.10 },
      { from: 37_700, to: null, rate: 0.20 },
    ],
    holdingPeriodMonths: 0,
    exemptions: [
      {
        name: 'Annual Exempt Amount (AEA)',
        amount: 6_000,
        conditions:
          'Each individual has a £6,000 CGT-free allowance for the 2023-24 tax year (reduced from £12,300 in 2022-23). Trusts receive half this amount.',
        source: 'TCGA 1992 §3; Finance Act 2023',
      },
      {
        name: 'Death - No CGT Disposal',
        amount: 0,
        conditions:
          'There is no capital gains tax on death in the UK. Beneficiaries inherit assets at probate value (market value at date of death), effectively rebasing the cost for future disposals.',
        source: 'TCGA 1992 §62',
      },
      {
        name: 'Private Residence Relief',
        amount: 0,
        conditions:
          'Gains on the disposal of a principal private residence are fully exempt from CGT. Partial relief for periods of non-occupation. The last 9 months of ownership are always deemed occupation.',
        source: 'TCGA 1992 §222-226',
      },
    ],
    currency: 'GBP',
  },

  filingObligations: [
    {
      name: 'IHT400 - Inheritance Tax Account',
      description:
        'The main IHT return form, required when the estate value exceeds the NRB or when certain conditions apply (e.g., trust assets, gifts within 7 years). Submitted to HMRC by the personal representative.',
      deadline:
        '12 months from the end of the month in which death occurred. IHT payment is due 6 months after the end of the month of death (interest accrues after that date). Instalment option available for qualifying property over 10 years.',
      penalty:
        'Late filing: penalties under Finance Act 2009 Schedule 55. Late payment: interest at the prevailing HMRC rate. Potential surcharges for deliberate non-compliance.',
      source: 'IHTA 1984 §216; HMRC IHT400 Notes',
    },
    {
      name: 'Self Assessment Tax Return (SA100)',
      description:
        'Required for reporting capital gains on disposal of inherited assets, rental income from inherited property, and other income. Executors may need to file returns for the period of administration.',
      deadline:
        'Online filing: 31 January following the end of the tax year (5 April). Paper filing: 31 October following the tax year end.',
      penalty:
        'Late filing: £100 immediate penalty; daily penalties of £10/day after 3 months (up to 90 days); additional penalties of 5% of tax due at 6 and 12 months. Late payment: 5% surcharges at 30 days, 6 months, and 12 months.',
      source: 'TMA 1970 §8-12; Finance Act 2009 Schedule 55',
    },
  ],

  capitalControls: {
    hasControls: false,
    outboundLimits: [],
    accountRequirements: [],
    approvalThresholds: [],
    documentationRequired: [
      'Self Assessment reporting of foreign income and gains',
      'Remittance basis claim (SA109) — for non-domiciled individuals electing remittance basis',
      'ATED return — Annual Tax on Enveloped Dwellings for properties held through companies',
    ],
    exemptions: [
      'No capital controls since Exchange Control Act 1947 abolished in 1979',
      'EU/EEA free movement of capital principles continue post-Brexit for most transfers',
      'Non-doms on remittance basis: foreign income/gains not taxed until remitted to UK',
      'Deemed domicile at 15 of 20 years removes remittance basis — worldwide income then taxable',
    ],
    source: 'HMRC RDRM (Residence, Domicile and Remittance Manual); Exchange Control Act 1947 (abolished 1979)',
  } satisfies CapitalControlRules,

  lastUpdated: '2024-01-01',
  source: 'HMRC Inheritance Tax Manual (IHTM); IHTA 1984; Finance Act 2006; Finance (No. 2) Act 2015; Finance (No. 2) Act 2017',

  sunsetProvisions: [
    {
      name: 'NRB and RNRB Freeze Through April 2028',
      description:
        'The nil-rate band (£325,000) and residence nil-rate band (£175,000) have been frozen at current levels and will not increase with inflation until at least April 2028. This effectively increases the IHT burden as asset values rise with inflation (fiscal drag).',
      effectiveDate: '2028-04-06',
      impact:
        'More estates will exceed the NRB threshold as property and asset values increase, resulting in higher effective IHT rates. Estimated to bring 10,000+ additional estates into IHT each year.',
      source: 'Autumn Statement 2022; Spring Budget 2023',
    },
  ],
};
