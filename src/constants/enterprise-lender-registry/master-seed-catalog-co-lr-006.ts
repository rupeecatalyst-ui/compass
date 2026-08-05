/**
 * CO-LR-006 — Expanded Enterprise Lender Master seed (additive catalogue).
 * Merged into LENDER_MASTER_SEED_CATALOG. Idempotent via seedKey + name/alias match.
 * Product programmes use Product Master codes only (see normalizeSupportedProductCodes).
 */
import type {
  LenderInstitutionCategory,
  LenderMasterClassification,
  LenderRegistryProductCode,
} from "@/types/enterprise-lender-registry";
import type { LenderMasterSeedEntry } from "./master-seed-catalog";

export const CO_LR_006_MASTER_SEED_VERSION = 1;

/** Capability presets — only Product Master–resolvable codes. */
export const LR006_PRESETS = {
  BANK: [
    "home_loan",
    "home_loan_bt",
    "lap",
    "personal_loan",
    "business_loan",
    "msme_loan",
    "working_capital",
    "cash_credit",
    "overdraft",
    "education_loan",
    "vehicle_loan",
    "construction_finance",
    "lrd",
    "trade_finance",
    "project_finance",
  ],
  BANK_CORP: [
    "business_loan",
    "msme_loan",
    "working_capital",
    "cash_credit",
    "overdraft",
    "supply_chain_finance",
    "invoice_financing",
    "bill_discounting",
    "machinery_finance",
    "equipment_finance",
    "construction_finance",
    "lrd",
    "project_finance",
    "trade_finance",
    "export_finance",
    "lap",
  ],
  HFC: [
    "home_loan",
    "home_loan_bt",
    "lap",
    "construction_finance",
    "lrd",
  ],
  NBFC_RETAIL: [
    "personal_loan",
    "business_loan",
    "msme_loan",
    "lap",
    "home_loan",
    "vehicle_loan",
  ],
  NBFC_GOLD: ["gold_loan", "personal_loan", "business_loan"],
  NBFC_AUTO: [
    "vehicle_loan",
    "commercial_vehicle_loan",
    "machinery_finance",
    "equipment_finance",
    "business_loan",
  ],
  NBFC_MSME: [
    "business_loan",
    "msme_loan",
    "working_capital",
    "invoice_financing",
    "machinery_finance",
    "equipment_finance",
    "lap",
  ],
  NBFC_INFRA: [
    "project_finance",
    "construction_finance",
    "equipment_finance",
    "machinery_finance",
    "business_loan",
  ],
  FINTECH: ["personal_loan", "business_loan", "msme_loan", "invoice_financing"],
  SFB: [
    "home_loan",
    "personal_loan",
    "business_loan",
    "msme_loan",
    "working_capital",
    "gold_loan",
    "vehicle_loan",
  ],
  COOP: [
    "home_loan",
    "personal_loan",
    "business_loan",
    "gold_loan",
    "vehicle_loan",
    "working_capital",
  ],
  FOREIGN: [
    "home_loan",
    "home_loan_bt",
    "lap",
    "personal_loan",
    "business_loan",
    "working_capital",
    "trade_finance",
    "export_finance",
    "project_finance",
  ],
  PAYMENTS: ["personal_loan"],
} as const satisfies Record<string, readonly LenderRegistryProductCode[]>;

export type Lr006Preset = keyof typeof LR006_PRESETS;

type CompactLender = {
  k: string;
  n: string;
  d?: string;
  s: string;
  a?: string[];
  c: LenderMasterClassification;
  i: LenderInstitutionCategory;
  cat?: string;
  hq?: string;
  w?: string;
  p: Lr006Preset;
};

function expand(row: CompactLender): LenderMasterSeedEntry {
  return {
    seedKey: row.k,
    legalName: row.n,
    displayName: row.d ?? row.n,
    shortName: row.s,
    aliases: row.a ?? [row.s],
    classification: row.c,
    institutionCategory: row.i,
    categoryCode: row.cat,
    website: row.w,
    headquartersLabel: row.hq,
    rbiRegulated: true,
    panIndia: true,
    productsSupported: [...LR006_PRESETS[row.p]],
  };
}

