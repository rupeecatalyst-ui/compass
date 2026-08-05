# CO-LR-009 — Enterprise Lender Registry Completeness Audit

**Audited at:** 2026-07-31T05:28:18.492Z
**Mode:** Read-only (no production mutations)
**Live DB connected:** YES

---

## 1. Total lender counts

| Source | Count |
|--------|------:|
| Approved Enterprise Lender Master (catalogue) | **275** |
| Live Registry rows (all) | **282** |
| Live Registry non-deleted | **282** |
| UI-visible (Published ∧ Active ∧ not BF_*) | **276** |
| Soft-deleted | 0 |
| Catalogue matched in live DB | 282 |
| Catalogue missing from live DB | **0** |
| Live extras (not in catalogue) | 0 |

### Catalogue by classification (approved master)

| Classification | Count |
|----------------|------:|
| Public Sector Bank | 12 |
| Private Sector Bank | 22 |
| Small Finance Bank | 12 |
| Housing Finance Company | 32 |
| NBFC | 98 |
| Foreign Bank | 28 |
| Cooperative Bank | 65 |
| Payments Bank | 6 |
| **Total** | **275** |

### Live DB by classification (approx)

| Classification | Non-deleted count |
|----------------|------:|
| Public Sector Bank | 14 |
| Private Sector Bank | 24 |
| Small Finance Bank | 13 |
| Housing Finance Company | 33 |
| NBFC | 98 |
| Foreign Bank | 28 |
| Cooperative Bank | 66 |
| Payments Bank | 6 |

---

## 2. Complete lender inventory (Approved Master Catalogue)

This is the Product Owner–approved Enterprise Lender Master used for seeding (`LENDER_MASTER_SEED_CATALOG`, CO-LR-006 + CO-LR-008).

Full machine-readable inventory: `docs/co-lr-009/CO-LR-009-AUDIT-INVENTORY.json`.

### Public Sector Bank (12)

| # | Display Name | Seed Key | Products |
|--:|--------------|----------|---------:|
| 1 | Bank of Baroda | `bob` | 6 |
| 2 | Bank of India | `boi` | 6 |
| 3 | Bank of Maharashtra | `bom` | 6 |
| 4 | Canara Bank | `canara` | 6 |
| 5 | Central Bank of India | `cbi` | 6 |
| 6 | Indian Bank | `indian_bank` | 6 |
| 7 | Indian Overseas Bank | `iob` | 6 |
| 8 | Punjab & Sind Bank | `psb` | 6 |
| 9 | Punjab National Bank | `pnb` | 6 |
| 10 | State Bank of India | `sbi` | 6 |
| 11 | UCO Bank | `uco` | 6 |
| 12 | Union Bank of India | `union` | 6 |

### Private Sector Bank (22)

| # | Display Name | Seed Key | Products |
|--:|--------------|----------|---------:|
| 1 | Axis Bank | `axis` | 6 |
| 2 | Bandhan Bank | `bandhan` | 6 |
| 3 | City Union Bank | `cub` | 6 |
| 4 | CSB Bank | `csb` | 6 |
| 5 | DCB Bank | `dcb` | 6 |
| 6 | Dhanlaxmi Bank | `dhanlaxmi_bank` | 15 |
| 7 | Federal Bank | `federal` | 6 |
| 8 | HDFC Bank | `hdfc` | 6 |
| 9 | ICICI Bank | `icici` | 6 |
| 10 | IDBI Bank | `idbi` | 6 |
| 11 | IDFC FIRST Bank | `idfc_first` | 6 |
| 12 | IndusInd Bank | `indusind` | 6 |
| 13 | Jammu & Kashmir Bank | `jkb` | 6 |
| 14 | Karnataka Bank | `karnataka` | 6 |
| 15 | Karur Vysya Bank | `kvb` | 6 |
| 16 | Kotak Mahindra Bank | `kotak` | 6 |
| 17 | Lakshmi Vilas Bank (Legacy) | `laxmi_vilas` | 15 |
| 18 | Nainital Bank | `nainital` | 6 |
| 19 | RBL Bank | `rbl` | 6 |
| 20 | South Indian Bank | `sib` | 6 |
| 21 | Tamilnad Mercantile Bank | `tmb` | 6 |
| 22 | Yes Bank | `yes` | 6 |

