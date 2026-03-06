import type { Jurisdiction, CapitalControlRules } from '@copia/types';

/**
 * Portugal jurisdiction data.
 *
 * Sourced from the Codigo do IRS (CIRS), Codigo do Imposto do Selo (CIS),
 * Autoridade Tributaria e Aduaneira (AT), and EU Succession Regulation 650/2012.
 * Reflects 2023/2024 tax year figures.
 */
export const PT_JURISDICTION: Jurisdiction = {
  code: 'PT',
  name: 'Portugal',
  currency: 'EUR',

  residencyRules: [
    {
      testType: 'days',
      daysThreshold: 183,
      description:
        'An individual is tax resident in Portugal if they spend more than 183 days (consecutive or not) in Portugal in any 12-month period starting or ending in the relevant tax year, OR if they have a habitual abode in Portugal at any time during that period (defined as maintaining a dwelling that indicates an intention of habitual use as a residence).',
      categories: [
        {
          id: 'pt-resident',
          name: 'Tax Resident',
          description:
            'Individuals meeting the 183-day or habitual abode test are Portuguese tax residents, subject to tax on worldwide income under the IRS progressive rates.',
          taxScope: 'worldwide',
        },
        {
          id: 'pt-non-resident',
          name: 'Non-Resident',
          description:
            'Individuals who do not meet residency criteria are taxed only on Portuguese-source income at applicable rates (generally flat 25% for employment/self-employment income, with specific rates for other income categories).',
          taxScope: 'domestic',
        },
        {
          id: 'pt-nhr',
          name: 'Non-Habitual Resident (NHR)',
          description:
            'Special 10-year tax regime for individuals who become Portuguese tax residents after not having been resident in the prior 5 years. The original NHR regime (ending March 2024 for new applications) offered a flat 20% rate on qualifying Portuguese-source employment/self-employment income from high-value activities, and broad exemptions for foreign-source income. A restructured incentive regime (Incentivo Fiscal a Investigacao Cientifica e Inovacao - IFICI) took effect in 2024 with narrower eligibility.',
          taxScope: 'worldwide',
        },
      ],
      source: 'CIRS Art. 16; Decreto-Lei 249/2009 (NHR); Lei 82/2023 (IFICI)',
    },
  ],

  estateTax: {
    exists: true,
    taxBase: 'inheritance',
    brackets: [
      { from: 0, to: null, rate: 0.10 },
    ],
    exemptions: [
      {
        name: 'Exempt Transfers to Close Family',
        amount: 0,
        conditions:
          'Gratuitous transfers (inheritance and gifts) to spouses/civil partners, descendants (children, grandchildren), and ascendants (parents, grandparents) are completely exempt from Imposto do Selo (stamp duty). This is the most significant exemption, as it removes the vast majority of family inheritance transfers from tax.',
        source: 'Codigo do Imposto do Selo (CIS) Art. 6(e)',
      },
      {
        name: 'Small Value Exemption',
        amount: 500,
        conditions:
          'Gratuitous acquisitions of movable property with a value not exceeding EUR 500 are exempt from stamp duty.',
        source: 'CIS Art. 6(a)',
      },
    ],
    spousalProvisions: [
      {
        name: 'Spouse/Civil Partner Exemption',
        description:
          'Transfers to a surviving spouse or civil partner are fully exempt from the 10% stamp duty on gratuitous transfers. This applies to all asset classes (real property, financial assets, movable property).',
        conditions: 'Recipient must be the legal spouse or registered civil partner of the deceased.',
        source: 'CIS Art. 6(e)',
      },
    ],
    specialRules: [
      {
        id: 'pt-stamp-duty-gratuitous',
        name: 'Imposto do Selo on Gratuitous Transfers',
        description:
          'Portugal does not have a traditional inheritance or estate tax. Instead, gratuitous transfers (inheritances and gifts) are subject to Imposto do Selo (stamp duty) at a flat 10% rate. This applies only to transfers to persons other than spouse, descendants, or ascendants. The tax is levied on the beneficiary.',
        trigger: 'Gratuitous transfer of assets to non-exempt beneficiaries (e.g., siblings, nieces/nephews, unrelated persons).',
        effect: 'Flat 10% stamp duty on the value of the assets received.',
        source: 'CIS General Table, Item 1.2',
      },
      {
        id: 'pt-eu-succession',
        name: 'EU Succession Regulation 650/2012',
        description:
          'Portugal applies EU Succession Regulation 650/2012, which determines the applicable law for succession matters. By default, the law of the deceased\'s habitual residence at the time of death governs the entire succession. However, an individual may choose (by will) the law of their nationality to govern their succession (professio juris).',
        trigger: 'Death of an individual habitually resident in an EU member state or with assets in an EU member state.',
        effect: 'Determines which country\'s succession law (forced heirship, distribution rules) applies. Does not harmonize tax treatment.',
        source: 'EU Regulation 650/2012; Portuguese Civil Code Art. 62-65',
      },
      {
        id: 'pt-forced-heirship',
        name: 'Legitimate Portion (Forced Heirship)',
        description:
          'Portuguese succession law includes forced heirship provisions (legitima). The surviving spouse and descendants are entitled to a minimum share of the estate. The legitimate portion is: 2/3 if the deceased leaves a spouse and descendants; 1/2 if only a spouse or only descendants survive; 1/3 if only ascendants survive. The remaining "quota disponivel" (disposable portion) can be freely distributed by will.',
        trigger: 'Death of a person whose succession is governed by Portuguese law.',
        effect: 'A portion of the estate must pass to forced heirs regardless of the will\'s provisions.',
        source: 'Portuguese Civil Code Art. 2156-2161',
      },
      {
        id: 'pt-property-imt',
        name: 'IMT on Property Transfers',
        description:
          'Transfers of immovable property are also subject to IMT (Imposto Municipal sobre Transmissoes Onerosas de Imoveis) on onerous transfers, and additional stamp duty of 0.8% on the property value for all transfers (including gratuitous). The 0.8% stamp duty applies in addition to the 10% rate on gratuitous transfers to non-exempt beneficiaries.',
        trigger: 'Transfer of immovable property situated in Portugal.',
        effect: 'Additional 0.8% stamp duty on property value, on top of any other applicable stamp duty.',
        source: 'CIS General Table, Item 1.1',
      },
    ],
    currency: 'EUR',
  },

  giftTax: {
    exists: true,
    annualExclusion: 0,
    lifetimeExemption: null,
    spousalExclusion: Infinity,
    nonCitizenSpousalExclusion: Infinity,
    brackets: [
      { from: 0, to: null, rate: 0.10 },
    ],
    currency: 'EUR',
    specialRules: [
      {
        id: 'pt-gift-family-exempt',
        name: 'Family Gift Exemption',
        description:
          'Gifts to spouses, civil partners, descendants, and ascendants are completely exempt from stamp duty, mirroring the inheritance exemption. This means intra-family wealth transfers via gift can be made tax-free to direct-line family members.',
        trigger: 'Gift to spouse, civil partner, descendant, or ascendant.',
        effect: 'Complete exemption from the 10% stamp duty.',
        source: 'CIS Art. 6(e)',
      },
      {
        id: 'pt-gift-non-family',
        name: 'Non-Family Gifts Subject to 10% Stamp Duty',
        description:
          'Gifts to siblings, nieces, nephews, friends, or any non-exempt beneficiary are subject to the flat 10% Imposto do Selo. There is no annual exclusion amount (unlike the US or UK).',
        trigger: 'Gift to a person other than spouse, civil partner, descendant, or ascendant.',
        effect: 'Flat 10% stamp duty on the full value of the gift.',
        source: 'CIS General Table, Item 1.2',
      },
    ],
  },

  capitalGainsTax: {
    exists: true,
    shortTermBrackets: [
      { from: 0, to: 7_479, rate: 0.145 },
      { from: 7_479, to: 11_284, rate: 0.21 },
      { from: 11_284, to: 15_992, rate: 0.265 },
      { from: 15_992, to: 20_700, rate: 0.285 },
      { from: 20_700, to: 26_355, rate: 0.35 },
      { from: 26_355, to: 38_632, rate: 0.37 },
      { from: 38_632, to: 50_483, rate: 0.435 },
      { from: 50_483, to: 78_834, rate: 0.45 },
      { from: 78_834, to: null, rate: 0.48 },
    ],
    longTermBrackets: [
      { from: 0, to: null, rate: 0.28 },
    ],
    holdingPeriodMonths: 0,
    exemptions: [
      {
        name: 'Flat Rate vs Progressive Englobamento Election',
        amount: 0,
        conditions:
          'Capital gains from securities and other financial assets (Category G income) are taxed at a flat 28% rate by default. However, the taxpayer may elect "englobamento" (aggregation) to include gains in overall income and be taxed at the progressive IRS rates (14.5% to 48% plus solidarity surcharge). This is advantageous when the taxpayer\'s overall marginal rate is below 28%. The election applies to all Category G income for the year.',
        source: 'CIRS Art. 72(1); Art. 72(8)',
      },
      {
        name: 'Reinvestment Relief on Primary Residence',
        amount: 0,
        conditions:
          'Capital gains on the sale of a primary residence (habitacao propria e permanente) are excluded from taxation if the full sale proceeds are reinvested in the purchase, construction, or improvement of another primary residence in Portugal, the EU, or EEA within 24 months before or 36 months after the sale.',
        source: 'CIRS Art. 10(5)(a)',
      },
      {
        name: 'NHR Capital Gains Exemption on Foreign-Source Gains',
        amount: 0,
        conditions:
          'Under the NHR regime (for those who enrolled before the 2024 changes), capital gains from foreign-source movable property (e.g., foreign securities) may be exempt in Portugal if they could be taxed in the source country under an applicable DTA. Capital gains from foreign real property are generally taxable at the flat 28% rate. Gains from listed securities in blacklisted jurisdictions are taxed at 35%.',
        source: 'CIRS Art. 81(4)-(6); Decreto-Lei 249/2009',
      },
    ],
    currency: 'EUR',
  },

  filingObligations: [
    {
      name: 'IRS - Declaracao de Rendimentos (Annual Income Tax Return)',
      description:
        'Mandatory annual income tax return for all Portuguese tax residents and non-residents with Portuguese-source income. Covers all categories of income including employment (Cat. A), business (Cat. B), capital (Cat. E/G), property (Cat. F), and pensions (Cat. H). Must include worldwide income for residents.',
      deadline:
        '1 April to 30 June of the year following the income year. Automatic pre-populated declarations (IRS Automatico) are available for simpler cases from 1 April.',
      penalty:
        'Late filing: EUR 150 to EUR 3,750. Late payment: interest at 4% per year plus surcharges. Repeated non-compliance may result in additional penalties under the Regime Geral das Infraccoes Tributarias (RGIT).',
      source: 'CIRS Art. 57-62; RGIT Art. 116-119',
    },
    {
      name: 'Stamp Duty Declaration (Imposto do Selo)',
      description:
        'Required when gratuitous transfers (inheritances or gifts) are subject to stamp duty. The head of the household or beneficiaries must file a participacao (notification) with the tax authority, declaring the assets received and their values.',
      deadline:
        'Within 90 days of the date of death (for inheritments) or the date of the gift. For inheritance, the head of the household files the participacao, and the tax authority assesses the duty.',
      penalty:
        'Failure to file or late filing: fines of EUR 150 to EUR 3,750. Undervaluation of assets: additional assessments plus interest and potential penalties for tax fraud.',
      source: 'CIS Art. 26-28; RGIT',
    },
  ],

  capitalControls: {
    hasControls: false,
    outboundLimits: [],
    accountRequirements: [],
    approvalThresholds: [],
    documentationRequired: [
      'Reporting of incoming transfers above EUR 12,500 to Banco de Portugal',
      'Declaration of foreign bank accounts in annual IRS return',
      'Stamp duty declaration for gratuitous transfers within 90 days',
    ],
    exemptions: [
      'EU Treaty Art. 63 guarantees free movement of capital within EU/EEA',
      'No restrictions on inbound or outbound transfers for EU residents',
      'NHR holders: foreign-source income may be exempt under NHR regime (for existing beneficiaries)',
      'Third-country transfers subject to EU anti-money-laundering reporting but not restricted',
    ],
    source: 'CIRS; EU Treaty Art. 63 (Free Movement of Capital); Banco de Portugal regulations',
  } satisfies CapitalControlRules,

  lastUpdated: '2024-01-01',
  source: 'Codigo do IRS (CIRS); Codigo do Imposto do Selo (CIS); Decreto-Lei 249/2009 (NHR); Lei 82/2023; EU Succession Regulation 650/2012',

  sunsetProvisions: [
    {
      name: 'NHR Regime Closure to New Applicants',
      description:
        'The Non-Habitual Resident (NHR) regime was closed to new applicants effective 1 January 2024 (with transitional provisions for those who became resident or had applications pending before 31 March 2024). Existing NHR beneficiaries continue under the original regime for the remainder of their 10-year period. A replacement incentive (IFICI - Incentivo Fiscal a Investigacao Cientifica e Inovacao) targets a narrower group: researchers, academics, startup employees, and certain qualified professionals.',
      effectiveDate: '2024-01-01',
      impact:
        'New arrivals to Portugal can no longer access the broad NHR tax benefits (flat 20% on qualifying domestic income, exemptions for most foreign income). The IFICI regime offers a flat 20% rate on qualifying employment and self-employment income but does not replicate the foreign income exemptions. Existing NHR holders are unaffected until their 10-year period expires.',
      source: 'Lei 82/2023 (State Budget 2024); Decreto-Lei 249/2009 (original NHR)',
    },
    {
      name: 'Potential EU Anti-Tax Avoidance Measures',
      description:
        'The EU continues to develop measures that may affect Portugal\'s tax landscape, including the Anti-Tax Avoidance Directives (ATAD I and II), Pillar Two global minimum tax rules, and ongoing scrutiny of preferential tax regimes. Portugal has already implemented ATAD provisions, and the Pillar Two minimum effective tax rate of 15% for large multinationals may indirectly affect tax planning structures.',
      effectiveDate: 'Ongoing',
      impact:
        'May limit the effectiveness of certain Portuguese tax planning structures, particularly for multinational families and those with corporate structures. CFC rules, exit taxation, and anti-hybrid provisions already in effect.',
      source: 'Council Directive 2016/1164 (ATAD I); Council Directive 2017/952 (ATAD II); Council Directive 2022/2523 (Pillar Two)',
    },
  ],
};
