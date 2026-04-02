// Nepal districts with their major cities
export const NEPAL_DISTRICTS: string[] = [
  'Achham', 'Arghakhanchi', 'Baglung', 'Baitadi', 'Bajhang', 'Bajura', 'Banke',
  'Bara', 'Bardiya', 'Bhaktapur', 'Bhojpur', 'Chitwan', 'Dadeldhura', 'Dailekh',
  'Dang', 'Darchula', 'Dhading', 'Dhankuta', 'Dhanusa', 'Dolakha', 'Dolpa',
  'Doti', 'Gorkha', 'Gulmi', 'Humla', 'Ilam', 'Jajarkot', 'Jhapa', 'Jumla',
  'Kailali', 'Kalikot', 'Kanchanpur', 'Kapilvastu', 'Kaski', 'Kathmandu',
  'Kavrepalanchok', 'Khotang', 'Lalitpur', 'Lamjung', 'Mahottari', 'Makwanpur',
  'Manang', 'Morang', 'Mugu', 'Mustang', 'Myagdi', 'Nawalparasi East',
  'Nawalparasi West', 'Nuwakot', 'Okhaldhunga', 'Palpa', 'Panchthar',
  'Parbat', 'Parsa', 'Pyuthan', 'Ramechhap', 'Rasuwa', 'Rautahat',
  'Rolpa', 'Rukum East', 'Rukum West', 'Rupandehi', 'Salyan', 'Sankhuwasabha',
  'Saptari', 'Sarlahi', 'Sindhuli', 'Sindhupalchok', 'Siraha', 'Solukhumbu',
  'Sunsari', 'Surkhet', 'Syangja', 'Tanahu', 'Taplejung', 'Terhathum',
  'Udayapur',
];

export const NEPAL_CITIES: string[] = [
  'Bhaktapur', 'Bharatpur', 'Biratnagar', 'Birgunj', 'Butwal', 'Damak',
  'Dhangadhi', 'Dharan', 'Ghorahi', 'Hetauda', 'Itahari', 'Janakpur',
  'Kathmandu', 'Lalitpur', 'Nepalgunj', 'Pokhara', 'Siddharthanagar', 'Tulsipur',
];

// Map each city to its district
export const CITY_TO_DISTRICT: Record<string, string> = {
  'Bhaktapur': 'Bhaktapur',
  'Bharatpur': 'Chitwan',
  'Biratnagar': 'Morang',
  'Birgunj': 'Parsa',
  'Butwal': 'Rupandehi',
  'Damak': 'Jhapa',
  'Dhangadhi': 'Kailali',
  'Dharan': 'Sunsari',
  'Ghorahi': 'Dang',
  'Hetauda': 'Makwanpur',
  'Itahari': 'Sunsari',
  'Janakpur': 'Dhanusa',
  'Kathmandu': 'Kathmandu',
  'Lalitpur': 'Lalitpur',
  'Nepalgunj': 'Banke',
  'Pokhara': 'Kaski',
  'Siddharthanagar': 'Rupandehi',
  'Tulsipur': 'Dang',
};

// Get district for a given city (returns empty string if not found)
export const getDistrictForCity = (city: string): string => {
  return CITY_TO_DISTRICT[city] || '';
};

// Get cities in a given district
export const getCitiesInDistrict = (district: string): string[] => {
  return Object.entries(CITY_TO_DISTRICT)
    .filter(([, d]) => d === district)
    .map(([city]) => city);
};