### Small Finance Bank (12)

| # | Display Name | Seed Key | Products |
|--:|--------------|----------|---------:|
| 1 | AU Small Finance Bank | `au_sfb` | 6 |
| 2 | Capital Small Finance Bank | `capital_sfb` | 6 |
| 3 | Equitas Small Finance Bank | `equitas_sfb` | 6 |
| 4 | ESAF Small Finance Bank | `esaf_sfb` | 6 |
| 5 | Fincare Small Finance Bank | `fincare_sfb` | 7 |
| 6 | Jana Small Finance Bank | `jana_sfb` | 6 |
| 7 | North East Small Finance Bank | `nesfb` | 6 |
| 8 | Shivalik Small Finance Bank | `shivalik_sfb` | 6 |
| 9 | Suryoday Small Finance Bank | `suryoday_sfb` | 6 |
| 10 | Ujjivan Small Finance Bank | `ujjivan_sfb` | 6 |
| 11 | Unity Small Finance Bank | `unity_sfb` | 6 |
| 12 | Utkarsh Small Finance Bank | `utkarsh_sfb` | 6 |

### Housing Finance Company (32)

| # | Display Name | Seed Key | Products |
|--:|--------------|----------|---------:|
| 1 | Aavas Financiers | `aavas` | 4 |
| 2 | Aditya Birla Housing Finance | `aditya_birla_housing` | 4 |
| 3 | Altum Credo | `altum_credo` | 5 |
| 4 | Aptus Value Housing Finance | `aptus` | 4 |
| 5 | Bajaj Housing Finance | `bajaj_housing` | 4 |
| 6 | Can Fin Homes | `can_fin` | 4 |
| 7 | Centrum Housing Finance | `centrum_housing` | 5 |
| 8 | Clix Housing Finance | `clix_housing` | 5 |
| 9 | DHFL (Legacy) | `dhfl_legacy` | 5 |
| 10 | Easy Home Finance | `easy_home_finance` | 5 |
| 11 | Fullerton India Home Finance | `fullerton_india_home` | 5 |
| 12 | GIC Housing Finance | `gic_housing` | 4 |
| 13 | Godrej Housing Finance | `godrej_housing` | 4 |
| 14 | GRUH Finance | `gruh_finance` | 5 |
| 15 | Home First Finance | `home_first` | 4 |
| 16 | ICICI Home Finance | `icici_home_finance` | 5 |
| 17 | IIFL Home Finance | `iifl_home` | 4 |
| 18 | India Home Loan | `india_home_loan` | 5 |
| 19 | India Shelter Finance | `india_shelter` | 4 |
| 20 | LIC Housing Finance | `lic_hfl` | 4 |
| 21 | Nord Housing Finance | `nord_housing` | 5 |
| 22 | Piramal Housing Finance | `piramal_housing` | 4 |
| 23 | PNB Housing Finance | `pnb_housing` | 4 |
| 24 | Reliance Home Finance | `reliance_home` | 5 |
| 25 | Reliance Nippon Housing | `reliance_nippon` | 5 |
| 26 | Repco Home Finance | `repco` | 4 |
| 27 | Sammaan Capital (Indiabulls Housing) | `indiabulls_housing` | 5 |
| 28 | Satin Housing Finance | `satin_housing` | 5 |
| 29 | Sundaram Home Finance | `sundaram_home` | 4 |
| 30 | Tata Capital Housing Finance | `tata_capital_hfl` | 4 |
| 31 | Tata Housing Finance | `tata_housing` | 5 |
| 32 | Vastu Housing Finance | `vastu_housing` | 5 |

### NBFC (98)

