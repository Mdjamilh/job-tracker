const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatSalary(min: number | null, max: number | null): string {
  if (min === null && max === null) return "";
  if (min !== null && max !== null)
    return min === max ? usd.format(min) : `${usd.format(min)} - ${usd.format(max)}`;
  return min !== null ? `from ${usd.format(min)}` : `up to ${usd.format(max!)}`;
}

/** Display host for a stored http(s) link, e.g. "jobs.example.com". */
export function linkHost(link: string): string {
  try {
    return new URL(link).host.replace(/^www\./, "");
  } catch {
    return link;
  }
}
