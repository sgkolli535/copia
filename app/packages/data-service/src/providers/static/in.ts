import type { Jurisdiction, CapitalControlRules } from '@copia/types';

/**
 * India jurisdiction data.
 *
 * Sourced from Income Tax Act 1961, Central Board of Direct Taxes (CBDT)
 * notifications, and related statutes.
 * Reflects Assessment Year 2024-25 (Financial Year 2023-24) figures.
 */
export const IN_JURISDICTION: Jurisdiction = {
  code: 'IN',
  name: 'India',
  currency: 'INR',

  residencyRules: [
    {
      testType: 'days',
      daysThreshold: 182,
      description:
        'An individual is "Resident" in India in a previous year if they are in India for 182 days or more during that year, OR if they are in India for 60 days or more during that year and 365 days or more during the 4 preceding years. Indian citizens and PIOs returning from abroad get the higher 182-day threshold only. Residents are further classified as "Ordinarily Resident" or "Not Ordinarily Resident" based on prior-year residency history.',
      categories: [
        {
          id: 'in-resident',
          name: 'Resident and Ordinarily Resident (ROR)',
          description:
            'An individual who is Resident and has been Resident in India in at least 2 of the 10 preceding previous years AND has been in India for 730 days or more during the 7 preceding previous years. Taxed on worldwide income.',
          taxScope: 'worldwide',
        },
        {
          id: 'in-rnor',
          name: 'Resident but Not Ordinarily Resident (RNOR)',
          description:
            'An individual who is Resident but does not satisfy the additional conditions for Ordinarily Resident status. Also includes Indian citizens or PIOs with total income exceeding INR 15 lakh (other than foreign sources) who are deemed resident under §6(1A). Taxed on Indian income and income received or deemed received in India.',
          taxScope: 'remittance',
        },
        {
          id: 'in-nri',
          name: 'Non-Resident Indian (NRI)',
          description:
            'An individual who does not meet the residency thresholds. Taxed only on income received, accrued, or deemed to accrue in India.',
          taxScope: 'domestic',
        },
      ],
      source: 'Income Tax Act 1961 §6; CBDT Circular No. 2/2022',
    },
  ],

  estateTax: {
    exists: false,
    taxBase: 'none',
    brackets: [],
    exemptions: [
      {
        name: 'Estate Duty Abolished',
        amount: 0,
        conditions:
          'India abolished estate duty (inheritance tax) with effect from 16 March 1985 through the Estate Duty (Amendment) Act, 1985. There is currently no tax on the transfer of assets on death.',
        source: 'Estate Duty (Amendment) Act, 1985',
      },
    ],
    spousalProvisions: [
      {
        name: 'No Estate Tax - Spousal Transfer',
        description:
          'Since there is no estate tax in India, there are no specific spousal provisions related to estate duty. Assets pass to the surviving spouse without any estate or inheritance tax.',
        conditions: 'N/A - no estate tax exists.',
        source: 'Estate Duty (Amendment) Act, 1985',
      },
    ],
    specialRules: [
      {
        id: 'in-stamp-duty',
        name: 'Stamp Duty on Property Transfers',
        description:
          'While there is no estate or inheritance tax, stamp duty is levied on the transfer of immovable property including through inheritance in some states. Rates vary by state, typically ranging from 5% to 7% of the property value. Some states offer concessional rates or exemptions for transfers between close family members or through inheritance.',
        trigger: 'Transfer or registration of immovable property.',
        effect:
          'Stamp duty of 5-7% (varies by state) on the higher of the transaction value or the circle rate/ready reckoner rate.',
        source: 'Indian Stamp Act 1899; respective state stamp duty legislation',
      },
      {
        id: 'in-income-from-inheritance',
        name: 'Income from Inherited Assets Is Taxable',
        description:
          'While the receipt of inheritance is exempt under §10(2), any income subsequently earned from inherited assets (rent, dividends, interest, capital gains on disposal) is fully taxable in the hands of the recipient at applicable rates.',
        trigger: 'Generation of income or gains from inherited assets after the date of inheritance.',
        effect: 'Income or gains taxed at normal applicable rates in the hands of the inheritor.',
        source: 'Income Tax Act 1961 §10(2); §56(2)(x)',
      },
      {
        id: 'in-section-56-exemption',
        name: 'Section 56(2)(x) - Gift Tax Exemption for Inheritance',
        description:
          'Property received by way of inheritance or under a will is specifically exempt from the deemed gift provisions of §56(2)(x). Additionally, gifts from specified relatives (spouse, siblings, lineal ascendants/descendants) are exempt regardless of value.',
        trigger: 'Receipt of property through inheritance, will, or gift from a relative.',
        effect: 'No income tax on the receipt of the inherited or gifted property itself.',
        source: 'Income Tax Act 1961 §56(2)(x), proviso',
      },
    ],
    currency: 'INR',
  },

  giftTax: {
    exists: true,
    annualExclusion: 50_000,
    lifetimeExemption: null,
    spousalExclusion: Infinity,
    nonCitizenSpousalExclusion: Infinity,
    brackets: [
      { from: 0, to: 50_000, rate: 0.0 },
      { from: 50_000, to: null, rate: 0.30 },
    ],
    currency: 'INR',
    specialRules: [
      {
        id: 'in-gift-relatives',
        name: 'Gifts from Relatives Fully Exempt',
        description:
          'Gifts received from "relatives" as defined in the Income Tax Act are fully exempt from tax regardless of the amount. Relatives include spouse, brother, sister, brother or sister of spouse, brother or sister of either parent, lineal ascendant or descendant (and their spouses).',
        trigger: 'Gift from a person qualifying as a "relative" under §56(2)(x).',
        effect: 'Complete exemption from income tax on the gift, regardless of value.',
        source: 'Income Tax Act 1961 §56(2)(x); Explanation (e)',
      },
      {
        id: 'in-gift-occasions',
        name: 'Gifts on Specified Occasions Exempt',
        description:
          'Gifts received on the occasion of marriage of the individual are fully exempt. Gifts received under a will or by way of inheritance are also exempt.',
        trigger: 'Marriage, inheritance, or will.',
        effect: 'Complete exemption from income tax.',
        source: 'Income Tax Act 1961 §56(2)(x), proviso (iv) and (v)',
      },
      {
        id: 'in-gift-aggregate',
        name: 'Aggregate Threshold for Non-Relative Gifts',
        description:
          'The INR 50,000 threshold applies to the aggregate value of all gifts (money, immovable property, and movable property) received from non-relatives during the financial year. If the aggregate exceeds INR 50,000, the entire amount (not just the excess) is taxable.',
        trigger: 'Aggregate gifts from non-relatives exceeding INR 50,000 in a financial year.',
        effect: 'The entire aggregate gift amount becomes taxable at the recipient\'s applicable slab rate.',
        source: 'Income Tax Act 1961 §56(2)(x)',
      },
    ],
  },

  capitalGainsTax: {
    exists: true,
    shortTermBrackets: [
      { from: 0, to: 300_000, rate: 0.0 },
      { from: 300_000, to: 600_000, rate: 0.05 },
      { from: 600_000, to: 900_000, rate: 0.10 },
      { from: 900_000, to: 1_200_000, rate: 0.15 },
      { from: 1_200_000, to: 1_500_000, rate: 0.20 },
      { from: 1_500_000, to: null, rate: 0.30 },
    ],
    longTermBrackets: [
      { from: 0, to: null, rate: 0.20 },
    ],
    holdingPeriodMonths: 24,
    exemptions: [
      {
        name: 'Indexation of Cost Base for Inherited Assets',
        amount: 0,
        conditions:
          'When inherited property is sold, the cost basis is the original cost to the previous owner (or FMV as of 1 April 2001, whichever is higher). Cost Inflation Index (CII) indexation is applied from the year of acquisition by the previous owner (or 2001-02) to the year of sale, significantly reducing the taxable long-term capital gain.',
        source: 'Income Tax Act 1961 §49(1); §55(2)(b); CII notification',
      },
      {
        name: 'Section 54 - Residential Property Reinvestment',
        amount: 0,
        conditions:
          'LTCG on sale of a residential house is exempt if the net consideration is reinvested in one residential property (up to INR 10 crore) within 1 year before or 2 years after sale (purchase) or 3 years after sale (construction).',
        source: 'Income Tax Act 1961 §54',
      },
      {
        name: 'Section 54EC - Investment in Specified Bonds',
        amount: 5_000_000,
        conditions:
          'LTCG on any capital asset is exempt up to INR 50 lakh if invested in specified bonds (NHAI/REC/IRFC/PFC) within 6 months of the transfer. Lock-in period of 5 years.',
        source: 'Income Tax Act 1961 §54EC',
      },
      {
        name: 'Section 54F - Reinvestment of Non-Residential Property Gains',
        amount: 0,
        conditions:
          'LTCG on sale of any capital asset other than a residential house is exempt if the full net consideration is invested in one residential property. Proportional exemption if partial investment.',
        source: 'Income Tax Act 1961 §54F',
      },
    ],
    currency: 'INR',
  },

  filingObligations: [
    {
      name: 'ITR (Income Tax Return)',
      description:
        'Mandatory annual income tax return. Relevant forms for individuals: ITR-1 (Sahaj) for salaried individuals with income up to INR 50 lakh; ITR-2 for individuals with capital gains, foreign income/assets, or income above INR 50 lakh; ITR-3 for individuals with business/professional income.',
      deadline:
        '31 July of the assessment year (for non-audit cases). 31 October for individuals subject to tax audit. Belated return can be filed until 31 December of the assessment year.',
      penalty:
        'Late filing fee under §234F: INR 5,000 if filed before 31 December; INR 10,000 thereafter (reduced to INR 1,000 if total income does not exceed INR 5 lakh). Interest under §234A at 1% per month on unpaid tax from the due date.',
      source: 'Income Tax Act 1961 §139; §234A; §234F',
    },
    {
      name: 'Schedule FA - Foreign Assets Reporting',
      description:
        'Resident and ordinarily resident individuals must disclose all foreign assets (bank accounts, financial interests, immovable property, accounts where signing authority held, trusts, and other capital assets) in Schedule FA of the income tax return.',
      deadline: 'Filed as part of the annual income tax return (ITR-2 or ITR-3).',
      penalty:
        'Penalty of INR 10 lakh under §43 of the Black Money Act for non-disclosure. Income from undisclosed foreign assets taxed at 30% plus surcharge and cess. Criminal prosecution possible under the Black Money (Undisclosed Foreign Income and Assets) and Imposition of Tax Act, 2015.',
      source: 'Income Tax Act 1961 §139; Black Money Act 2015 §§42-43',
    },
  ],

  capitalControls: {
    hasControls: true,
    outboundLimits: [
      {
        name: 'Liberalised Remittance Scheme (LRS)',
        annualLimitUSD: 250_000,
        perTransactionLimitUSD: null,
        conditions:
          'Resident individuals may remit up to USD 250,000 per financial year for permitted current and capital account transactions. Includes investments, gifts, donations, travel, education, medical treatment. TCS of 5% (education loan) or 20% (other) applies above INR 7 lakh.',
        source: 'FEMA Act 1999; RBI Master Direction on LRS (updated Jan 2024)',
      },
      {
        name: 'NRO Account Repatriation',
        annualLimitUSD: 1_000_000,
        perTransactionLimitUSD: null,
        conditions:
          'NRIs and PIOs may repatriate up to USD 1 million per financial year from NRO accounts (after tax). Requires Form 15CA/15CB certification. Covers sale proceeds of assets, inheritance, rental income. Balance in NRO above this limit requires RBI approval.',
        source: 'FEMA Act 1999; RBI Master Direction – Remittance of Assets (FED Master Direction No. 12)',
      },
    ],
    accountRequirements: [
      {
        accountType: 'NRO',
        description: 'Non-Resident Ordinary account — for Indian-source income (rent, dividends, pension). Rupee-denominated.',
        restrictions: 'Repatriation capped at USD 1M/year after tax. Joint holding with resident Indian permitted.',
        repatriable: true,
        source: 'FEMA (Deposit) Regulations 2016',
      },
      {
        accountType: 'NRE',
        description: 'Non-Resident External account — for foreign earnings. Rupee-denominated, fully repatriable.',
        restrictions: 'Cannot credit Indian-source income. Interest is tax-exempt for NRIs. Freely repatriable.',
        repatriable: true,
        source: 'FEMA (Deposit) Regulations 2016',
      },
      {
        accountType: 'FCNR',
        description: 'Foreign Currency Non-Resident account — term deposits in foreign currency. Fully repatriable.',
        restrictions: 'Only term deposits (1-5 years). Available in USD, GBP, EUR, JPY, CAD, AUD. Interest tax-exempt for NRIs.',
        repatriable: true,
        source: 'FEMA (Deposit) Regulations 2016',
      },
    ],
    approvalThresholds: [
      {
        name: 'RBI Approval for Repatriation Above USD 1M',
        thresholdUSD: 1_000_000,
        authority: 'Reserve Bank of India (RBI)',
        documentation: [
          'Form 15CA (online declaration)',
          'Form 15CB (CA certificate)',
          'Tax clearance certificate',
          'Documentary evidence of source of funds',
          'Board resolution (if applicable)',
        ],
        timelineWeeks: 4,
        source: 'FEMA Act 1999; RBI FAQs on Remittance of Assets',
      },
    ],
    documentationRequired: [
      'Form 15CA — Online declaration to Income Tax department for foreign remittances',
      'Form 15CB — Chartered Accountant certificate certifying tax compliance and remittance details',
      'Tax Deducted at Source (TDS) certificate — 20% on LTCG, 30% on STCG for NRIs',
      'PAN card and Aadhaar (if applicable)',
      'FEMA declaration for transactions above specified thresholds',
    ],
    exemptions: [
      'NRE account balances are freely repatriable without limit',
      'FCNR deposits are freely repatriable upon maturity',
      'Current account transactions (e.g. maintenance of close relatives) have separate exemptions',
      'Gifts from relatives under Section 56(2)(x) are exempt from TDS',
    ],
    source: 'FEMA Act 1999; RBI Master Direction on LRS; RBI Master Direction on Remittance of Assets',
  } satisfies CapitalControlRules,

  lastUpdated: '2024-01-01',
  source: 'Income Tax Act 1961; Finance Act 2023; CBDT Notifications; Estate Duty (Amendment) Act 1985',

  sunsetProvisions: [
    {
      name: 'Potential Reintroduction of Inheritance Tax',
      description:
        'There has been periodic policy discussion about reintroducing some form of estate or inheritance tax in India. While no legislation has been introduced, this remains a topic of policy debate. Any reintroduction would require a new Act of Parliament.',
      effectiveDate: 'N/A',
      impact:
        'Currently no legislative action. If introduced, would represent a fundamental change to cross-border estate planning involving India.',
      source: 'Policy discussions; no current legislative proposal',
    },
  ],
};