| # | Display Name | Seed Key | Products |
|--:|--------------|----------|---------:|
| 1 | Aditya Birla Finance | `aditya_birla_finance` | 5 |
| 2 | Amazon Pay Credit | `amazon_pay_later` | 4 |
| 3 | Annapurna Finance | `annapurna_finance` | 7 |
| 4 | Arohan | `arohan` | 7 |
| 5 | Asirvad Micro Finance | `asirvad` | 7 |
| 6 | Aye Finance | `aye_finance` | 7 |
| 7 | Bajaj Finance | `bajaj_finance` | 5 |
| 8 | Bandhan Financial Services | `bandhan_financial` | 7 |
| 9 | Belstar Microfinance | `belstar` | 7 |
| 10 | Berar Finance | `berar_finance` | 3 |
| 11 | BharatPe | `bharatpe` | 4 |
| 12 | BMW Financial Services | `bmw_financial` | 5 |
| 13 | Capital Float | `capital_float` | 4 |
| 14 | Capri Global | `capri_global` | 5 |
| 15 | CASHe | `cashe` | 4 |
| 16 | Cholamandalam Investment & Finance | `chola` | 5 |
| 17 | Clix Capital | `clix_capital` | 7 |
| 18 | CRED | `cred_avenue` | 4 |
| 19 | Credit Saison India | `credit_saison` | 7 |
| 20 | CreditAccess Grameen | `creditaccess` | 7 |
| 21 | EarlySalary / Fibe | `earlysalary` | 4 |
| 22 | Edelweiss Finance | `edelweiss` | 5 |
| 23 | Electronica Finance | `electronica_finance` | 7 |
| 24 | Escorts Finance | `escorts_finance` | 5 |
| 25 | EXIM Bank | `exim_bank` | 9 |
| 26 | FlexiLoans | `flexiloans` | 4 |
| 27 | Ford Credit | `ford_credit` | 5 |
| 28 | Fullerton India | `fullerton_india_credit` | 6 |
| 29 | Fusion Finance | `fusion_finance` | 7 |
| 30 | HDB Financial Services | `hdb_financial` | 6 |
| 31 | HDFC Credila | `hdfc_credila` | 6 |
| 32 | Hero FinCorp | `hero_fincorp` | 5 |
| 33 | Hinduja Leyland Finance | `hinduja_leyland` | 5 |
| 34 | Honda Finance | `honda_finance` | 5 |
| 35 | HUDCO | `hudco` | 5 |
| 36 | Hyundai Capital | `hyundai_capital` | 5 |
| 37 | IFCI | `ifc_india` | 5 |
| 38 | IIFL Finance | `iifl_finance` | 5 |
| 39 | IIFL Samasta | `iifl_samasta` | 7 |
| 40 | InCred | `incred` | 4 |
| 41 | Indifi | `indifi` | 4 |
| 42 | IOC Finance Desk | `iocl_finance` | 7 |
| 43 | IRFC | `irfc` | 5 |
| 44 | JM Financial Credit | `jm_financial` | 7 |
| 45 | John Deere Financial | `john_deere_financial` | 5 |
| 46 | Kinara Capital | `kinara_capital` | 7 |
| 47 | Kosamattam Finance | `kosamattam` | 3 |
| 48 | Kotak Mahindra Prime | `kotak_mahindra_prime` | 5 |
| 49 | KreditBee | `kreditbee` | 4 |
| 50 | L&T Finance | `lt_finance` | 5 |
| 51 | LazyPay | `lazy_pay` | 4 |
| 52 | Lendingkart | `lendingkart` | 4 |
| 53 | Mahindra Finance | `mahindra_finance` | 5 |
| 54 | Manappuram Finance | `manappuram` | 3 |
| 55 | Mercedes-Benz Financial Services | `mercedes_benz_fs` | 5 |
| 56 | MoneyTap | `moneytap` | 4 |
| 57 | Motilal Oswal Credit | `motilal_oswal` | 6 |
| 58 | Mswipe | `mswipe` | 4 |
| 59 | Muthoot Capital | `muthoot_capital` | 5 |
| 60 | Muthoot Finance | `muthoot` | 3 |
| 61 | Muthoot Fincorp | `muthoot_fincorp` | 3 |
| 62 | Muthoot Microfin | `muthoot_microfin` | 7 |
| 63 | NABARD | `nabard` | 7 |
| 64 | Namdev Finvest | `namdev_finvest` | 7 |
| 65 | National Housing Bank | `nhb` | 5 |
| 66 | Navi | `navi` | 4 |
| 67 | NeoGrowth | `neogrowth` | 4 |
| 68 | Northern Arc | `northern_arc` | 7 |
| 69 | Open | `open_financial` | 4 |
| 70 | PayU Finance | `payu_finance` | 4 |
| 71 | Pine Labs Capital | `pine_labs_capital` | 4 |
| 72 | Piramal Finance | `piramal_finance` | 5 |
| 73 | Poonawalla Fincorp | `poonawalla` | 5 |
| 74 | Power Finance Corporation | `pfc` | 5 |
| 75 | Protium | `protium` | 4 |
| 76 | Razorpay Capital | `razorpay_capital` | 4 |
| 77 | REC Limited | `rec_limited` | 5 |
| 78 | SBI Cards | `sbi_cards` | 6 |
| 79 | Shriram Finance | `shriram_finance` | 5 |
| 80 | SIDBI | `sidbi` | 7 |
| 81 | Simpl | `simpl` | 4 |
| 82 | Slice | `slice` | 4 |
| 83 | SMFG India Credit | `smfg_india` | 6 |
| 84 | Spandana Sphoorty | `spandana` | 7 |
| 85 | Srei Equipment Finance | `srei_equipment` | 5 |
| 86 | Sundaram Finance | `sundaram_finance` | 5 |
| 87 | Svatantra | `svatantra` | 7 |
| 88 | Tata Capital | `tata_capital` | 5 |
| 89 | Tata Motors Finance | `tata_motors_finance` | 5 |
| 90 | Thirumeni Finance | `thirumeni_finance` | 3 |
| 91 | Toyota Financial Services | `toyota_financial` | 5 |
| 92 | TVS Credit | `tvs_credit` | 5 |
| 93 | UGRO Capital | `ugro_capital` | 7 |
| 94 | Uni | `uni_cards` | 4 |
| 95 | Varthana | `varthana` | 7 |
| 96 | Vivriti Capital | `vivriti_capital` | 7 |
| 97 | Volvo Financial Services | `volvo_financial` | 5 |
| 98 | ZipLoan | `ziploan` | 4 |