/** Additive lenders — must not collide with baseline seedKeys in master-seed-catalog.ts */
const COMPACT: CompactLender[] = [
  // —— Additional Private Sector / Regional Banks ——
  { k: "dhanlaxmi_bank", n: "Dhanlaxmi Bank Limited", d: "Dhanlaxmi Bank", s: "Dhanlaxmi", a: ["Dhanalakshmi Bank"], c: "private_sector_bank", i: "bank", hq: "Thrissur", w: "https://www.dhanbank.com", p: "BANK" },
  { k: "laxmi_vilas", n: "Lakshmi Vilas Bank", d: "Lakshmi Vilas Bank (Legacy)", s: "LVB", a: ["LVB", "Lakshmi Vilas"], c: "private_sector_bank", i: "bank", hq: "Chennai", p: "BANK" },

  // —— Additional SFBs ——
  { k: "fincare_sfb", n: "Fincare Small Finance Bank Limited", d: "Fincare Small Finance Bank", s: "Fincare SFB", a: ["Fincare"], c: "small_finance_bank", i: "bank", hq: "Bengaluru", w: "https://www.fincarebank.com", p: "SFB" },
  { k: "ujjivan_small_finance_ext", n: "Ujjivan Financial Services — Legacy", d: "Ujjivan Financial Services", s: "Ujjivan FS", a: ["Ujjivan Financial"], c: "nbfc", i: "nbfc", hq: "Bengaluru", p: "NBFC_MSME" },

  // —— Additional HFCs ——
  { k: "hdfc_ltd_hfc", n: "HDFC Limited", d: "HDFC Ltd (Housing)", s: "HDFC Ltd", a: ["Housing Development Finance Corporation"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.hdfc.com", p: "HFC" },
  { k: "indiabulls_housing", n: "Indiabulls Housing Finance Limited", d: "Sammaan Capital (Indiabulls Housing)", s: "Sammaan Capital", a: ["Sammaan Capital", "Indiabulls Housing", "Indiabulls Housing Finance", "IBHFL"], c: "housing_finance_company", i: "hfc", hq: "Gurugram", w: "https://www.indiabullshomeloans.com", p: "HFC" },
  { k: "dhfl_legacy", n: " Dewan Housing Finance Corporation Limited", d: "DHFL (Legacy)", s: "DHFL", a: ["Dewan Housing"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", p: "HFC" },
  { k: "gruh_finance", n: "GRUH Finance Limited", d: "GRUH Finance", s: "GRUH", a: ["Gruh"], c: "housing_finance_company", i: "hfc", hq: "Ahmedabad", p: "HFC" },
  { k: "reliance_home", n: "Reliance Home Finance Limited", d: "Reliance Home Finance", s: "RHF", a: ["Reliance Home"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.reliancehomefinance.com", p: "HFC" },
  { k: "tata_housing", n: "Tata Housing Development Company", d: "Tata Housing Finance", s: "Tata Housing", a: ["Tata HFL"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", p: "HFC" },
  { k: "mahindra_rural_housing", n: "Mahindra Rural Housing Finance Limited", d: "Mahindra Rural Housing Finance", s: "MRHFL", a: ["Mahindra Housing"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.mahindrahomefinance.com", p: "HFC" },
  { k: "vastu_housing", n: "Vastu Housing Finance Corporation Limited", d: "Vastu Housing Finance", s: "Vastu HFC", a: ["Vastu"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.vastuhfc.com", p: "HFC" },
  { k: "clix_housing", n: "Clix Housing Finance Limited", d: "Clix Housing Finance", s: "Clix HFC", a: ["Clix"], c: "housing_finance_company", i: "hfc", hq: "Gurugram", p: "HFC" },
  { k: "hero_housing", n: "Hero Housing Finance Limited", d: "Hero Housing Finance", s: "Hero HFC", a: ["Hero Housing"], c: "housing_finance_company", i: "hfc", hq: "New Delhi", w: "https://www.herohousingfinance.com", p: "HFC" },
  { k: "shriram_housing", n: "Shriram Housing Finance Limited", d: "Shriram Housing Finance", s: "Shriram HFC", a: ["Shriram Housing"], c: "housing_finance_company", i: "hfc", hq: "Chennai", w: "https://www.shriramhousing.in", p: "HFC" },
  { k: "magna_housing", n: "Magma Housing Finance Limited", d: "Magma Housing Finance", s: "Magma HFC", a: ["Poonawalla Housing"], c: "housing_finance_company", i: "hfc", hq: "Kolkata", p: "HFC" },
  { k: "fullerton_india_credit", n: "Fullerton India Credit Company Limited", d: "Fullerton India", s: "Fullerton", a: ["Fullerton India Credit"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.fullertonindia.com", p: "NBFC_RETAIL" },
  { k: "fullerton_india_home", n: "Fullerton India Home Finance Company", d: "Fullerton India Home Finance", s: "Fullerton Home", a: ["Fullerton HFC"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", p: "HFC" },
  { k: "axis_finance_hfc", n: "Axis Finance Limited", d: "Axis Finance", s: "Axis Finance", a: ["Axis Finance Ltd"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.axisfinance.co.in", p: "NBFC_MSME" },
  { k: "icici_home_finance", n: "ICICI Home Finance Company Limited", d: "ICICI Home Finance", s: "ICICI HFC", a: ["ICICI Homefinance"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.icicihfc.com", p: "HFC" },
  { k: "kotak_mahindra_prime", n: "Kotak Mahindra Prime Limited", d: "Kotak Mahindra Prime", s: "Kotak Prime", a: ["Kotak Prime"], c: "nbfc", i: "nbfc", hq: "Mumbai", p: "NBFC_AUTO" },
  { k: "india_home_loan", n: "India Home Loan Limited", d: "India Home Loan", s: "IHL", a: ["India Home Loans"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", p: "HFC" },
  { k: "reliance_nippon", n: "Reliance Nippon Life Asset — Housing", d: "Reliance Nippon Housing", s: "RNAM HFC", a: ["Reliance Nippon"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", p: "HFC" },
  { k: "satin_housing", n: "Satin Housing Finance Limited", d: "Satin Housing Finance", s: "Satin HFC", a: ["Satin"], c: "housing_finance_company", i: "hfc", hq: "Gurugram", p: "HFC" },
  { k: "centrum_housing", n: "Centrum Housing Finance Limited", d: "Centrum Housing Finance", s: "Centrum HFC", a: ["Centrum"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", p: "HFC" },
  { k: "easy_home_finance", n: "Easy Home Finance Limited", d: "Easy Home Finance", s: "Easy Home", a: ["Easy HFC"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", p: "HFC" },
  { k: "nord_housing", n: "Nord Housing Finance", d: "Nord Housing Finance", s: "Nord HFC", a: ["Nord"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", p: "HFC" },
  { k: "altum_credo", n: "Altum Credo Home Finance", d: "Altum Credo", s: "Altum Credo", a: ["Altum"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", p: "HFC" },
  { k: "varthana", n: "Varthana Finance Private Limited", d: "Varthana", s: "Varthana", a: ["Varthana Finance"], c: "nbfc", i: "nbfc", hq: "Bengaluru", w: "https://www.varthana.com", p: "NBFC_MSME" },

  // —— NBFC Retail / Diversified ——
  { k: "hdfc_credila", n: "HDFC Credila Financial Services Limited", d: "HDFC Credila", s: "Credila", a: ["Credila"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.hdfccredila.com", p: "NBFC_RETAIL" },
  { k: "incred", n: "InCred Financial Services Limited", d: "InCred", s: "InCred", a: ["InCred Finance"], c: "nbfc", i: "fintech", hq: "Mumbai", w: "https://www.incred.com", p: "FINTECH" },
  { k: "lendingkart", n: "Lendingkart Finance Limited", d: "Lendingkart", s: "Lendingkart", a: ["Lending Kart"], c: "nbfc", i: "fintech", hq: "Ahmedabad", w: "https://www.lendingkart.com", p: "FINTECH" },
  { k: "capital_float", n: "Capital Float Financial Services", d: "Capital Float", s: "Capital Float", a: ["CapitalFloat"], c: "nbfc", i: "fintech", hq: "Bengaluru", p: "FINTECH" },
  { k: "neogrowth", n: "NeoGrowth Credit Private Limited", d: "NeoGrowth", s: "NeoGrowth", a: ["Neo Growth"], c: "nbfc", i: "fintech", hq: "Mumbai", w: "https://www.neogrowth.in", p: "FINTECH" },
  { k: "indifi", n: "Indifi Technologies Private Limited", d: "Indifi", s: "Indifi", a: ["Indifi Finance"], c: "nbfc", i: "fintech", hq: "Gurugram", w: "https://www.indifi.com", p: "FINTECH" },
  { k: "flexiloans", n: "FlexiLoans Technologies Private Limited", d: "FlexiLoans", s: "FlexiLoans", a: ["Flexi Loans"], c: "nbfc", i: "fintech", hq: "Mumbai", w: "https://flexiloans.com", p: "FINTECH" },
  { k: "kreditbee", n: "Finnovation Tech Solutions Private Limited", d: "KreditBee", s: "KreditBee", a: ["Kredit Bee"], c: "nbfc", i: "fintech", hq: "Bengaluru", w: "https://www.kreditbee.in", p: "FINTECH" },
  { k: "moneytap", n: "MoneyTap Tech Solutions", d: "MoneyTap", s: "MoneyTap", a: ["Money Tap"], c: "nbfc", i: "fintech", hq: "Bengaluru", p: "FINTECH" },
  { k: "earlysalary", n: "EarlySalary Services Private Limited", d: "EarlySalary / Fibe", s: "Fibe", a: ["EarlySalary", "Fibe"], c: "nbfc", i: "fintech", hq: "Pune", w: "https://www.fibe.in", p: "FINTECH" },
  { k: "cashe", n: "Handy Online Solutions Private Limited", d: "CASHe", s: "CASHe", a: ["Cash-e"], c: "nbfc", i: "fintech", hq: "Mumbai", w: "https://www.cashe.co.in", p: "FINTECH" },
  { k: "navi", n: "Navi Technologies Limited", d: "Navi", s: "Navi", a: ["Navi Finserv"], c: "nbfc", i: "fintech", hq: "Bengaluru", w: "https://navi.com", p: "FINTECH" },
  { k: "payu_finance", n: "PayU Finance India Private Limited", d: "PayU Finance", s: "PayU Finance", a: ["PayU"], c: "nbfc", i: "fintech", hq: "Gurugram", p: "FINTECH" },
  { k: "amazon_pay_later", n: "Amazon Pay (India) Private Limited — Credit", d: "Amazon Pay Credit", s: "Amazon Pay", a: ["Amazon"], c: "nbfc", i: "fintech", hq: "Bengaluru", p: "FINTECH" },
  { k: "simpl", n: "Get Simpl Technologies Private Limited", d: "Simpl", s: "Simpl", a: ["Get Simpl"], c: "nbfc", i: "fintech", hq: "Bengaluru", p: "FINTECH" },
  { k: "lazy_pay", n: "PayU LazyPay", d: "LazyPay", s: "LazyPay", a: ["Lazy Pay"], c: "nbfc", i: "fintech", hq: "Gurugram", p: "FINTECH" },
  { k: "slice", n: "Garagepreneurs Internet Private Limited", d: "Slice", s: "Slice", a: ["Slice Pay"], c: "nbfc", i: "fintech", hq: "Bengaluru", p: "FINTECH" },
  { k: "uni_cards", n: "Uni Cards", d: "Uni", s: "Uni", a: ["Uni Cards"], c: "nbfc", i: "fintech", hq: "Bengaluru", p: "FINTECH" },
  { k: "cred_avenue", n: "Dreamplug Technologies Private Limited", d: "CRED", s: "CRED", a: ["CRED Avenue"], c: "nbfc", i: "fintech", hq: "Bengaluru", p: "FINTECH" },

  // —— Gold Loan NBFCs ——
  { k: "muthoot_fincorp", n: "Muthoot Fincorp Limited", d: "Muthoot Fincorp", s: "Muthoot Fincorp", a: ["Muthoot Blue"], c: "nbfc", i: "nbfc", hq: "Thiruvananthapuram", w: "https://www.muthootfincorp.com", p: "NBFC_GOLD" },
  { k: "muthoot_capital", n: "Muthoot Capital Services Limited", d: "Muthoot Capital", s: "Muthoot Capital", a: ["MCSL"], c: "nbfc", i: "nbfc", hq: "Kochi", w: "https://www.muthootcap.com", p: "NBFC_AUTO" },
  { k: "manappuram_finance", n: "Manappuram Finance Limited", d: "Manappuram Finance", s: "Manappuram", a: ["Manappuram"], c: "nbfc", i: "nbfc", hq: "Thrissur", w: "https://www.manappuram.com", p: "NBFC_GOLD" },
  { k: "iifl_samasta", n: "IIFL Samasta Finance Limited", d: "IIFL Samasta", s: "Samasta", a: ["Samasta Microfinance"], c: "nbfc", i: "nbfc", hq: "Bengaluru", p: "NBFC_MSME" },
  { k: "berar_finance", n: "Berar Finance Limited", d: "Berar Finance", s: "Berar", a: ["Berar"], c: "nbfc", i: "nbfc", hq: "Nagpur", p: "NBFC_GOLD" },
  { k: "thirumeni_finance", n: "Thirumeni Finance", d: "Thirumeni Finance", s: "Thirumeni", a: ["Thirumeni"], c: "nbfc", i: "nbfc", hq: "Chennai", p: "NBFC_GOLD" },
  { k: "kosamattam", n: "Kosamattam Finance Limited", d: "Kosamattam Finance", s: "Kosamattam", a: ["Kosamattam"], c: "nbfc", i: "nbfc", hq: "Kottayam", p: "NBFC_GOLD" },
  { k: "iocl_finance", n: "Indian Oil Corporation — Customer Finance", d: "IOC Finance Desk", s: "IOC", a: ["Indian Oil Finance"], c: "nbfc", i: "other", hq: "New Delhi", p: "NBFC_MSME" },

  // —— Vehicle / Equipment ——
  { k: "sundaram_finance", n: "Sundaram Finance Limited", d: "Sundaram Finance", s: "Sundaram Finance", a: ["Sundaram"], c: "nbfc", i: "nbfc", hq: "Chennai", w: "https://www.sundaramfinance.in", p: "NBFC_AUTO" },
  { k: "cholamandalam", n: "Cholamandalam Investment and Finance Company Limited", d: "Cholamandalam Finance", s: "Chola", a: ["Chola Finance", "CIFCL"], c: "nbfc", i: "nbfc", hq: "Chennai", w: "https://www.cholamandalam.com", p: "NBFC_AUTO" },
  { k: "mahindra_finance_ext", n: "Mahindra & Mahindra Financial Services Limited", d: "Mahindra Finance", s: "Mahindra Finance", a: ["MMFSL"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.mahindrafinance.com", p: "NBFC_AUTO" },
  { k: "shriram_transport", n: "Shriram Finance Limited", d: "Shriram Finance", s: "Shriram Finance", a: ["Shriram Transport", "STFC"], c: "nbfc", i: "nbfc", hq: "Chennai", w: "https://www.shriramfinance.in", p: "NBFC_AUTO" },
  { k: "hinduja_leyland_finance", n: "Hinduja Leyland Finance Limited", d: "Hinduja Leyland Finance", s: "HLF", a: ["Hinduja Leyland"], c: "nbfc", i: "nbfc", hq: "Chennai", w: "https://www.hindujaleylandfinance.com", p: "NBFC_AUTO" },
  { k: "tata_motors_finance", n: "Tata Motors Finance Limited", d: "Tata Motors Finance", s: "TMFL", a: ["TMF Holdings"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.tmf.co.in", p: "NBFC_AUTO" },
  { k: "toyota_financial", n: "Toyota Financial Services India Limited", d: "Toyota Financial Services", s: "TFS India", a: ["Toyota Finance"], c: "nbfc", i: "nbfc", hq: "Bengaluru", w: "https://www.toyotafinancial.co.in", p: "NBFC_AUTO" },
  { k: "mercedes_benz_fs", n: "Mercedes-Benz Financial Services India", d: "Mercedes-Benz Financial Services", s: "MBFS", a: ["Mercedes Finance"], c: "nbfc", i: "nbfc", hq: "Pune", p: "NBFC_AUTO" },
  { k: "bmw_financial", n: "BMW Financial Services India", d: "BMW Financial Services", s: "BMW FS", a: ["BMW Finance"], c: "nbfc", i: "nbfc", hq: "Gurugram", p: "NBFC_AUTO" },
  { k: "volvo_financial", n: "Volvo Financial Services India", d: "Volvo Financial Services", s: "Volvo FS", a: ["Volvo Finance"], c: "nbfc", i: "nbfc", hq: "Bengaluru", p: "NBFC_AUTO" },
  { k: "john_deere_financial", n: "John Deere Financial India Private Limited", d: "John Deere Financial", s: "John Deere FS", a: ["JD Financial"], c: "nbfc", i: "nbfc", hq: "Pune", p: "NBFC_AUTO" },
  { k: "l_t_finance", n: "L&T Finance Limited", d: "L&T Finance", s: "L&T Finance", a: ["LTFS", "Larsen Toubro Finance"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.ltfs.com", p: "NBFC_INFRA" },
  { k: "srei_equipment", n: "Srei Equipment Finance Limited", d: "Srei Equipment Finance", s: "Srei", a: ["SREI"], c: "nbfc", i: "nbfc", hq: "Kolkata", p: "NBFC_INFRA" },
  { k: "tirupati_urban", n: "Tirupati Urban Co-operative Bank", d: "Tirupati Urban Co-op Bank", s: "TUCB", a: ["Tirupati UCB"], c: "cooperative_bank", i: "cooperative", hq: "Tirupati", p: "COOP" },

  // —— MSME / Business NBFCs ——
  { k: "ugro_capital", n: "UGRO Capital Limited", d: "UGRO Capital", s: "UGRO", a: ["Ugro"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.ugrocapital.com", p: "NBFC_MSME" },
  { k: "vivriti_capital", n: "Vivriti Capital Limited", d: "Vivriti Capital", s: "Vivriti", a: ["Vivriti"], c: "nbfc", i: "nbfc", hq: "Chennai", w: "https://www.vivriticapital.com", p: "NBFC_MSME" },
  { k: "northern_arc", n: "Northern Arc Capital Limited", d: "Northern Arc", s: "Northern Arc", a: ["IFMR Capital"], c: "nbfc", i: "nbfc", hq: "Chennai", w: "https://www.northernarc.com", p: "NBFC_MSME" },
  { k: "electronica_finance", n: "Electronica Finance Limited", d: "Electronica Finance", s: "EFL", a: ["Electronica"], c: "nbfc", i: "nbfc", hq: "Pune", w: "https://www.electronicsfinance.com", p: "NBFC_MSME" },
  { k: "smfg_india", n: "SMFG India Credit Company Limited", d: "SMFG India Credit", s: "SMFG", a: ["Fullerton India Credit successor"], c: "nbfc", i: "nbfc", hq: "Mumbai", p: "NBFC_RETAIL" },
  { k: "protium", n: "Protium Finance Limited", d: "Protium", s: "Protium", a: ["Protium Finance"], c: "nbfc", i: "fintech", hq: "Mumbai", w: "https://www.protium.co.in", p: "FINTECH" },
  { k: "kinara_capital", n: "Kinara Capital Private Limited", d: "Kinara Capital", s: "Kinara", a: ["Kinara"], c: "nbfc", i: "nbfc", hq: "Bengaluru", w: "https://www.kinaracapital.com", p: "NBFC_MSME" },
  { k: "aye_finance", n: "Aye Finance Private Limited", d: "Aye Finance", s: "Aye", a: ["Aye Fin"], c: "nbfc", i: "nbfc", hq: "Gurugram", w: "https://www.ayefin.com", p: "NBFC_MSME" },
  { k: "svatantra", n: "Svatantra Microfin Private Limited", d: "Svatantra", s: "Svatantra", a: ["Svatantra Microfin"], c: "nbfc", i: "nbfc", hq: "Mumbai", p: "NBFC_MSME" },
  { k: "annapurna_finance", n: "Annapurna Finance Private Limited", d: "Annapurna Finance", s: "Annapurna", a: ["Annapurna"], c: "nbfc", i: "nbfc", hq: "Bhubaneswar", p: "NBFC_MSME" },
  { k: "satin_creditcare", n: "Satin Creditcare Network Limited", d: "Satin Creditcare", s: "Satin", a: ["Satin Creditcare"], c: "nbfc", i: "nbfc", hq: "Gurugram", w: "https://www.satincreditcare.com", p: "NBFC_MSME" },
  { k: "spandana", n: "Spandana Sphoorty Financial Limited", d: "Spandana Sphoorty", s: "Spandana", a: ["Spandana"], c: "nbfc", i: "nbfc", hq: "Hyderabad", w: "https://www.spandanaindia.com", p: "NBFC_MSME" },
  { k: "creditaccess", n: "CreditAccess Grameen Limited", d: "CreditAccess Grameen", s: "CA Grameen", a: ["Grameen Koota"], c: "nbfc", i: "nbfc", hq: "Bengaluru", w: "https://www.creditaccessgrameen.in", p: "NBFC_MSME" },
  { k: "fusion_finance", n: "Fusion Finance Limited", d: "Fusion Finance", s: "Fusion", a: ["Fusion Microfinance"], c: "nbfc", i: "nbfc", hq: "New Delhi", w: "https://fusionfin.com", p: "NBFC_MSME" },
  { k: "bandhan_financial", n: "Bandhan Financial Services", d: "Bandhan Financial Services", s: "Bandhan FS", a: ["Bandhan NBFC"], c: "nbfc", i: "nbfc", hq: "Kolkata", p: "NBFC_MSME" },
  { k: "arohan", n: "Arohan Financial Services Limited", d: "Arohan", s: "Arohan", a: ["Arohan Financial"], c: "nbfc", i: "nbfc", hq: "Kolkata", w: "https://www.arohan.in", p: "NBFC_MSME" },
  { k: "asirvad", n: "Asirvad Micro Finance Limited", d: "Asirvad Micro Finance", s: "Asirvad", a: ["Asirvad"], c: "nbfc", i: "nbfc", hq: "Chennai", p: "NBFC_MSME" },
  { k: "belstar", n: "Belstar Microfinance Limited", d: "Belstar Microfinance", s: "Belstar", a: ["Belstar"], c: "nbfc", i: "nbfc", hq: "Chennai", p: "NBFC_MSME" },
  { k: "muthoot_microfin", n: "Muthoot Microfin Limited", d: "Muthoot Microfin", s: "Muthoot Microfin", a: ["Muthoot Microfinance"], c: "nbfc", i: "nbfc", hq: "Kochi", p: "NBFC_MSME" },
  { k: "iifl_finance_ext", n: "IIFL Finance Limited", d: "IIFL Finance", s: "IIFL Finance", a: ["India Infoline Finance"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.iifl.com", p: "NBFC_RETAIL" },
  { k: "edelweiss_finance", n: "Edelweiss Financial Services — Credit", d: "Edelweiss Credit", s: "Edelweiss", a: ["Edelweiss Retail Finance"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.edelweissfin.com", p: "NBFC_RETAIL" },
  { k: "jm_financial", n: "JM Financial Limited — Credit", d: "JM Financial Credit", s: "JM Financial", a: ["JM Fin"], c: "nbfc", i: "nbfc", hq: "Mumbai", p: "NBFC_MSME" },
  { k: "motilal_oswal", n: "Motilal Oswal Financial Services — Credit", d: "Motilal Oswal Credit", s: "MOFSL Credit", a: ["Motilal Oswal"], c: "nbfc", i: "nbfc", hq: "Mumbai", p: "NBFC_RETAIL" },
  { k: "poonawalla_fincorp", n: "Poonawalla Fincorp Limited", d: "Poonawalla Fincorp", s: "Poonawalla Fincorp", a: ["Magma Fincorp"], c: "nbfc", i: "nbfc", hq: "Pune", w: "https://poonawallafincorp.com", p: "NBFC_RETAIL" },
  { k: "capri_global_ext", n: "Capri Global Capital Limited", d: "Capri Global", s: "Capri Global", a: ["CGCL"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.capriglobal.com", p: "NBFC_MSME" },
  { k: "hero_fincorp_ext", n: "Hero FinCorp Limited", d: "Hero FinCorp", s: "Hero FinCorp", a: ["Hero Fincorp"], c: "nbfc", i: "nbfc", hq: "New Delhi", w: "https://www.herofincorp.com", p: "NBFC_AUTO" },
  { k: "tata_capital_ext", n: "Tata Capital Limited", d: "Tata Capital", s: "Tata Capital", a: ["TCL"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.tatacapital.com", p: "NBFC_RETAIL" },
  { k: "aditya_birla_finance_ext", n: "Aditya Birla Finance Limited", d: "Aditya Birla Finance", s: "ABFL", a: ["ABFL"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.adityabirlafinance.com", p: "NBFC_RETAIL" },
  { k: "bajaj_finance_ext", n: "Bajaj Finance Limited", d: "Bajaj Finance", s: "Bajaj Finance", a: ["BFL"], c: "nbfc", i: "nbfc", hq: "Pune", w: "https://www.bajajfinserv.in", p: "NBFC_RETAIL" },
  { k: "piramal_capital", n: "Piramal Capital & Housing Finance Limited", d: "Piramal Capital", s: "Piramal Capital", a: ["PCHFL"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.piramalfinance.com", p: "NBFC_RETAIL" },

  // —— Infra / Corporate NBFCs ——
  { k: "rec_limited", n: "REC Limited", d: "REC Limited", s: "REC", a: ["Rural Electrification Corporation"], c: "nbfc", i: "nbfc", hq: "Gurugram", w: "https://www.recindia.nic.in", p: "NBFC_INFRA" },
  { k: "pfc", n: "Power Finance Corporation Limited", d: "Power Finance Corporation", s: "PFC", a: ["PFC Ltd"], c: "nbfc", i: "nbfc", hq: "New Delhi", w: "https://www.pfcindia.com", p: "NBFC_INFRA" },
  { k: "irfc", n: "Indian Railway Finance Corporation Limited", d: "IRFC", s: "IRFC", a: ["Railway Finance"], c: "nbfc", i: "nbfc", hq: "New Delhi", w: "https://irfc.co.in", p: "NBFC_INFRA" },
  { k: "hudco", n: "Housing and Urban Development Corporation Limited", d: "HUDCO", s: "HUDCO", a: ["HUDCO Ltd"], c: "nbfc", i: "nbfc", hq: "New Delhi", w: "https://www.hudco.org", p: "NBFC_INFRA" },
  { k: "ifc_india", n: "IFCI Limited", d: "IFCI", s: "IFCI", a: ["Industrial Finance Corporation of India"], c: "nbfc", i: "nbfc", hq: "New Delhi", w: "https://www.ifciltd.com", p: "NBFC_INFRA" },
  { k: "sidbi", n: "Small Industries Development Bank of India", d: "SIDBI", s: "SIDBI", a: ["Small Industries Development Bank"], c: "nbfc", i: "nbfc", hq: "Lucknow", w: "https://www.sidbi.in", p: "NBFC_MSME" },
  { k: "nabard", n: "National Bank for Agriculture and Rural Development", d: "NABARD", s: "NABARD", a: ["NABARD"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.nabard.org", p: "NBFC_MSME" },
  { k: "exim_bank", n: "Export-Import Bank of India", d: "EXIM Bank", s: "EXIM", a: ["Exim Bank of India"], c: "nbfc", i: "nbfc", hq: "Mumbai", w: "https://www.eximbankindia.in", p: "FOREIGN" },
  { k: "nhb", n: "National Housing Bank", d: "National Housing Bank", s: "NHB", a: ["NHB"], c: "nbfc", i: "nbfc", hq: "New Delhi", w: "https://www.nhb.org.in", p: "HFC" },

  // —— Co-operative Banks (major) ——
  { k: "saraswat_coop", n: "Saraswat Co-operative Bank Limited", d: "Saraswat Co-operative Bank", s: "Saraswat", a: ["Saraswat Bank"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", w: "https://www.saraswatbank.com", p: "COOP" },
  { k: "cosmos_coop", n: "The Cosmos Co-operative Bank Limited", d: "Cosmos Co-operative Bank", s: "Cosmos Bank", a: ["Cosmos Bank"], c: "cooperative_bank", i: "cooperative", hq: "Pune", w: "https://www.cosmosbank.com", p: "COOP" },
  { k: "svc_coop", n: "SVC Co-operative Bank Limited", d: "SVC Co-operative Bank", s: "SVC Bank", a: ["Shamrao Vithal"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", w: "https://www.svcbank.com", p: "COOP" },
  { k: "abhyudaya_coop", n: "Abhyudaya Co-operative Bank Limited", d: "Abhyudaya Co-operative Bank", s: "Abhyudaya", a: ["Abhyudaya Bank"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", w: "https://www.abhyudayabank.co.in", p: "COOP" },
  { k: "bharat_coop_ext", n: "Bharat Co-operative Bank (Mumbai) Limited", d: "Bharat Co-operative Bank", s: "Bharat Coop", a: ["Bharat Bank Mumbai"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", w: "https://www.bharatbank.com", p: "COOP" },
  { k: "nkgsb_coop", n: "NKGSB Co-operative Bank Limited", d: "NKGSB Co-operative Bank", s: "NKGSB", a: ["NKGSB Bank"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", w: "https://www.nkgsb-bank.com", p: "COOP" },
  { k: "tjsb", n: "TJSB Sahakari Bank Limited", d: "TJSB Sahakari Bank", s: "TJSB", a: ["Thane Janata Sahakari Bank"], c: "cooperative_bank", i: "cooperative", hq: "Thane", w: "https://www.tjsb.co.in", p: "COOP" },
  { k: "gs_mahanagar", n: "GS Mahanagar Co-operative Bank Limited", d: "GS Mahanagar Co-op Bank", s: "GS Mahanagar", a: ["Mahanagar Coop"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", p: "COOP" },
  { k: "apna_sahakari", n: "Apna Sahakari Bank Limited", d: "Apna Sahakari Bank", s: "Apna Sahakari", a: ["Apna Bank"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", p: "COOP" },
  { k: "new_india_coop", n: "New India Co-operative Bank Limited", d: "New India Co-operative Bank", s: "New India Coop", a: ["New India Bank"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", p: "COOP" },
  { k: "bombay_merc", n: "The Bombay Mercantile Co-operative Bank", d: "Bombay Mercantile Co-op Bank", s: "BMCB", a: ["Bombay Mercantile"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", p: "COOP" },
  { k: "rajarambapu", n: "Rajarambapu Sahakari Bank Limited", d: "Rajarambapu Sahakari Bank", s: "Rajarambapu", a: ["Rajarambapu Bank"], c: "cooperative_bank", i: "cooperative", hq: "Sangli", p: "COOP" },
  { k: "kalupur", n: "The Kalupur Commercial Co-operative Bank", d: "Kalupur Commercial Co-op Bank", s: "Kalupur", a: ["Kalupur Bank"], c: "cooperative_bank", i: "cooperative", hq: "Ahmedabad", w: "https://www.kalupurbank.com", p: "COOP" },
  { k: "mehsana_urban", n: "Mehsana Urban Co-operative Bank", d: "Mehsana Urban Co-op Bank", s: "Mehsana UCB", a: ["Mehsana Bank"], c: "cooperative_bank", i: "cooperative", hq: "Mehsana", p: "COOP" },
  { k: "rajkot_nagrik", n: "Rajkot Nagrik Sahakari Bank", d: "Rajkot Nagrik Sahakari Bank", s: "RNSB", a: ["Rajkot Nagrik"], c: "cooperative_bank", i: "cooperative", hq: "Rajkot", p: "COOP" },
  { k: "ahmedabad_dist", n: "Ahmedabad District Co-operative Bank", d: "Ahmedabad DCCB", s: "ADCC Bank", a: ["Ahmedabad DCCB"], c: "cooperative_bank", i: "cooperative", hq: "Ahmedabad", p: "COOP" },
  { k: "greater_bombay", n: "The Greater Bombay Co-operative Bank", d: "Greater Bombay Co-op Bank", s: "GBCB", a: ["Greater Bombay Coop"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", p: "COOP" },
  { k: "punjab_maharashtra", n: "Punjab & Maharashtra Co-operative Bank", d: "PMC Bank (Legacy)", s: "PMC", a: ["PMC Bank"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", p: "COOP" },
  { k: "zoroastrian", n: "The Zoroastrian Co-operative Bank Limited", d: "Zoroastrian Co-operative Bank", s: "Zoroastrian Bank", a: ["ZCBL"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", p: "COOP" },
  { k: "citizen_credit", n: "Citizen Credit Co-operative Bank", d: "Citizen Credit Co-op Bank", s: "Citizen Credit", a: ["Citizen Credit Bank"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", p: "COOP" },
  { k: "dombivli_nagari", n: "Dombivli Nagari Sahakari Bank", d: "Dombivli Nagari Sahakari Bank", s: "DNS Bank", a: ["DNSB"], c: "cooperative_bank", i: "cooperative", hq: "Dombivli", p: "COOP" },
  { k: "jalgaon_janata", n: "Jalgaon Janata Sahakari Bank", d: "Jalgaon Janata Sahakari Bank", s: "JJSB", a: ["Jalgaon Janata"], c: "cooperative_bank", i: "cooperative", hq: "Jalgaon", p: "COOP" },
  { k: "karad_urban", n: "Karad Urban Co-operative Bank", d: "Karad Urban Co-op Bank", s: "Karad UCB", a: ["Karad Bank"], c: "cooperative_bank", i: "cooperative", hq: "Karad", p: "COOP" },
  { k: "ichalkaranji", n: "The Ichalkaranji Merchants Co-operative Bank", d: "Ichalkaranji Merchants Co-op Bank", s: "IMCB", a: ["Ichalkaranji Bank"], c: "cooperative_bank", i: "cooperative", hq: "Ichalkaranji", p: "COOP" },

  // —— Foreign Banks (additional) ——
  { k: "barclays", n: "Barclays Bank PLC", d: "Barclays Bank", s: "Barclays", a: ["Barclays India"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Mumbai", w: "https://www.barclays.in", p: "FOREIGN" },
  { k: "bnp_paribas", n: "BNP Paribas", d: "BNP Paribas", s: "BNP Paribas", a: ["BNPP"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Mumbai", w: "https://www.bnpparibas.co.in", p: "FOREIGN" },
  { k: "credit_agricole", n: "Credit Agricole Corporate & Investment Bank", d: "Credit Agricole CIB", s: "CACIB", a: ["Credit Agricole"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Mumbai", p: "FOREIGN" },
  { k: "mufg_bank", n: "MUFG Bank, Ltd.", d: "MUFG Bank", s: "MUFG", a: ["Bank of Tokyo-Mitsubishi UFJ"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Mumbai", w: "https://www.bk.mufg.jp/global/globalnetwork/asiaoceania/india.html", p: "FOREIGN" },
  { k: "mizuho", n: "Mizuho Bank, Ltd.", d: "Mizuho Bank", s: "Mizuho", a: ["Mizuho"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Mumbai", p: "FOREIGN" },
  { k: "sumitomo_mitsui", n: "Sumitomo Mitsui Banking Corporation", d: "SMBC", s: "SMBC", a: ["Sumitomo Mitsui"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "New Delhi", p: "FOREIGN" },
  { k: "first_abu_dhabi", n: "First Abu Dhabi Bank PJSC", d: "First Abu Dhabi Bank", s: "FAB", a: ["FAB India"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Mumbai", p: "FOREIGN" },
  { k: "emirates_nbd", n: "Emirates NBD Bank PJSC", d: "Emirates NBD", s: "ENBD", a: ["Emirates NBD India"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Mumbai", p: "FOREIGN" },
  { k: "qatar_national", n: "Qatar National Bank", d: "QNB", s: "QNB", a: ["Qatar National Bank"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Mumbai", p: "FOREIGN" },
  { k: "bank_of_nova_scotia", n: "The Bank of Nova Scotia", d: "Scotiabank", s: "Scotiabank", a: ["Bank of Nova Scotia"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Mumbai", p: "FOREIGN" },
  { k: "bank_of_bahrain", n: "Bank of Bahrain and Kuwait B.S.C.", d: "BBK", s: "BBK", a: ["Bank of Bahrain and Kuwait"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Mumbai", p: "FOREIGN" },
  { k: "ctbc_bank", n: "CTBC Bank Co., Ltd.", d: "CTBC Bank", s: "CTBC", a: ["Chinatrust"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "New Delhi", p: "FOREIGN" },
  { k: "industrial_bank_korea", n: "Industrial Bank of Korea", d: "Industrial Bank of Korea", s: "IBK", a: ["IBK India"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "New Delhi", p: "FOREIGN" },
  { k: "keb_hana", n: "KEB Hana Bank", d: "KEB Hana Bank", s: "KEB Hana", a: ["Hana Bank"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "Gurugram", p: "FOREIGN" },
  { k: "woori_bank", n: "Woori Bank", d: "Woori Bank", s: "Woori", a: ["Woori Bank India"], c: "foreign_bank", i: "bank", cat: "foreign_bank", hq: "New Delhi", p: "FOREIGN" },

  // —— Payments Banks ——
  { k: "india_post_payments", n: "India Post Payments Bank Limited", d: "India Post Payments Bank", s: "IPPB", a: ["IPPB", "Post Payments Bank"], c: "payments_bank", i: "bank", hq: "New Delhi", w: "https://www.ippbonline.com", p: "PAYMENTS" },
  { k: "fino_payments", n: "Fino Payments Bank Limited", d: "Fino Payments Bank", s: "Fino", a: ["Fino Bank"], c: "payments_bank", i: "bank", hq: "Mumbai", w: "https://www.finobank.com", p: "PAYMENTS" },
  { k: "nsdl_payments", n: "NSDL Payments Bank Limited", d: "NSDL Payments Bank", s: "NSDL PB", a: ["NSDL Bank"], c: "payments_bank", i: "bank", hq: "Mumbai", w: "https://nsdlbank.com", p: "PAYMENTS" },
  { k: "jio_payments", n: "Jio Payments Bank Limited", d: "Jio Payments Bank", s: "Jio PB", a: ["Jio Bank"], c: "payments_bank", i: "bank", hq: "Mumbai", w: "https://www.jiopaymentsbank.com", p: "PAYMENTS" },
  { k: "sbi_cards", n: "SBI Cards and Payment Services Limited", d: "SBI Cards", s: "SBI Cards", a: ["SBI Card"], c: "nbfc", i: "nbfc", hq: "Gurugram", w: "https://www.sbicard.com", p: "NBFC_RETAIL" },

  // —— CO-LR-006 wave 2 — additional regional banks, HFCs, NBFCs ——
  { k: "odisha_gramya", n: "Odisha Gramya Bank", d: "Odisha Gramya Bank", s: "OGB", a: ["Odisha RRB"], c: "cooperative_bank", i: "cooperative", hq: "Bhubaneswar", p: "COOP" },
  { k: "kerala_gramin", n: "Kerala Gramin Bank", d: "Kerala Gramin Bank", s: "KGB", a: ["Kerala RRB"], c: "cooperative_bank", i: "cooperative", hq: "Malappuram", p: "COOP" },
  { k: "baroda_up_gramin", n: "Baroda UP Bank", d: "Baroda UP Bank", s: "Baroda UP", a: ["Baroda Uttar Pradesh Gramin"], c: "cooperative_bank", i: "cooperative", hq: "Gorakhpur", p: "COOP" },
  { k: "andhra_Pragathi", n: "Andhra Pragathi Grameena Bank", d: "Andhra Pragathi Grameena Bank", s: "APGB", a: ["Andhra Pragathi"], c: "cooperative_bank", i: "cooperative", hq: "Kadapa", p: "COOP" },
  { k: "telangana_gramin", n: "Telangana Grameena Bank", d: "Telangana Grameena Bank", s: "TGB", a: ["Telangana RRB"], c: "cooperative_bank", i: "cooperative", hq: "Hyderabad", p: "COOP" },
  { k: "karnataka_vikas", n: "Karnataka Vikas Grameena Bank", d: "Karnataka Vikas Grameena Bank", s: "KVGB", a: ["KVGB"], c: "cooperative_bank", i: "cooperative", hq: "Dharwad", p: "COOP" },
  { k: "arya_vart", n: "Aryavart Bank", d: "Aryavart Bank", s: "Aryavart", a: ["Aryavart RRB"], c: "cooperative_bank", i: "cooperative", hq: "Lucknow", p: "COOP" },
  { k: "prathama_up", n: "Prathama UP Gramin Bank", d: "Prathama UP Gramin Bank", s: "Prathama UP", a: ["Prathama Bank"], c: "cooperative_bank", i: "cooperative", hq: "Moradabad", p: "COOP" },
  { k: "madhya_pradesh_gramin", n: "Madhya Pradesh Gramin Bank", d: "Madhya Pradesh Gramin Bank", s: "MPGB", a: ["MP Gramin"], c: "cooperative_bank", i: "cooperative", hq: "Indore", p: "COOP" },
  { k: "rajasthan_marudhara", n: "Rajasthan Marudhara Gramin Bank", d: "Rajasthan Marudhara Gramin Bank", s: "RMGB", a: ["Marudhara"], c: "cooperative_bank", i: "cooperative", hq: "Jodhpur", p: "COOP" },
  { k: "punjab_gramin", n: "Punjab Gramin Bank", d: "Punjab Gramin Bank", s: "PGB", a: ["Punjab RRB"], c: "cooperative_bank", i: "cooperative", hq: "Kapurthala", p: "COOP" },
  { k: "himachal_gramin", n: "Himachal Pradesh Gramin Bank", d: "HP Gramin Bank", s: "HPGB", a: ["Himachal Gramin"], c: "cooperative_bank", i: "cooperative", hq: "Mandi", p: "COOP" },
  { k: "uttarakhand_gramin", n: "Uttarakhand Gramin Bank", d: "Uttarakhand Gramin Bank", s: "UGB", a: ["Uttarakhand RRB"], c: "cooperative_bank", i: "cooperative", hq: "Dehradun", p: "COOP" },
  { k: "assam_gramin", n: "Assam Gramin Vikash Bank", d: "Assam Gramin Vikash Bank", s: "AGVB", a: ["Assam RRB"], c: "cooperative_bank", i: "cooperative", hq: "Guwahati", p: "COOP" },
  { k: "meghalaya_rural", n: "Meghalaya Rural Bank", d: "Meghalaya Rural Bank", s: "MRB", a: ["Meghalaya RRB"], c: "cooperative_bank", i: "cooperative", hq: "Shillong", p: "COOP" },
  { k: "tripura_gramin", n: "Tripura Gramin Bank", d: "Tripura Gramin Bank", s: "TGB Tripura", a: ["Tripura RRB"], c: "cooperative_bank", i: "cooperative", hq: "Agartala", p: "COOP" },
  { k: "manipur_rural", n: "Manipur Rural Bank", d: "Manipur Rural Bank", s: "MRB Manipur", a: ["Manipur RRB"], c: "cooperative_bank", i: "cooperative", hq: "Imphal", p: "COOP" },
  { k: "mizoram_rural", n: "Mizoram Rural Bank", d: "Mizoram Rural Bank", s: "MzRB", a: ["Mizoram RRB"], c: "cooperative_bank", i: "cooperative", hq: "Aizawl", p: "COOP" },
  { k: "nagaland_rural", n: "Nagaland Rural Bank", d: "Nagaland Rural Bank", s: "NRB", a: ["Nagaland RRB"], c: "cooperative_bank", i: "cooperative", hq: "Kohima", p: "COOP" },
  { k: "arunachal_rural", n: "Arunachal Pradesh Rural Bank", d: "Arunachal Pradesh Rural Bank", s: "APRB", a: ["Arunachal RRB"], c: "cooperative_bank", i: "cooperative", hq: "Naharlagun", p: "COOP" },
  { k: "sikkim_state", n: "State Bank of Sikkim", d: "State Bank of Sikkim", s: "SBS", a: ["Sikkim State Bank"], c: "cooperative_bank", i: "cooperative", hq: "Gangtok", p: "COOP" },
  { k: "goa_state_coop", n: "Goa State Co-operative Bank", d: "Goa State Co-operative Bank", s: "GSCB", a: ["Goa Coop Bank"], c: "cooperative_bank", i: "cooperative", hq: "Panaji", p: "COOP" },
  { k: "gujarat_state_coop", n: "Gujarat State Co-operative Bank", d: "Gujarat State Co-operative Bank", s: "GSC Bank", a: ["Gujarat SCB"], c: "cooperative_bank", i: "cooperative", hq: "Ahmedabad", p: "COOP" },
  { k: "maharashtra_state_coop", n: "Maharashtra State Co-operative Bank", d: "Maharashtra State Co-operative Bank", s: "MSCB", a: ["Maharashtra SCB"], c: "cooperative_bank", i: "cooperative", hq: "Mumbai", p: "COOP" },
  { k: "karnataka_state_coop", n: "Karnataka State Co-operative Apex Bank", d: "Karnataka State Co-op Apex Bank", s: "KSC Apex", a: ["Karnataka Apex Bank"], c: "cooperative_bank", i: "cooperative", hq: "Bengaluru", p: "COOP" },
  { k: "tamilnadu_state_coop", n: "Tamil Nadu State Apex Co-operative Bank", d: "TNSC Bank", s: "TNSC", a: ["Tamil Nadu Apex Coop"], c: "cooperative_bank", i: "cooperative", hq: "Chennai", p: "COOP" },
  { k: "kerala_state_coop", n: "Kerala State Co-operative Bank", d: "Kerala State Co-operative Bank", s: "KSCB", a: ["Kerala Bank Coop"], c: "cooperative_bank", i: "cooperative", hq: "Thiruvananthapuram", p: "COOP" },
  { k: "west_bengal_state_coop", n: "West Bengal State Co-operative Bank", d: "West Bengal State Co-operative Bank", s: "WBSCB", a: ["WB State Coop"], c: "cooperative_bank", i: "cooperative", hq: "Kolkata", p: "COOP" },
  { k: "bihar_state_coop", n: "Bihar State Co-operative Bank", d: "Bihar State Co-operative Bank", s: "BSCB", a: ["Bihar SCB"], c: "cooperative_bank", i: "cooperative", hq: "Patna", p: "COOP" },
  { k: "jharkhand_state_coop", n: "Jharkhand State Co-operative Bank", d: "Jharkhand State Co-operative Bank", s: "JSCB", a: ["Jharkhand SCB"], c: "cooperative_bank", i: "cooperative", hq: "Ranchi", p: "COOP" },
  { k: "chhattisgarh_rajya", n: "Chhattisgarh Rajya Sahakari Bank", d: "Chhattisgarh Rajya Sahakari Bank", s: "CG Rajya Bank", a: ["Chhattisgarh Coop"], c: "cooperative_bank", i: "cooperative", hq: "Raipur", p: "COOP" },
  { k: "madhya_pradesh_state_coop", n: "Madhya Pradesh State Co-operative Bank", d: "MP State Co-operative Bank", s: "MPSCB", a: ["MP SCB"], c: "cooperative_bank", i: "cooperative", hq: "Bhopal", p: "COOP" },
  { k: "rajasthan_state_coop", n: "Rajasthan State Co-operative Bank", d: "Rajasthan State Co-operative Bank", s: "RSCB", a: ["Rajasthan SCB"], c: "cooperative_bank", i: "cooperative", hq: "Jaipur", p: "COOP" },
  { k: "haryana_state_coop", n: "Haryana State Co-operative Apex Bank", d: "Haryana State Co-op Apex Bank", s: "HARCO Bank", a: ["Haryana Apex"], c: "cooperative_bank", i: "cooperative", hq: "Chandigarh", p: "COOP" },
  { k: "punjab_state_coop", n: "Punjab State Co-operative Bank", d: "Punjab State Co-operative Bank", s: "PSCB", a: ["Punjab SCB"], c: "cooperative_bank", i: "cooperative", hq: "Chandigarh", p: "COOP" },
  { k: "himachal_state_coop", n: "Himachal Pradesh State Co-operative Bank", d: "HP State Co-operative Bank", s: "HPSCB", a: ["HP SCB"], c: "cooperative_bank", i: "cooperative", hq: "Shimla", p: "COOP" },
  { k: "uttarakhand_state_coop", n: "Uttarakhand State Co-operative Bank", d: "Uttarakhand State Co-operative Bank", s: "USCB", a: ["Uttarakhand SCB"], c: "cooperative_bank", i: "cooperative", hq: "Dehradun", p: "COOP" },
  { k: "up_state_coop", n: "Uttar Pradesh Co-operative Bank", d: "UP Co-operative Bank", s: "UPCB", a: ["UP Coop Bank"], c: "cooperative_bank", i: "cooperative", hq: "Lucknow", p: "COOP" },
  { k: "andhra_state_coop", n: "Andhra Pradesh State Co-operative Bank", d: "AP State Co-operative Bank", s: "APCOB", a: ["AP Coop Bank"], c: "cooperative_bank", i: "cooperative", hq: "Vijayawada", p: "COOP" },
  { k: "telangana_state_coop", n: "Telangana State Co-operative Apex Bank", d: "Telangana State Co-op Apex Bank", s: "TSCAB", a: ["Telangana Apex"], c: "cooperative_bank", i: "cooperative", hq: "Hyderabad", p: "COOP" },
  { k: "aavas_financiers", n: "Aavas Financiers Limited", d: "Aavas Financiers", s: "Aavas", a: ["Aavas HFC"], c: "housing_finance_company", i: "hfc", hq: "Jaipur", w: "https://www.aavas.in", p: "HFC" },
  { k: "home_first_finance", n: "Home First Finance Company India Limited", d: "Home First Finance", s: "Home First", a: ["HomeFirst"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.homefirstindia.com", p: "HFC" },
  { k: "aptus_value", n: "Aptus Value Housing Finance India Limited", d: "Aptus Value Housing Finance", s: "Aptus", a: ["Aptus HFC"], c: "housing_finance_company", i: "hfc", hq: "Chennai", w: "https://www.aptusindia.com", p: "HFC" },
  { k: "india_shelter_finance", n: "India Shelter Finance Corporation Limited", d: "India Shelter Finance", s: "India Shelter", a: ["India Shelter"], c: "housing_finance_company", i: "hfc", hq: "Gurugram", w: "https://www.indiashelter.in", p: "HFC" },
  { k: "can_fin_homes", n: "Can Fin Homes Limited", d: "Can Fin Homes", s: "Can Fin", a: ["Canfin Homes"], c: "housing_finance_company", i: "hfc", hq: "Bengaluru", w: "https://www.canfinhomes.com", p: "HFC" },
  { k: "repco_home", n: "Repco Home Finance Limited", d: "Repco Home Finance", s: "Repco Home", a: ["REPCO HFC"], c: "housing_finance_company", i: "hfc", hq: "Chennai", w: "https://www.repcohome.com", p: "HFC" },
  { k: "gic_housing_finance", n: "GIC Housing Finance Limited", d: "GIC Housing Finance", s: "GICHFL", a: ["GIC Housing"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.gichfindia.com", p: "HFC" },
  { k: "sundaram_home_finance", n: "Sundaram Home Finance Limited", d: "Sundaram Home Finance", s: "Sundaram Home", a: ["Sundaram HFC"], c: "housing_finance_company", i: "hfc", hq: "Chennai", w: "https://www.sundaramhome.in", p: "HFC" },
  { k: "godrej_housing_finance", n: "Godrej Housing Finance Limited", d: "Godrej Housing Finance", s: "Godrej HFC", a: ["Godrej Housing"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.godrejhousingfinance.com", p: "HFC" },
  { k: "aditya_birla_housing_finance", n: "Aditya Birla Housing Finance Limited", d: "Aditya Birla Housing Finance", s: "ABHFL", a: ["ABHFL"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.adityabirlahousing.com", p: "HFC" },
  { k: "bajaj_housing_finance", n: "Bajaj Housing Finance Limited", d: "Bajaj Housing Finance", s: "BHFL", a: ["Bajaj Housing"], c: "housing_finance_company", i: "hfc", hq: "Pune", w: "https://www.bajajhousingfinance.in", p: "HFC" },
  { k: "tata_capital_hfc", n: "Tata Capital Housing Finance Limited", d: "Tata Capital Housing Finance", s: "TCHFL", a: ["Tata Capital HFC"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.tatacapital.com", p: "HFC" },
  { k: "iifl_home_finance", n: "IIFL Home Finance Limited", d: "IIFL Home Finance", s: "IIFL Home", a: ["IIFL HFC"], c: "housing_finance_company", i: "hfc", hq: "Gurugram", w: "https://www.iiflhomeloans.com", p: "HFC" },
  { k: "pnb_housing_finance", n: "PNB Housing Finance Limited", d: "PNB Housing Finance", s: "PNBHFL", a: ["PNB Housing"], c: "housing_finance_company", i: "hfc", hq: "New Delhi", w: "https://www.pnbhousing.com", p: "HFC" },
  { k: "lic_housing_finance", n: "LIC Housing Finance Limited", d: "LIC Housing Finance", s: "LIC HFL", a: ["LICHFL"], c: "housing_finance_company", i: "hfc", hq: "Mumbai", w: "https://www.lichousing.com", p: "HFC" },
  { k: "hdb_financial", n: "HDB Financial Services Limited", d: "HDB Financial Services", s: "HDBFS", a: ["HDB Financial"], c: "nbfc", i: "nbfc", hq: "Ahmedabad", w: "https://www.hdbfs.com", p: "NBFC_RETAIL" },
  { k: "tvs_credit", n: "TVS Credit Services Limited", d: "TVS Credit", s: "TVS Credit", a: ["TVS Credit Services"], c: "nbfc", i: "nbfc", hq: "Chennai", w: "https://www.tvscredit.com", p: "NBFC_AUTO" },
  { k: "honda_finance", n: "Honda India Finance", d: "Honda Finance", s: "Honda Finance", a: ["Honda FS"], c: "nbfc", i: "nbfc", hq: "Gurugram", p: "NBFC_AUTO" },
  { k: "hyundai_capital", n: "Hyundai Capital India", d: "Hyundai Capital", s: "Hyundai Capital", a: ["HCI"], c: "nbfc", i: "nbfc", hq: "Gurugram", p: "NBFC_AUTO" },
  { k: "ford_credit", n: "Ford Credit India", d: "Ford Credit", s: "Ford Credit", a: ["Ford Finance"], c: "nbfc", i: "nbfc", hq: "Chennai", p: "NBFC_AUTO" },
  { k: "escorts_finance", n: "Escorts Finance", d: "Escorts Finance", s: "Escorts Finance", a: ["Escorts FS"], c: "nbfc", i: "nbfc", hq: "Faridabad", p: "NBFC_AUTO" },
  { k: "bharatpe", n: "Resilient Innovations Private Limited", d: "BharatPe", s: "BharatPe", a: ["Bharat Pe"], c: "nbfc", i: "fintech", hq: "New Delhi", w: "https://bharatpe.com", p: "FINTECH" },
  { k: "open_financial", n: "Open Financial Technologies", d: "Open", s: "Open", a: ["Open Banking"], c: "nbfc", i: "fintech", hq: "Bengaluru", w: "https://open.money", p: "FINTECH" },
  { k: "razorpay_capital", n: "Razorpay Capital", d: "Razorpay Capital", s: "Razorpay Capital", a: ["Razorpay"], c: "nbfc", i: "fintech", hq: "Bengaluru", w: "https://razorpay.com", p: "FINTECH" },
  { k: "pine_labs_capital", n: "Pine Labs — Merchant Finance", d: "Pine Labs Capital", s: "Pine Labs", a: ["PineLabs"], c: "nbfc", i: "fintech", hq: "Noida", p: "FINTECH" },
  { k: "mswipe", n: "Mswipe Technologies", d: "Mswipe", s: "Mswipe", a: ["M Swipe"], c: "nbfc", i: "fintech", hq: "Mumbai", p: "FINTECH" },
];

/**
 * Filter out compact rows that collide with baseline seedKeys or normalised names/aliases.
 */
export function buildCoLr006LenderMasterEntries(
  baseline: readonly LenderMasterSeedEntry[],
): LenderMasterSeedEntry[] {
  const seenKeys = new Set(baseline.map((l) => l.seedKey.trim().toLowerCase()));
  const seenNames = new Set<string>();
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/\b(limited|ltd|bank|finance|financial|housing|co-operative|cooperative|the)\b/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .trim();

  for (const row of baseline) {
    for (const name of [row.legalName, row.displayName, row.shortName, ...row.aliases]) {
      const key = norm(name);
      if (key) seenNames.add(key);
    }
  }

  const out: LenderMasterSeedEntry[] = [];
  for (const row of COMPACT) {
    const key = row.k.trim().toLowerCase();
    if (!key || seenKeys.has(key)) continue;
    const nameKeys = [row.n, row.d ?? row.n, row.s, ...(row.a ?? [])].map(norm).filter(Boolean);
    if (nameKeys.some((n) => seenNames.has(n))) continue;
    seenKeys.add(key);
    for (const n of nameKeys) seenNames.add(n);
    out.push(expand(row));
  }
  return out;
}

export function countCoLr006CompactRows(): number {
  return COMPACT.length;
}
