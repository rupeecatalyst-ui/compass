/** Shared customer seed — used by Customer Master and Loan Files */

export interface CustomerSeed {
  id: string;
  name: string;
  mobile: string;
  email: string;
  city: string;
  state: string;
  employmentType: string;
}

export const CUSTOMER_SEED: CustomerSeed[] = [
  { id: "c001", name: "Rajesh Kumar", mobile: "+91 98765 43210", email: "rajesh.kumar@email.com", city: "Mumbai", state: "Maharashtra", employmentType: "Salaried" },
  { id: "c002", name: "Sharma Industries Pvt Ltd", mobile: "+91 98234 56789", email: "accounts@sharmaind.com", city: "Pune", state: "Maharashtra", employmentType: "Self Employed" },
  { id: "c003", name: "Kavitha Reddy", mobile: "+91 97654 32109", email: "kavitha.reddy@email.com", city: "Hyderabad", state: "Telangana", employmentType: "Salaried" },
  { id: "c004", name: "Mehta Traders", mobile: "+91 98123 45678", email: "mehta.traders@biz.in", city: "Ahmedabad", state: "Gujarat", employmentType: "Self Employed" },
  { id: "c005", name: "Patel Manufacturing", mobile: "+91 98987 65432", email: "ops@patelmfg.com", city: "Surat", state: "Gujarat", employmentType: "Self Employed" },
  { id: "c006", name: "Ananya Desai", mobile: "+91 98712 34567", email: "ananya.desai@email.com", city: "Bangalore", state: "Karnataka", employmentType: "Salaried" },
  { id: "c007", name: "Gupta Logistics", mobile: "+91 98456 78901", email: "dispatch@guptalog.com", city: "Delhi", state: "Delhi", employmentType: "Self Employed" },
  { id: "c008", name: "Vikram Singh", mobile: "+91 98321 09876", email: "vikram.singh@email.com", city: "Jaipur", state: "Rajasthan", employmentType: "Professional" },
  { id: "c009", name: "Southern Agro Exports", mobile: "+91 99001 23456", email: "export@southernagro.in", city: "Chennai", state: "Tamil Nadu", employmentType: "Self Employed" },
  { id: "c010", name: "Rohit Malhotra", mobile: "+91 98198 76543", email: "rohit.m@email.com", city: "Chandigarh", state: "Punjab", employmentType: "Salaried" },
  { id: "c011", name: "Nisha Kapoor", mobile: "+91 98765 11122", email: "nisha.kapoor@email.com", city: "Mumbai", state: "Maharashtra", employmentType: "Salaried" },
  { id: "c012", name: "Eastern Textiles LLP", mobile: "+91 98345 67890", email: "sales@easterntextiles.com", city: "Kolkata", state: "West Bengal", employmentType: "Self Employed" },
  { id: "c013", name: "Deepak Joshi", mobile: "+91 98200 33445", email: "deepak.joshi@email.com", city: "Indore", state: "Madhya Pradesh", employmentType: "Salaried" },
  { id: "c014", name: "Coastal Fisheries Co.", mobile: "+91 98470 55667", email: "orders@coastalfish.com", city: "Kochi", state: "Kerala", employmentType: "Self Employed" },
  { id: "c015", name: "Arjun Nair", mobile: "+91 98950 77889", email: "arjun.nair@email.com", city: "Trivandrum", state: "Kerala", employmentType: "Professional" },
  { id: "c016", name: "Precision Auto Parts", mobile: "+91 98110 22334", email: "parts@precisionauto.in", city: "Faridabad", state: "Haryana", employmentType: "Self Employed" },
  { id: "c017", name: "Pooja Bansal", mobile: "+91 98760 44556", email: "pooja.bansal@email.com", city: "Lucknow", state: "Uttar Pradesh", employmentType: "Salaried" },
  { id: "c018", name: "Green Valley Farms", mobile: "+91 98560 66778", email: "farm@greenvalley.co.in", city: "Nagpur", state: "Maharashtra", employmentType: "Self Employed" },
  { id: "c019", name: "Sunrise Developers", mobile: "+91 98102 33445", email: "projects@sunrise.dev", city: "Noida", state: "Uttar Pradesh", employmentType: "Self Employed" },
  { id: "c020", name: "Ravi Shankar", mobile: "+91 98430 11223", email: "ravi.shankar@email.com", city: "Coimbatore", state: "Tamil Nadu", employmentType: "Salaried" },
  { id: "c021", name: "Lakshmi Enterprises", mobile: "+91 98850 99887", email: "info@lakshmi-ent.com", city: "Visakhapatnam", state: "Andhra Pradesh", employmentType: "Self Employed" },
  { id: "c022", name: "Mohammed Irfan", mobile: "+91 98260 55443", email: "irfan.m@email.com", city: "Bhopal", state: "Madhya Pradesh", employmentType: "Salaried" },
  { id: "c023", name: "Tanvi Shah", mobile: "+91 98790 66771", email: "tanvi.shah@email.com", city: "Vadodara", state: "Gujarat", employmentType: "Professional" },
  { id: "c024", name: "Krishna Steel Works", mobile: "+91 98271 88990", email: "steel@krishnaworks.in", city: "Raipur", state: "Chhattisgarh", employmentType: "Self Employed" },
  { id: "c025", name: "Divya Menon", mobile: "+91 98470 22331", email: "divya.menon@email.com", city: "Kozhikode", state: "Kerala", employmentType: "Salaried" },
  { id: "c026", name: "Harish Choudhary", mobile: "+91 98292 44556", email: "harish.c@email.com", city: "Jodhpur", state: "Rajasthan", employmentType: "Salaried" },
  { id: "c027", name: "Alpine Hospitality", mobile: "+91 98221 77880", email: "bookings@alpinegoa.com", city: "Goa", state: "Goa", employmentType: "Self Employed" },
  { id: "c028", name: "Suresh Iyer", mobile: "+91 98421 99001", email: "suresh.iyer@email.com", city: "Madurai", state: "Tamil Nadu", employmentType: "Salaried" },
  { id: "c029", name: "Bhavna Agarwal", mobile: "+91 98370 11220", email: "bhavna.a@email.com", city: "Agra", state: "Uttar Pradesh", employmentType: "Salaried" },
  { id: "c030", name: "Northwind Exports", mobile: "+91 98150 33440", email: "export@northwind.in", city: "Ludhiana", state: "Punjab", employmentType: "Self Employed" },
  { id: "c031", name: "Manish Tiwari", mobile: "+91 98392 55661", email: "manish.t@email.com", city: "Varanasi", state: "Uttar Pradesh", employmentType: "Professional" },
  { id: "c032", name: "Sneha Pillai", mobile: "+91 98461 77882", email: "sneha.pillai@email.com", city: "Thiruvananthapuram", state: "Kerala", employmentType: "Salaried" },
  { id: "c033", name: "Om Sai Constructions", mobile: "+91 98231 99003", email: "build@omsai.co.in", city: "Nashik", state: "Maharashtra", employmentType: "Self Employed" },
  { id: "c034", name: "Fatima Sheikh", mobile: "+91 98701 22334", email: "fatima.s@email.com", city: "Mumbai", state: "Maharashtra", employmentType: "Salaried" },
  { id: "c035", name: "Gaurav Malhotra", mobile: "+91 98112 44567", email: "gaurav.m@email.com", city: "Gurgaon", state: "Haryana", employmentType: "Salaried" },
  { id: "c036", name: "Revathi Subramanian", mobile: "+91 98401 66789", email: "revathi.s@email.com", city: "Chennai", state: "Tamil Nadu", employmentType: "Salaried" },
  { id: "c037", name: "Kiran Pharma Distributors", mobile: "+91 98480 11234", email: "supply@kiranpharma.com", city: "Hyderabad", state: "Telangana", employmentType: "Self Employed" },
  { id: "c038", name: "Aditya Rawat", mobile: "+91 98370 55678", email: "aditya.rawat@email.com", city: "Dehradun", state: "Uttarakhand", employmentType: "Salaried" },
  { id: "c039", name: "Pallavi Kulkarni", mobile: "+91 98220 88901", email: "pallavi.k@email.com", city: "Pune", state: "Maharashtra", employmentType: "Professional" },
  { id: "c040", name: "Bharat Electronics Service", mobile: "+91 98450 33456", email: "service@bharatelec.in", city: "Bangalore", state: "Karnataka", employmentType: "Self Employed" },
  { id: "c041", name: "Imran Khan", mobile: "+91 98103 77890", email: "imran.khan@email.com", city: "Delhi", state: "Delhi", employmentType: "Salaried" },
  { id: "c042", name: "Swati Joshi", mobile: "+91 98253 11223", email: "swati.joshi@email.com", city: "Ahmedabad", state: "Gujarat", employmentType: "Salaried" },
  { id: "c043", name: "Venkatesh Rao", mobile: "+91 98490 44556", email: "venkatesh.r@email.com", city: "Hyderabad", state: "Telangana", employmentType: "Salaried" },
  { id: "c044", name: "Meenakshi Sundaram", mobile: "+91 98412 66778", email: "meenakshi.s@email.com", city: "Chennai", state: "Tamil Nadu", employmentType: "Salaried" },
  { id: "c045", name: "Rohit & Sons Traders", mobile: "+91 98390 99012", email: "trade@rohitsons.in", city: "Kanpur", state: "Uttar Pradesh", employmentType: "Self Employed" },
  { id: "c046", name: "Aisha Mohammed", mobile: "+91 98705 33445", email: "aisha.m@email.com", city: "Mumbai", state: "Maharashtra", employmentType: "Salaried" },
  { id: "c047", name: "Pradeep Sinha", mobile: "+91 98350 55667", email: "pradeep.sinha@email.com", city: "Patna", state: "Bihar", employmentType: "Professional" },
  { id: "c048", name: "Nandini Reddy", mobile: "+91 98482 77889", email: "nandini.r@email.com", city: "Hyderabad", state: "Telangana", employmentType: "Salaried" },
  { id: "c049", name: "Global Tech Solutions", mobile: "+91 98451 11220", email: "hello@globaltech.in", city: "Bangalore", state: "Karnataka", employmentType: "Self Employed" },
  { id: "c050", name: "Yusuf Ansari", mobile: "+91 98380 33441", email: "yusuf.a@email.com", city: "Lucknow", state: "Uttar Pradesh", employmentType: "Salaried" },
];