### Foreign Bank (28)

| # | Display Name | Seed Key | Products |
|--:|--------------|----------|---------:|
| 1 | Bank of America | `bank_of_america` | 6 |
| 2 | Barclays Bank | `barclays` | 9 |
| 3 | BBK | `bank_of_bahrain` | 9 |
| 4 | BNP Paribas | `bnp_paribas` | 9 |
| 5 | Citibank | `citibank` | 6 |
| 6 | Credit Agricole CIB | `credit_agricole` | 9 |
| 7 | CTBC Bank | `ctbc_bank` | 9 |
| 8 | DBS Bank India | `dbs_india` | 6 |
| 9 | Deutsche Bank | `deutsche_bank` | 6 |
| 10 | Doha Bank | `doha_bank` | 6 |
| 11 | Emirates NBD | `emirates_nbd` | 9 |
| 12 | First Abu Dhabi Bank | `first_abu_dhabi` | 9 |
| 13 | HSBC Bank | `hsbc` | 6 |
| 14 | Industrial & Commercial Bank of China (ICBC) | `icbc` | 9 |
| 15 | Industrial Bank of Korea | `industrial_bank_korea` | 9 |
| 16 | J.P. Morgan Chase Bank | `jp_morgan` | 9 |
| 17 | KEB Hana Bank | `keb_hana` | 9 |
| 18 | Mashreq Bank | `mashreq_bank` | 9 |
| 19 | Mizuho Bank | `mizuho` | 9 |
| 20 | MUFG Bank | `mufg_bank` | 9 |
| 21 | QNB | `qatar_national` | 9 |
| 22 | Scotiabank | `bank_of_nova_scotia` | 9 |
| 23 | Shinhan Bank | `shinhan_bank` | 6 |
| 24 | SMBC | `sumitomo_mitsui` | 9 |
| 25 | Société Générale | `societe_generale` | 9 |
| 26 | Standard Chartered Bank | `standard_chartered` | 6 |
| 27 | State Bank of Mauritius | `state_bank_mauritius` | 6 |
| 28 | Woori Bank | `woori_bank` | 9 |

### Cooperative Bank (65)

