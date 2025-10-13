function parseDuration(str: string) {
  const units = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
    s: 1000,
    ms: 1,
  };

  const regex = /(\d+)\s*(d|h|m|s|ms)/g;

  const matches = str.matchAll(regex);
  let total: number | null = null;

  for (const [_, value, unit] of matches) {
    if (!total) {
      total = 0;
    }

    total += Number(value) * units[unit];
  }

  return total || parseInt(str);
}

export { parseDuration };
