// Estimates only. Fees are paid upfront, not financed.
export function calculateEmi(
  price,
  downPayment,
  annualRate,
  months,
  fee = 0,
  method = "reducing",
) {
  if (
    ![price, downPayment, annualRate, months, fee].every(Number.isFinite) ||
    price <= 0 ||
    downPayment < 0 ||
    downPayment >= price ||
    annualRate < 0 ||
    annualRate > 100 ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 120 ||
    fee < 0 ||
    !["reducing", "flat"].includes(method)
  )
    throw new Error("Invalid EMI inputs.");
  const principal = price - downPayment,
    rate = annualRate / 1200;
  const monthly =
    method === "flat"
      ? (principal * (1 + ((annualRate / 100) * months) / 12)) / months
      : rate === 0
        ? principal / months
        : (principal * rate) / -Math.expm1(-months * Math.log1p(rate));
  const installments = monthly * months;
  return {
    principal,
    monthly,
    interest: installments - principal,
    total: installments + downPayment + fee,
    upfront: downPayment + fee,
  };
}