| # | Display Name | Seed Key | Products |
|--:|--------------|----------|---------:|
| 1 | Abhyudaya Cooperative Bank | `abhyudaya` | 6 |
| 2 | Ahmedabad DCCB | `ahmedabad_dist` | 6 |
| 3 | Andhra Pragathi Grameena Bank | `andhra_Pragathi` | 6 |
| 4 | AP State Co-operative Bank | `andhra_state_coop` | 6 |
| 5 | Apna Sahakari Bank | `apna_sahakari` | 6 |
| 6 | Arunachal Pradesh Rural Bank | `arunachal_rural` | 6 |
| 7 | Aryavart Bank | `arya_vart` | 6 |
| 8 | Assam Gramin Vikash Bank | `assam_gramin` | 6 |
| 9 | Baroda UP Bank | `baroda_up_gramin` | 6 |
| 10 | Bharat Cooperative Bank | `bharat_coop` | 6 |
| 11 | Bihar State Co-operative Bank | `bihar_state_coop` | 6 |
| 12 | Bombay Mercantile Co-op Bank | `bombay_merc` | 6 |
| 13 | Chhattisgarh Rajya Sahakari Bank | `chhattisgarh_rajya` | 6 |
| 14 | Citizen Credit Co-op Bank | `citizen_credit` | 6 |
| 15 | Cosmos Cooperative Bank | `cosmos` | 6 |
| 16 | Dombivli Nagari Sahakari Bank | `dombivli_nagari` | 6 |
| 17 | Goa State Co-operative Bank | `goa_state_coop` | 6 |
| 18 | Greater Bombay Co-op Bank | `greater_bombay` | 6 |
| 19 | GS Mahanagar Co-op Bank | `gs_mahanagar` | 6 |
| 20 | Gujarat State Co-operative Bank | `gujarat_state_coop` | 6 |
| 21 | Haryana State Co-op Apex Bank | `haryana_state_coop` | 6 |
| 22 | HP Gramin Bank | `himachal_gramin` | 6 |
| 23 | HP State Co-operative Bank | `himachal_state_coop` | 6 |
| 24 | Ichalkaranji Merchants Co-op Bank | `ichalkaranji` | 6 |
| 25 | Jalgaon Janata Sahakari Bank | `jalgaon_janata` | 6 |
| 26 | Jharkhand State Co-operative Bank | `jharkhand_state_coop` | 6 |
| 27 | Kalupur Commercial Co-op Bank | `kalupur` | 6 |
| 28 | Karad Urban Co-op Bank | `karad_urban` | 6 |
| 29 | Karnataka State Co-op Apex Bank | `karnataka_state_coop` | 6 |
| 30 | Karnataka Vikas Grameena Bank | `karnataka_vikas` | 6 |
| 31 | Kerala Gramin Bank | `kerala_gramin` | 6 |
| 32 | Kerala State Co-operative Bank | `kerala_state_coop` | 6 |
| 33 | Madhya Pradesh Gramin Bank | `madhya_pradesh_gramin` | 6 |
| 34 | Maharashtra State Co-operative Bank | `maharashtra_state_coop` | 6 |
| 35 | Manipur Rural Bank | `manipur_rural` | 6 |
| 36 | Meghalaya Rural Bank | `meghalaya_rural` | 6 |
| 37 | Mehsana Urban Co-op Bank | `mehsana_urban` | 6 |
| 38 | Mizoram Rural Bank | `mizoram_rural` | 6 |
| 39 | MP State Co-operative Bank | `madhya_pradesh_state_coop` | 6 |
| 40 | Nagaland Rural Bank | `nagaland_rural` | 6 |
| 41 | New India Co-operative Bank | `new_india_coop` | 6 |
| 42 | NKGSB Cooperative Bank | `nkgsb` | 6 |
| 43 | Odisha Gramya Bank | `odisha_gramya` | 6 |
| 44 | PMC Bank (Legacy) | `punjab_maharashtra` | 6 |
| 45 | Prathama UP Gramin Bank | `prathama_up` | 6 |
| 46 | Punjab Gramin Bank | `punjab_gramin` | 6 |
| 47 | Punjab State Co-operative Bank | `punjab_state_coop` | 6 |
| 48 | Rajarambapu Sahakari Bank | `rajarambapu` | 6 |
| 49 | Rajasthan Marudhara Gramin Bank | `rajasthan_marudhara` | 6 |
| 50 | Rajasthan State Co-operative Bank | `rajasthan_state_coop` | 6 |
| 51 | Rajkot Nagrik Sahakari Bank | `rajkot_nagrik` | 6 |
| 52 | Saraswat Cooperative Bank | `saraswat` | 6 |
| 53 | Shamrao Vithal Cooperative Bank | `svc` | 6 |
| 54 | State Bank of Sikkim | `sikkim_state` | 6 |
| 55 | Telangana Grameena Bank | `telangana_gramin` | 6 |
| 56 | Telangana State Co-op Apex Bank | `telangana_state_coop` | 6 |
| 57 | Tirupati Urban Co-op Bank | `tirupati_urban` | 6 |
| 58 | TJSB Sahakari Bank | `tjsb` | 6 |
| 59 | TNSC Bank | `tamilnadu_state_coop` | 6 |
| 60 | Tripura Gramin Bank | `tripura_gramin` | 6 |
| 61 | UP Co-operative Bank | `up_state_coop` | 6 |
| 62 | Uttarakhand Gramin Bank | `uttarakhand_gramin` | 6 |
| 63 | Uttarakhand State Co-operative Bank | `uttarakhand_state_coop` | 6 |
| 64 | West Bengal State Co-operative Bank | `west_bengal_state_coop` | 6 |
| 65 | Zoroastrian Co-operative Bank | `zoroastrian` | 6 |

