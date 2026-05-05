// SARS-aware expense catalog.
//
// kind:
//   revenue  -> deductible against rental income in the year incurred
//   capital  -> NOT deductible; added to base cost for CGT on disposal
//   mixed    -> usually one but commonly the other; user must confirm
//
// Sources: SARS ITR12 "Local rental income" guide; Income Tax Act s11(a),
// s11(e), s24J; Practice Note 31; SARS Comprehensive Guide to Capital Gains Tax.
// This is reference material, not tax advice.

export type ExpenseKind = "revenue" | "capital" | "mixed";

export interface ExpenseCategory {
  code: string;
  label: string;
  group: "Bond" | "Property costs" | "Services & utilities" | "Letting costs" | "Capital" | "Other";
  kind: ExpenseKind;
  /** Default value of Expense.isCapital when this category is picked. */
  defaultIsCapital: boolean;
  guidance: string;
  /** Bond initiation fees are spread over the loan term (Practice Note 31 / s24J). */
  amortise?: "loan-term";
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  // --- Bond ---
  {
    code: "BOND_INTEREST",
    label: "Bond interest",
    group: "Bond",
    kind: "revenue",
    defaultIsCapital: false,
    guidance:
      "Interest paid on the bond used to acquire the property. Deductible under s11(a). " +
      "Capital repayments are NOT deductible. Prefer capturing this via Loan Statements " +
      "for accuracy.",
  },
  {
    code: "BOND_INITIATION",
    label: "Bond initiation / raising fee",
    group: "Bond",
    kind: "revenue",
    defaultIsCapital: false,
    amortise: "loan-term",
    guidance:
      "Once-off bond raising fee. Not fully deductible upfront — spread over the loan " +
      "period (Practice Note 31 / s24J). The tax engine amortises this for you.",
  },

  // --- Property costs (revenue) ---
  {
    code: "RATES_TAXES",
    label: "Municipal rates & taxes",
    group: "Property costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Rates billed by the municipality. Fully deductible.",
  },
  {
    code: "LEVIES_NORMAL",
    label: "Levies — normal (sectional title)",
    group: "Property costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Monthly body corporate levies. Fully deductible.",
  },
  {
    code: "LEVIES_SPECIAL",
    label: "Levies — special (sectional title)",
    group: "Property costs",
    kind: "mixed",
    defaultIsCapital: true,
    guidance:
      "Special levies funding capital improvements (new roof, paint job extending life, " +
      "lifts) are CAPITAL — added to base cost for CGT, not deductible. Special levies " +
      "for repairs of existing damage may be revenue. Check the body corporate notice.",
  },
  {
    code: "INSURANCE_BUILDING",
    label: "Insurance — building",
    group: "Property costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Building / structure insurance. Deductible.",
  },
  {
    code: "INSURANCE_CONTENTS",
    label: "Insurance — landlord contents",
    group: "Property costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Insurance on furniture/appliances you own and let with the property.",
  },
  {
    code: "REPAIRS",
    label: "Repairs & maintenance",
    group: "Property costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance:
      "Restoring the property to its previous state. Painting, plumbing leaks, broken " +
      "windows, replacing like-for-like. If you upgrade or extend, that is an improvement " +
      "(capital, not deductible).",
  },
  {
    code: "GARDEN",
    label: "Garden services",
    group: "Property costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Garden / pool service while letting.",
  },
  {
    code: "SECURITY",
    label: "Security / alarm / armed response",
    group: "Property costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Alarm monitoring, armed response, beams.",
  },
  {
    code: "CLEANING",
    label: "Cleaning",
    group: "Property costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Cleaning between tenancies or for short-term lets.",
  },
  {
    code: "WEAR_AND_TEAR",
    label: "Wear and tear on movables",
    group: "Property costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance:
      "s11(e) wear and tear on furniture and appliances let with the property. " +
      "Use SARS-prescribed write-off periods (e.g. 6 years for furniture).",
  },

  // --- Services & utilities ---
  {
    code: "WATER",
    label: "Water",
    group: "Services & utilities",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Where the landlord pays the water bill. If recovered from tenant, exclude.",
  },
  {
    code: "ELECTRICITY",
    label: "Electricity",
    group: "Services & utilities",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Where the landlord pays. If on prepaid funded by tenant, exclude.",
  },
  {
    code: "REFUSE",
    label: "Refuse removal",
    group: "Services & utilities",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Municipal refuse charges.",
  },
  {
    code: "SEWERAGE",
    label: "Sewerage",
    group: "Services & utilities",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Municipal sewerage charges.",
  },

  // --- Letting costs ---
  {
    code: "AGENT_FEES",
    label: "Agent / management fees",
    group: "Letting costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Letting agent commission and ongoing management fees.",
  },
  {
    code: "ADVERTISING",
    label: "Advertising / letting fees",
    group: "Letting costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Property24, Private Property, board and signage costs to find a tenant.",
  },
  {
    code: "ACCOUNTING",
    label: "Accounting / tax fees",
    group: "Letting costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Fees paid to your accountant for the rental portion of your return.",
  },
  {
    code: "BANK_CHARGES",
    label: "Bank charges",
    group: "Letting costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Bank charges on the account used to receive rent.",
  },
  {
    code: "LEGAL",
    label: "Legal fees (letting / collection)",
    group: "Letting costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance:
      "Legal fees for drafting leases, eviction proceedings, debt collection. " +
      "Legal fees for transfer / bond registration are CAPITAL.",
  },
  {
    code: "TRAVEL",
    label: "Travel to property",
    group: "Letting costs",
    kind: "revenue",
    defaultIsCapital: false,
    guidance: "Travel for inspection / management. Use SARS km rate or actual cost.",
  },

  // --- Capital ---
  {
    code: "TRANSFER_DUTY",
    label: "Transfer duty",
    group: "Capital",
    kind: "capital",
    defaultIsCapital: true,
    guidance: "Once-off transfer duty paid at acquisition. Capital — base cost for CGT.",
  },
  {
    code: "ATTORNEY_TRANSFER",
    label: "Attorney fees — transfer",
    group: "Capital",
    kind: "capital",
    defaultIsCapital: true,
    guidance: "Attorney fees for the transfer of the property. Base cost for CGT.",
  },
  {
    code: "ATTORNEY_BOND",
    label: "Attorney fees — bond registration",
    group: "Capital",
    kind: "capital",
    defaultIsCapital: true,
    guidance: "Attorney fees for registering the bond. Base cost for CGT.",
  },
  {
    code: "IMPROVEMENTS",
    label: "Capital improvements",
    group: "Capital",
    kind: "capital",
    defaultIsCapital: true,
    guidance:
      "Extensions, granny flats, new bathrooms, replacing the whole roof with a better " +
      "one. Adds to base cost for CGT, NOT deductible against rental income.",
  },

  // --- Other ---
  {
    code: "OTHER",
    label: "Other",
    group: "Other",
    kind: "mixed",
    defaultIsCapital: false,
    guidance: "Use sparingly. Add a clear description and decide capital vs revenue manually.",
  },
];

export const EXPENSE_CATEGORIES_BY_CODE: Record<string, ExpenseCategory> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.code, c]),
);

export function getCategory(code: string): ExpenseCategory | undefined {
  return EXPENSE_CATEGORIES_BY_CODE[code];
}

export const EXPENSE_GROUPS = Array.from(
  new Set(EXPENSE_CATEGORIES.map((c) => c.group)),
);
