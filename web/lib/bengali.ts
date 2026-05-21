const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function toBengaliNumber(value: string | number | null | undefined): string {
  if (value === undefined || value === null || value === "" || value === "N/A") {
    return "তথ্য নেই";
  }
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export function formatDateBn(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return toBengaliNumber(`${day}/${month}/${year}`);
}