### Payments Bank (6)

| # | Display Name | Seed Key | Products |
|--:|--------------|----------|---------:|
| 1 | Airtel Payments Bank | `airtel_payments` | 1 |
| 2 | Fino Payments Bank | `fino_payments` | 1 |
| 3 | India Post Payments Bank | `india_post_payments` | 1 |
| 4 | Jio Payments Bank | `jio_payments` | 1 |
| 5 | NSDL Payments Bank | `nsdl_payments` | 1 |
| 6 | Paytm Payments Bank | `paytm_payments` | 1 |

---

## 3. Missing lenders (Catalogue → Live DB gap)

**None.** Every approved catalogue lender matched at least one live Registry row.

---

## 4. Duplicate lenders

### Catalogue presentation-family overlaps

4 families share normalised name/alias keys (distinct seedKeys — intentional related brands or residual overlap).

- `lender:pnb`: Punjab National Bank (`pnb`); PNB Housing Finance (`pnb_housing`)
- `lender:bandhan`: Bandhan Bank (`bandhan`); Bandhan Financial Services (`bandhan_financial`)
- `lender:iifl`: IIFL Home Finance (`iifl_home`); IIFL Finance (`iifl_finance`)
- `lender:sundaram`: Sundaram Home Finance (`sundaram_home`); Sundaram Finance (`sundaram_finance`)

Catalogue rows after presentation dedupe: **271** (from 275).

### Live DB presentation duplicate families

**9** families have multiple live rows. CO-LR-008 hides non-survivors in selectors (no physical merge).

- `lender:abhyudaya` survivor≈`cms4cnrmq0047wen4n1pdo8xw`
  - Abhyudaya Cooperative Bank (`ABHYUDAYA`) visible=true
  - Abhyudaya Cooperative Bank (`BF_ABHYUDAYA_COOPERATIVE`) visible=false reason=status=inactive
- `lender:bajaj` survivor≈`cmrusophn003jwe60hymttfjn`
  - Bajaj Housing Finance (`BAJAJ`) visible=true
  - Bajaj Housing Finance (`BAJAJ_HOUSING`) visible=true
- `lender:bandhan` survivor≈`cms4cmym7001dwen4yy0kag4p`
  - Bandhan Bank (`BANDHAN`) visible=true
  - Bandhan Financial Services (`BANDHAN_FINANCIAL`) visible=true
- `lender:hdfc` survivor≈`cmrusopl1003lwe601zac0dvs`
  - HDFC Bank (`HDFC`) visible=true
  - HDFC (`LND-P2A-HDFC`) visible=false reason=status=inactive
- `lender:icici` survivor≈`cmrusopoe003nwe60331ytwfx`
  - ICICI Bank (`ICICI`) visible=true
  - ICICI (`LND-P2A-ICICI`) visible=false reason=status=inactive
