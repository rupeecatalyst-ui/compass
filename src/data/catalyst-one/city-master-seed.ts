/** UX-02 — Indian city master for searchable applicant location picker. */

export interface CityMasterEntry {
  id: string;
  city: string;
  state: string;
}

export const CITY_MASTER_SEED: CityMasterEntry[] = [
  { id: "mumbai-mh", city: "Mumbai", state: "Maharashtra" },
  { id: "pune-mh", city: "Pune", state: "Maharashtra" },
  { id: "nagpur-mh", city: "Nagpur", state: "Maharashtra" },
  { id: "nashik-mh", city: "Nashik", state: "Maharashtra" },
  { id: "aurangabad-mh", city: "Aurangabad", state: "Maharashtra" },
  { id: "delhi-dl", city: "Delhi", state: "Delhi" },
  { id: "new-delhi-dl", city: "New Delhi", state: "Delhi" },
  { id: "gurgaon-hr", city: "Gurgaon", state: "Haryana" },
  { id: "faridabad-hr", city: "Faridabad", state: "Haryana" },
  { id: "bangalore-ka", city: "Bangalore", state: "Karnataka" },
  { id: "mysore-ka", city: "Mysore", state: "Karnataka" },
  { id: "hyderabad-tg", city: "Hyderabad", state: "Telangana" },
  { id: "secunderabad-tg", city: "Secunderabad", state: "Telangana" },
  { id: "chennai-tn", city: "Chennai", state: "Tamil Nadu" },
  { id: "coimbatore-tn", city: "Coimbatore", state: "Tamil Nadu" },
  { id: "madurai-tn", city: "Madurai", state: "Tamil Nadu" },
  { id: "kolkata-wb", city: "Kolkata", state: "West Bengal" },
  { id: "ahmedabad-gj", city: "Ahmedabad", state: "Gujarat" },
  { id: "surat-gj", city: "Surat", state: "Gujarat" },
  { id: "vadodara-gj", city: "Vadodara", state: "Gujarat" },
  { id: "jaipur-rj", city: "Jaipur", state: "Rajasthan" },
  { id: "jodhpur-rj", city: "Jodhpur", state: "Rajasthan" },
  { id: "lucknow-up", city: "Lucknow", state: "Uttar Pradesh" },
  { id: "noida-up", city: "Noida", state: "Uttar Pradesh" },
  { id: "agra-up", city: "Agra", state: "Uttar Pradesh" },
  { id: "varanasi-up", city: "Varanasi", state: "Uttar Pradesh" },
  { id: "chandigarh-pb", city: "Chandigarh", state: "Punjab" },
  { id: "ludhiana-pb", city: "Ludhiana", state: "Punjab" },
  { id: "kochi-kl", city: "Kochi", state: "Kerala" },
  { id: "kozhikode-kl", city: "Kozhikode", state: "Kerala" },
  { id: "trivandrum-kl", city: "Thiruvananthapuram", state: "Kerala" },
  { id: "indore-mp", city: "Indore", state: "Madhya Pradesh" },
  { id: "bhopal-mp", city: "Bhopal", state: "Madhya Pradesh" },
  { id: "visakhapatnam-ap", city: "Visakhapatnam", state: "Andhra Pradesh" },
  { id: "goa-ga", city: "Goa", state: "Goa" },
  { id: "raipur-cg", city: "Raipur", state: "Chhattisgarh" },
];
