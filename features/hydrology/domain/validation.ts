export function requireFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number.`);
  }

  return value;
}

export function requireFiniteOutput<T>(output: T, label: string): T {
  const inspect = (value: unknown, path: string): void => {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new RangeError(
          `${path} is outside the supported numeric range. Reduce the input values and try again.`
        );
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => inspect(item, `${path} ${index + 1}`));
      return;
    }

    if (value !== null && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) =>
        inspect(item, `${path} ${key}`)
      );
    }
  };

  inspect(output, label);
  return output;
}

export function requireNonNegative(value: number, label: string): number {
  requireFiniteNumber(value, label);

  if (value < 0) {
    throw new RangeError(`${label} must be zero or greater.`);
  }

  return value;
}

export function requirePositive(value: number, label: string): number {
  requireFiniteNumber(value, label);

  if (value <= 0) {
    throw new RangeError(`${label} must be greater than zero.`);
  }

  return value;
}

export function requireInteger(value: number, label: string): number {
  requireFiniteNumber(value, label);

  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative whole number.`);
  }

  return value;
}

export function requireFraction(value: number, label: string): number {
  requireFiniteNumber(value, label);

  if (value < 0 || value > 1) {
    throw new RangeError(`${label} must be between 0 and 1.`);
  }

  return value;
}

export function requirePercentage(value: number, label: string): number {
  requireFiniteNumber(value, label);

  if (value <= 0 || value > 100) {
    throw new RangeError(`${label} must be greater than 0 and at most 100%.`);
  }

  return value;
}

export function parseFiniteInput(value: string, label: string): number {
  if (!value.trim()) {
    throw new RangeError(`${label} is required.`);
  }

  const parsed = Number(value);
  return requireFiniteNumber(parsed, label);
}