- `lender:iifl` survivor≈`cms4cnkdf003jwen4s4uw7m1s`
  - IIFL Finance (`IIFL_FINANCE`) visible=true
  - IIFL Home Finance (`IIFL_HOME`) visible=true
- `lender:sbi` survivor≈`cmrusopva003rwe60cjyga2va`
  - SBI (`LND-P2A-SBI`) visible=false reason=status=inactive
  - State Bank of India (`SBI`) visible=true
- `lender:pnb` survivor≈`cms4cn7f30029wen4i24wovpa`
  - Punjab National Bank (`PNB`) visible=true
  - PNB Housing Finance (`PNB_HOUSING`) visible=true
- `lender:sundaram` survivor≈`cms8hqoiu0039wed8rlyqc8ou`
  - Sundaram Finance (`SUNDARAM_FINANCE`) visible=true
  - Sundaram Home Finance (`SUNDARAM_HOME`) visible=true

---

## 5. UI visibility issues

### Visibility gate (SSOT)

A lender appears in Opportunity / Loan / Deal dropdowns only when:

1. `isDeleted = false`
2. `status = active`
3. `enabled = true`
4. `lifecycleStatus = active`
5. `operationalStatus` absent or `active`
6. Code is not provisional `BF_*`
7. Presentation canonicalisation keeps **one survivor per identity family**

Consumers: `listCanonicalEnterpriseLenderOptionsAsync`, Tier-2 `listLenders`, Competition, Manual Recommendation, LIFE recommend.

| Metric | Count |
|--------|------:|
| UI-visible | 276 |
| Hidden (non-deleted) | 6 |
| Soft-deleted | 0 |

### Hidden live lenders (reason)

| Code | Name | Reason |
|------|------|--------|
| `BF_ABHYUDAYA_COOPERATIVE` | Abhyudaya Cooperative Bank | status=inactive |
| `BF_AU_SMALL_FINANCE` | AU Small Finance Bank | provisional_bf_code |
| `BF_CENTRAL` | Central Bank of India | provisional_bf_code |
| `LND-P2A-HDFC` | HDFC | status=inactive |
| `LND-P2A-ICICI` | ICICI | status=inactive |
| `LND-P2A-SBI` | SBI | status=inactive |

---

## 6. Programme coverage

### Catalogue

| Metric | Value |
|--------|------:|
| Lenders with ≥1 product code | 275 |
| Lenders with 0 product codes | 0 |
| Total product-code assignments | 1573 |

### Live Registry programmes

| Metric | Value |
|--------|------:|
| Non-deleted lenders with 0 programmes | 5 |
| Matched lenders missing catalogue product codes | 282 |

Lenders with zero programme rows (sample / full in JSON):

- `BF_ABHYUDAYA_COOPERATIVE` Abhyudaya Cooperative Bank
- `BF_AU_SMALL_FINANCE` AU Small Finance Bank
- `LND-P2A-HDFC` HDFC
- `LND-P2A-ICICI` ICICI
- `LND-P2A-SBI` SBI

---

## 7. Recommended actions

1. **Do not delete or physically merge** live duplicate rows (FK continuity).
2. **Run fill-missing Tier-2 lender seed** in the certification/production environment so missing catalogue seedKeys are created (additive only).
3. After seed: **`POST /api/lender-registry/seed-baseline-programs`** for lenders with empty programmes.
4. Confirm Admin → Lender Registry list shows expected counts; then verify Deal / OW / Loan pickers.
5. For residual presentation duplicates: rely on CO-LR-008 canonical survivor UI; schedule physical merge only with PO + FK remap programme.
6. Re-run this audit (`node --env-file=.env.local --import tsx scripts/co-lr-009-audit.mts`) after seed to confirm `missingFromDbCount = 0`.

---

## 8. Production data attestation

| Action | Performed? |
|--------|------------|
| Delete lenders | **No** |
| Truncate / reset tables | **No** |
| Rewrite Lender IDs / FKs | **No** |
| Soft-delete / disable | **No** |
| Investigation method | Catalogue static analysis + Prisma `findMany` SELECT |

*End of CO-LR-009 audit*
