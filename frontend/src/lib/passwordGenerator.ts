
export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export const DEFAULT_OPTIONS: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

const CHARACTERS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}?",
};

const MAX_LENGTH = 64;
const MIN_LENGTH = 8;

/**
 * Returns a cryptographically random integer in [0, max).
 * Rejection sampling avoids modulo bias.
 */
function secureRandomInt(max: number): number {
  if (!Number.isSafeInteger(max) || max < 1 || max > 0x100000000) {
    throw new Error("Invalid random range.");
  }

  const range = 0x100000000;
  const limit = Math.floor(range / max) * max;
  const random = new Uint32Array(1);

  let value: number;

  do {
    crypto.getRandomValues(random);
    value = random[0];
  } while (value >= limit);

  return value % max;
}

function randomCharacter(characters: string): string {
  return characters[secureRandomInt(characters.length)];
}

/**
 * Fisher-Yates shuffle using cryptographically secure randomness.
 */
function secureShuffle(characters: string[]): void {
  for (let i = characters.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);

    [characters[i], characters[j]] = [
      characters[j],
      characters[i],
    ];
  }
}

export function generatePassword(
  options: GeneratorOptions
): string {
  const {
    length,
    uppercase,
    lowercase,
    numbers,
    symbols,
  } = options;

  if (
    !Number.isInteger(length) ||
    length < MIN_LENGTH ||
    length > MAX_LENGTH
  ) {
    throw new Error(
      `Password length must be between ${MIN_LENGTH} and ${MAX_LENGTH}.`
    );
  }

  const selectedGroups: string[] = [];

  if (uppercase) selectedGroups.push(CHARACTERS.uppercase);
  if (lowercase) selectedGroups.push(CHARACTERS.lowercase);
  if (numbers) selectedGroups.push(CHARACTERS.numbers);
  if (symbols) selectedGroups.push(CHARACTERS.symbols);

  if (selectedGroups.length === 0) {
    throw new Error("Select at least one character type.");
  }

  if (length < selectedGroups.length) {
    throw new Error(
      "Password is too short for the selected character types."
    );
  }

  const pool = selectedGroups.join("");
  const result: string[] = [];

  // Guarantee at least one character from each selected group.
  for (const group of selectedGroups) {
    result.push(randomCharacter(group));
  }

  // Fill the remaining positions.
  while (result.length < length) {
    result.push(randomCharacter(pool));
  }

  // Shuffle so required characters do not always appear first.
  secureShuffle(result);

  return result.join("");
}
