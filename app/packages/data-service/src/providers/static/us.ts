import type { Jurisdiction, CapitalControlRules } from '@copia/types';

/**
 * United States jurisdiction data.
 *
 * Sourced from IRS Publication 559, IRC sections 2001-2210,
 * Revenue Procedure 2022-38, and related IRS guidance.
 * Reflects 2023 tax year figures.
 */
export const US_JURISDICTION: Jurisdiction = {
  code: 'US',
  name: 'United States',
  currency: 'USD',

  residencyRules: [
    {
      testType: 'citizenship',
      daysThreshold: null,
      description:
        'The US taxes citizens and lawful permanent residents (green card holders) on their worldwide estate regardless of where they reside. Non-citizen, non-resident individuals are taxed only on US-situs assets.',
      categories: [
        {
          id: 'us-citizen',
          name: 'US Citizen',
          description:
            'All US citizens are subject to US estate and gift tax on worldwide assets, regardless of country of residence.',
          taxScope: 'worldwide',
        },
        {
          id: 'us-resident-alien',
          name: 'Resident Alien (Green Card / Substantial Presence)',
          description:
            'Lawful permanent residents and individuals meeting the substantial presence test are taxed on worldwide assets.',
          taxScope: 'worldwide',
        },
        {
          id: 'us-nonresident-alien',
          name: 'Non-Resident Alien',
          description:
            'Non-resident, non-citizen individuals are subject to US estate tax only on US-situs property (real property, tangible personal property located in the US, and certain US securities).',
          taxScope: 'domestic',
        },
      ],
      source: 'IRC §2001; IRC §2031; IRC §2101-2108; IRS Pub 559',
    },
    {
      testType: 'days',
      daysThreshold: 183,
      description:
        'Substantial Presence Test: physically present in the US for at least 31 days in the current year and 183 days over a 3-year weighted period (current year days + 1/3 prior year + 1/6 year before that).',
      categories: [
        {
          id: 'us-spt-resident',
          name: 'Substantial Presence Test Resident',
          description:
            'Treated as a US resident for income tax purposes; for estate/gift tax, domicile is the controlling test.',
          taxScope: 'worldwide',
        },
      ],
      source: 'IRC §7701(b); IRS Pub 519',
    },
  ],

  estateTax: {
    exists: true,
    taxBase: 'estate',
    brackets: [
      { from: 0, to: 10_000, rate: 0.18 },
      { from: 10_000, to: 20_000, rate: 0.20 },
      { from: 20_000, to: 40_000, rate: 0.22 },
      { from: 40_000, to: 60_000, rate: 0.24 },
      { from: 60_000, to: 80_000, rate: 0.26 },
      { from: 80_000, to: 100_000, rate: 0.28 },
      { from: 100_000, to: 150_000, rate: 0.30 },
      { from: 150_000, to: 250_000, rate: 0.32 },
      { from: 250_000, to: 500_000, rate: 0.34 },
      { from: 500_000, to: 750_000, rate: 0.37 },
      { from: 750_000, to: 1_000_000, rate: 0.39 },
      { from: 1_000_000, to: null, rate: 0.40 },
    ],
    exemptions: [
      {
        name: 'Unified Credit / Basic Exclusion Amount',
        amount: 12_920_000,
        conditions:
          'Available to US citizens and residents. Unified with lifetime gift tax exemption. Indexed for inflation annually.',
        source: 'IRC §2010(c); Revenue Procedure 2022-38',
      },
      {
        name: 'Non-Resident Alien Exemption',
        amount: 60_000,
        conditions:
          'Non-resident aliens who are not domiciled in the US receive a limited $60,000 exemption, unless a treaty provides a higher amount.',
        source: 'IRC §2102(b)(1)',
      },
    ],
    spousalProvisions: [
      {
        name: 'Unlimited Marital Deduction',
        description:
          'Transfers to a surviving spouse who is a US citizen are fully deductible from the gross estate, resulting in zero estate tax on the first death.',
        conditions: 'Surviving spouse must be a US citizen at the time of the decedent\'s death.',
        source: 'IRC §2056(a)',
      },
      {
        name: 'Qualified Domestic Trust (QDOT)',
        description:
          'If the surviving spouse is not a US citizen, the marital deduction is available only if assets pass to a Qualified Domestic Trust (QDOT). The QDOT must have at least one US trustee and meet IRS regulatory requirements. Estate tax is deferred until distributions are made from the trust or the surviving spouse dies.',
        conditions:
          'Non-citizen surviving spouse; trust must meet QDOT requirements including US trustee, withholding on distributions, and IRS reporting.',
        source: 'IRC §2056A',
      },
      {
        name: 'Portability of Deceased Spousal Unused Exclusion (DSUE)',
        description:
          'The unused portion of a deceased spouse\'s basic exclusion amount can be transferred to the surviving spouse, effectively doubling the available exemption for married couples.',
        conditions:
          'Must file a timely Form 706 estate tax return to elect portability, even if no estate tax is owed. Only available for US citizen/resident spouses.',
        source: 'IRC §2010(c)(4)',
      },
    ],
    specialRules: [
      {
        id: 'us-generation-skipping',
        name: 'Generation-Skipping Transfer Tax (GSTT)',
        description:
          'A flat 40% tax applies to transfers that skip a generation (e.g., grandparent to grandchild), in addition to any estate or gift tax. A separate GST exemption of $12.92M (2023) applies.',
        trigger: 'Transfers to beneficiaries two or more generations below the transferor.',
        effect: 'Additional 40% tax on the transfer amount above the GST exemption.',
        source: 'IRC §2601-2664',
      },
      {
        id: 'us-step-up-basis',
        name: 'Step-Up in Basis at Death',
        description:
          'Assets included in the gross estate receive a stepped-up (or stepped-down) basis to fair market value at the date of death, eliminating unrealized capital gains for heirs.',
        trigger: 'Death of the asset owner; assets included in the gross estate.',
        effect: 'Eliminates unrealized capital gains tax liability on inherited assets.',
        source: 'IRC §1014',
      },
      {
        id: 'us-alternate-valuation',
        name: 'Alternate Valuation Date',
        description:
          'The executor may elect to value the estate six months after death instead of at the date of death, if doing so reduces the total estate tax and the value of the gross estate.',
        trigger: 'Election by executor on Form 706.',
        effect: 'Estate assets valued at six-month post-death date, potentially reducing estate tax.',
        source: 'IRC §2032',
      },
    ],
    currency: 'USD',
  },

  giftTax: {
    exists: true,
    annualExclusion: 17_000,
    lifetimeExemption: 12_920_000,
    spousalExclusion: Infinity,
    nonCitizenSpousalExclusion: 175_000,
    brackets: [
      { from: 0, to: 10_000, rate: 0.18 },
      { from: 10_000, to: 20_000, rate: 0.20 },
      { from: 20_000, to: 40_000, rate: 0.22 },
      { from: 40_000, to: 60_000, rate: 0.24 },
      { from: 60_000, to: 80_000, rate: 0.26 },
      { from: 80_000, to: 100_000, rate: 0.28 },
      { from: 100_000, to: 150_000, rate: 0.30 },
      { from: 150_000, to: 250_000, rate: 0.32 },
      { from: 250_000, to: 500_000, rate: 0.34 },
      { from: 500_000, to: 750_000, rate: 0.37 },
      { from: 750_000, to: 1_000_000, rate: 0.39 },
      { from: 1_000_000, to: null, rate: 0.40 },
    ],
    currency: 'USD',
    specialRules: [
      {
        id: 'us-gift-split',
        name: 'Gift Splitting',
        description:
          'Married couples may elect to treat a gift made by one spouse as made one-half by each spouse, doubling the annual exclusion to $34,000 per donee.',
        trigger: 'Both spouses consent on a timely-filed Form 709.',
        effect: 'Doubles the annual exclusion per donee; each spouse uses half of the gift against their own lifetime exemption.',
        source: 'IRC §2513',
      },
      {
        id: 'us-gift-unified',
        name: 'Unified Credit System',
        description:
          'Gift tax and estate tax share a single unified lifetime exemption of $12.92M (2023). Taxable gifts made during life reduce the exemption available at death.',
        trigger: 'Cumulative taxable gifts exceeding the annual exclusion.',
        effect: 'Reduces available estate tax exemption dollar-for-dollar.',
        source: 'IRC §2505; IRC §2010(c)',
      },
      {
        id: 'us-gift-education-medical',
        name: 'Education and Medical Exclusion',
        description:
          'Payments made directly to educational institutions for tuition or to medical providers for medical expenses are excluded from gift tax entirely, with no dollar limit.',
        trigger: 'Direct payment to the institution or provider (not to the individual).',
        effect: 'Unlimited exclusion from gift tax; does not count against annual or lifetime exemption.',
        source: 'IRC §2503(e)',
      },
    ],
  },

  capitalGainsTax: {
    exists: true,
    shortTermBrackets: [
      { from: 0, to: 11_000, rate: 0.10 },
      { from: 11_000, to: 44_725, rate: 0.12 },
      { from: 44_725, to: 95_375, rate: 0.22 },
      { from: 95_375, to: 182_100, rate: 0.24 },
      { from: 182_100, to: 231_250, rate: 0.32 },
      { from: 231_250, to: 578_125, rate: 0.35 },
      { from: 578_125, to: null, rate: 0.37 },
    ],
    longTermBrackets: [
      { from: 0, to: 44_625, rate: 0.0 },
      { from: 44_625, to: 492_300, rate: 0.15 },
      { from: 492_300, to: null, rate: 0.20 },
    ],
    holdingPeriodMonths: 12,
    exemptions: [
      {
        name: 'Step-Up in Basis at Death',
        amount: 0,
        conditions:
          'Inherited assets receive a fair market value basis as of date of death, effectively exempting all pre-death appreciation from capital gains tax. No dollar limit.',
        source: 'IRC §1014',
      },
      {
        name: 'Primary Residence Exclusion',
        amount: 250_000,
        conditions:
          '$250,000 exclusion ($500,000 for married filing jointly) on gain from the sale of a principal residence. Must have owned and used the home as a principal residence for at least 2 of the last 5 years.',
        source: 'IRC §121',
      },
    ],
    currency: 'USD',
  },

  filingObligations: [
    {
      name: 'Form 706 - United States Estate Tax Return',
      description:
        'Required for estates of US citizens or residents with gross assets plus adjusted taxable gifts exceeding the basic exclusion amount ($12.92M for 2023). Also required to elect portability of the DSUE amount.',
      deadline: '9 months after the date of death; automatic 6-month extension available via Form 4768.',
      penalty:
        'Failure to file: 5% of unpaid tax per month, up to 25%. Failure to pay: 0.5% per month, up to 25%. Combined penalties can reach 47.5% of unpaid tax.',
      source: 'IRC §6018; IRC §6651',
    },
    {
      name: 'FBAR - FinCEN Form 114 (Report of Foreign Bank and Financial Accounts)',
      description:
        'Required for US persons with a financial interest in or signature authority over foreign financial accounts if the aggregate value exceeds $10,000 at any time during the calendar year.',
      deadline: 'April 15 following the calendar year; automatic extension to October 15.',
      penalty:
        'Non-willful: up to $12,500 per violation. Willful: greater of $100,000 or 50% of account balance per violation. Criminal penalties possible.',
      source: '31 USC §5314; 31 CFR §1010.350; FinCEN Notice 2023-1',
    },
    {
      name: 'FATCA Form 8938 - Statement of Specified Foreign Financial Assets',
      description:
        'Required for US taxpayers holding specified foreign financial assets above threshold amounts ($50,000 on last day of year or $75,000 at any time for unmarried domestic filers; higher thresholds for married and overseas filers).',
      deadline: 'Filed with annual income tax return (April 15, or October 15 with extension).',
      penalty:
        '$10,000 failure-to-file penalty; additional $10,000 for each 30-day period of non-filing after IRS notice, up to $50,000. 40% penalty on underpayments attributable to undisclosed foreign assets.',
      source: 'IRC §6038D; Treas. Reg. §1.6038D-2',
    },
  ],

  capitalControls: {
    hasControls: false,
    outboundLimits: [],
    accountRequirements: [],
    approvalThresholds: [],
    documentationRequired: [
      'Form 3520 — Annual return to report transactions with foreign trusts and receipt of foreign gifts/bequests exceeding $100,000',
      'FBAR (FinCEN Form 114) — Report of Foreign Bank and Financial Accounts if aggregate exceeds $10,000',
      'FATCA Form 8938 — Statement of Specified Foreign Financial Assets above threshold amounts',
      'Form 3520-A — Annual information return of foreign trust with US owner',
      'Form 8865 — Return of US persons with respect to certain foreign partnerships',
    ],
    exemptions: [
      'No outbound capital controls — US does not restrict capital outflows',
      'No inbound capital controls — US does not restrict capital inflows',
      'Reporting requirements exist but do not restrict movement of funds',
    ],
    source: 'IRC §6039F; FinCEN BSA; IRC §6038D (FATCA)',
  } satisfies CapitalControlRules,

  lastUpdated: '2024-01-01',
  source: 'IRS Publication 559 (2023); IRC §§2001-2210, 2501-2524; Revenue Procedure 2022-38',

  sunsetProvisions: [
    {
      name: 'TCJA Estate and Gift Tax Exemption Sunset',
      description:
        'The Tax Cuts and Jobs Act of 2017 (TCJA) doubled the basic exclusion amount from approximately $5.49M to $11.18M (indexed). This provision is scheduled to sunset after December 31, 2025, reverting the exemption to approximately $5-7M (adjusted for inflation from the pre-TCJA $5.49M baseline).',
      effectiveDate: '2026-01-01',
      impact:
        'The basic exclusion amount will decrease by approximately 50%, from $12.92M to an estimated $6.5-7M. Estates and lifetime gift plans relying on the higher exemption should consider accelerating transfers before the sunset.',
      source: 'TCJA §11061; IRC §2010(c)(3)(C)',
    },
  ],
};
