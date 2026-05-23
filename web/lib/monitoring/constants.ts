export type ClassPeriod = { start: string; end: string; name: string };

export const CLASS_PERIODS: ClassPeriod[] = [
  { start: "10:15", end: "10:30", name: "সমাবেশ ও প্রস্তুতি" },
  { start: "10:30", end: "11:10", name: "১ম ঘণ্টা" },
  { start: "11:10", end: "11:50", name: "২য় ঘণ্টা" },
  { start: "11:50", end: "12:30", name: "৩য় ঘণ্টা" },
  { start: "12:30", end: "13:10", name: "৪র্থ ঘণ্টা" },
  { start: "13:10", end: "14:00", name: "টিফিন" },
  { start: "14:00", end: "14:30", name: "৫ম ঘণ্টা" },
  { start: "14:30", end: "15:00", name: "৬ষ্ঠ ঘণ্টা" },
  { start: "15:00", end: "15:30", name: "৭ম ঘণ্টা" },
  { start: "15:30", end: "16:00", name: "৮ম ঘণ্টা" },
];

export const TEACHING_STAFF_DESIGNATIONS = [
  "অধ্যক্ষ",
  "সহঃ অধ্যাপক",
  "প্রভাষক",
  "এবতেদায়ি প্রধান",
  "সহকারি শিক্ষক",
  "এবতেদায়ি শিক্ষক",
  "সহকারি মৌলভী",
  "এবতেদায়ি (ক্বারী)",
  "কম্পিউটার",
  "শারীরিক শিক্ষা",
  "লাইব্রেরিয়ান",
  "ল্যাব সহকারী",
];

export const TEACHER_FILTER_OPTIONS = [
  { value: "all", label: "স্তর বাছাই করুন" },
  { value: "ebtedayi", label: "এবতেদায়ি", grade: "এবতেদায়ি" },
  { value: "dakhil", label: "দাখিল", grade: "দাখিল" },
  { value: "alim", label: "আলিম", grade: "আলিম" },
  { value: "fazil", label: "ফাযিল", grade: "ফাযিল" },
  { value: "grade3", label: "কর্মচারি ৩য় গ্রেড", grade: "কর্মচারি ৩য় গ্রেড" },
  { value: "grade4", label: "কর্মচারি ৪র্থ গ্রেড", grade: "কর্মচারি ৪র্থ গ্রেড" },
] as const;

export const INSTITUTION = {
  name: "শিবগঞ্জ ফাযিল ডিগ্রী মাদ্রাসা",
  address: "শিবগঞ্জ-৫৮১০, বগুড়া।",
  logoUrl: "https://i.imgur.com/a7FaWO1.jpg",
} as const;
