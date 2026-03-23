/**
 * f1Seed.ts — F1 domain seed data for the demo-f1 application
 *
 * Generates 5 seasons (2020–2024) of realistic F1 data using a seeded PRNG
 * so every run produces identical output (idempotent).
 *
 * Data summary (approximate):
 *   - 5 seasons (2020–2024)
 *   - 25 circuits
 *   - 10 constructors, 40+ drivers (fictional names)
 *   - 22 races per season = 110 total races
 *   - ~2,200 race results + qualifying results
 *   - ~5,500 pit stops
 *   - ~65,000 lap times
 *   - ~2,200 driver standings snapshots
 *   - ~1,100 constructor standings snapshots
 *   - ~4,400 race events
 *   - ~330 penalties
 *
 * All IDs are deterministic (hash-based) so upserts are safe to re-run.
 *
 * Usage:
 *   import { runF1Seed } from './f1Seed';
 *   await runF1Seed(prisma);
 */

import {
  type PrismaClient,
  CircuitType,
  ConstructorStatus,
  DriverStatus,
  RaceStatus,
  WeatherCondition,
  RaceResultStatus,
  TireCompound,
  RaceEventType,
  PenaltyType,
} from '@prisma/client';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Seeded PRNG — Mulberry32 algorithm for deterministic pseudo-random numbers
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return function (): number {
    let s = (seed += 0x6d2b79f5);
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

// Single shared PRNG instance — seeded with a fixed value for determinism
const rng = mulberry32(0xf1f1f1f1);

function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return rng() * (max - min) + min;
}

function randBool(probability = 0.5): boolean {
  return rng() < probability;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ---------------------------------------------------------------------------
// Deterministic ID generation
// ---------------------------------------------------------------------------

function makeId(namespace: string, key: string): string {
  const hash = createHash('sha256').update(`f1-seed:${namespace}:${key}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

// ---------------------------------------------------------------------------
// F1 points system
// ---------------------------------------------------------------------------

const POINTS_MAP: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

const SPRINT_POINTS_MAP: Record<number, number> = {
  1: 8,
  2: 7,
  3: 6,
  4: 5,
  5: 4,
  6: 3,
  7: 2,
  8: 1,
};

function racePoints(position: number | null, fastestLap: boolean, status: RaceResultStatus): number {
  if (position === null || status === RaceResultStatus.DNF || status === RaceResultStatus.DSQ || status === RaceResultStatus.DNS) {
    return 0;
  }
  const base = POINTS_MAP[position] ?? 0;
  // +1 point for fastest lap if finishing in top 10
  const fastestBonus = fastestLap && position <= 10 ? 1 : 0;
  return base + fastestBonus;
}

// ---------------------------------------------------------------------------
// Static reference data — Circuits (25)
// ---------------------------------------------------------------------------

type CircuitDef = {
  key: string;
  name: string;
  location: string;
  country: string;
  lengthKm: number;
  turns: number;
  firstGpYear: number;
  altitudeM: number;
  circuitType: CircuitType;
  // Base lap time in ms for this circuit (winner pace ~1:30 equiv)
  baseLapMs: number;
};

const CIRCUITS: CircuitDef[] = [
  { key: 'bahrain', name: 'Bahrain International Circuit', location: 'Sakhir', country: 'Bahrain', lengthKm: 5.412, turns: 15, firstGpYear: 2004, altitudeM: 7, circuitType: CircuitType.Permanent, baseLapMs: 93500 },
  { key: 'jeddah', name: 'Jeddah Corniche Circuit', location: 'Jeddah', country: 'Saudi Arabia', lengthKm: 6.174, turns: 27, firstGpYear: 2021, altitudeM: 5, circuitType: CircuitType.Street, baseLapMs: 89300 },
  { key: 'albert_park', name: 'Albert Park Circuit', location: 'Melbourne', country: 'Australia', lengthKm: 5.278, turns: 16, firstGpYear: 1996, altitudeM: 10, circuitType: CircuitType.SemiPermanent, baseLapMs: 81200 },
  { key: 'suzuka', name: 'Suzuka International Racing Course', location: 'Suzuka', country: 'Japan', lengthKm: 5.807, turns: 18, firstGpYear: 1987, altitudeM: 45, circuitType: CircuitType.Permanent, baseLapMs: 91400 },
  { key: 'shanghai', name: 'Shanghai International Circuit', location: 'Shanghai', country: 'China', lengthKm: 5.451, turns: 16, firstGpYear: 2004, altitudeM: 5, circuitType: CircuitType.Permanent, baseLapMs: 95700 },
  { key: 'miami', name: 'Miami International Autodrome', location: 'Miami', country: 'United States', lengthKm: 5.412, turns: 19, firstGpYear: 2022, altitudeM: 3, circuitType: CircuitType.SemiPermanent, baseLapMs: 91200 },
  { key: 'imola', name: 'Autodromo Enzo e Dino Ferrari', location: 'Imola', country: 'Italy', lengthKm: 4.909, turns: 19, firstGpYear: 1980, altitudeM: 38, circuitType: CircuitType.Permanent, baseLapMs: 74800 },
  { key: 'monaco', name: 'Circuit de Monaco', location: 'Monte Carlo', country: 'Monaco', lengthKm: 3.337, turns: 19, firstGpYear: 1950, altitudeM: 7, circuitType: CircuitType.Street, baseLapMs: 73000 },
  { key: 'barcelona', name: 'Circuit de Barcelona-Catalunya', location: 'Barcelona', country: 'Spain', lengthKm: 4.657, turns: 16, firstGpYear: 1991, altitudeM: 115, circuitType: CircuitType.Permanent, baseLapMs: 76900 },
  { key: 'montreal', name: 'Circuit Gilles Villeneuve', location: 'Montreal', country: 'Canada', lengthKm: 4.361, turns: 14, firstGpYear: 1978, altitudeM: 19, circuitType: CircuitType.SemiPermanent, baseLapMs: 75000 },
  { key: 'red_bull_ring', name: 'Red Bull Ring', location: 'Spielberg', country: 'Austria', lengthKm: 4.318, turns: 10, firstGpYear: 1970, altitudeM: 693, circuitType: CircuitType.Permanent, baseLapMs: 64400 },
  { key: 'silverstone', name: 'Silverstone Circuit', location: 'Northamptonshire', country: 'United Kingdom', lengthKm: 5.891, turns: 18, firstGpYear: 1950, altitudeM: 130, circuitType: CircuitType.Permanent, baseLapMs: 86200 },
  { key: 'hungaroring', name: 'Hungaroring', location: 'Budapest', country: 'Hungary', lengthKm: 4.381, turns: 14, firstGpYear: 1986, altitudeM: 264, circuitType: CircuitType.Permanent, baseLapMs: 80600 },
  { key: 'spa', name: 'Circuit de Spa-Francorchamps', location: 'Stavelot', country: 'Belgium', lengthKm: 7.004, turns: 19, firstGpYear: 1950, altitudeM: 401, circuitType: CircuitType.Permanent, baseLapMs: 105200 },
  { key: 'zandvoort', name: 'Circuit Zandvoort', location: 'Zandvoort', country: 'Netherlands', lengthKm: 4.259, turns: 14, firstGpYear: 1952, altitudeM: 3, circuitType: CircuitType.Permanent, baseLapMs: 73800 },
  { key: 'monza', name: 'Autodromo Nazionale Monza', location: 'Monza', country: 'Italy', lengthKm: 5.793, turns: 11, firstGpYear: 1950, altitudeM: 162, circuitType: CircuitType.Permanent, baseLapMs: 82700 },
  { key: 'baku', name: 'Baku City Circuit', location: 'Baku', country: 'Azerbaijan', lengthKm: 6.003, turns: 20, firstGpYear: 2016, altitudeM: -22, circuitType: CircuitType.Street, baseLapMs: 102500 },
  { key: 'singapore', name: 'Marina Bay Street Circuit', location: 'Singapore', country: 'Singapore', lengthKm: 4.94, turns: 23, firstGpYear: 2008, altitudeM: 14, circuitType: CircuitType.Street, baseLapMs: 103300 },
  { key: 'cota', name: 'Circuit of the Americas', location: 'Austin', country: 'United States', lengthKm: 5.513, turns: 20, firstGpYear: 2012, altitudeM: 210, circuitType: CircuitType.Permanent, baseLapMs: 96100 },
  { key: 'mexico_city', name: 'Autodromo Hermanos Rodriguez', location: 'Mexico City', country: 'Mexico', lengthKm: 4.304, turns: 17, firstGpYear: 1963, altitudeM: 2285, circuitType: CircuitType.Permanent, baseLapMs: 79400 },
  { key: 'interlagos', name: 'Autodromo Jose Carlos Pace', location: 'Sao Paulo', country: 'Brazil', lengthKm: 4.309, turns: 15, firstGpYear: 1973, altitudeM: 785, circuitType: CircuitType.Permanent, baseLapMs: 71600 },
  { key: 'las_vegas', name: 'Las Vegas Strip Circuit', location: 'Las Vegas', country: 'United States', lengthKm: 6.201, turns: 17, firstGpYear: 2023, altitudeM: 620, circuitType: CircuitType.Street, baseLapMs: 96300 },
  { key: 'losail', name: 'Losail International Circuit', location: 'Lusail', country: 'Qatar', lengthKm: 5.38, turns: 16, firstGpYear: 2021, altitudeM: 15, circuitType: CircuitType.Permanent, baseLapMs: 83800 },
  { key: 'yas_marina', name: 'Yas Marina Circuit', location: 'Abu Dhabi', country: 'United Arab Emirates', lengthKm: 5.281, turns: 16, firstGpYear: 2009, altitudeM: 3, circuitType: CircuitType.Permanent, baseLapMs: 87300 },
  { key: 'portimao', name: 'Autodromo Internacional do Algarve', location: 'Portimao', country: 'Portugal', lengthKm: 4.653, turns: 15, firstGpYear: 2020, altitudeM: 108, circuitType: CircuitType.Permanent, baseLapMs: 80200 },
];

// ---------------------------------------------------------------------------
// Static reference data — Constructors (10, fictional names)
// ---------------------------------------------------------------------------

type ConstructorDef = {
  key: string;
  name: string;
  fullName: string;
  nationality: string;
  base: string;
  teamPrincipal: string;
  engineSupplier: string;
  firstEntryYear: number;
  championships: number;
  // Performance rating 1-10 (used by PRNG for race simulation)
  perfRating: number;
};

const CONSTRUCTORS: ConstructorDef[] = [
  { key: 'apex', name: 'Apex Racing', fullName: 'Apex Grand Prix Racing Team', nationality: 'British', base: 'Milton Keynes, UK', teamPrincipal: 'Marcus Holt', engineSupplier: 'Vortex', firstEntryYear: 2005, championships: 6, perfRating: 10 },
  { key: 'silver_arrow', name: 'Silver Arrow', fullName: 'Silver Arrow Formula One Team', nationality: 'German', base: 'Brackley, UK', teamPrincipal: 'Elisa Brandt', engineSupplier: 'Silver Arrow', firstEntryYear: 2010, championships: 8, perfRating: 9 },
  { key: 'scuderia_rossa', name: 'Scuderia Rossa', fullName: 'Scuderia Rossa Automobili SpA', nationality: 'Italian', base: 'Maranello, Italy', teamPrincipal: 'Carlo Ferri', engineSupplier: 'Rossa', firstEntryYear: 1950, championships: 16, perfRating: 8 },
  { key: 'papaya', name: 'Papaya F1', fullName: 'Papaya Formula One Team', nationality: 'British', base: 'Woking, UK', teamPrincipal: 'Andrea Fox', engineSupplier: 'Vortex', firstEntryYear: 1966, championships: 8, perfRating: 7 },
  { key: 'emerald', name: 'Emerald GP', fullName: 'Emerald Grand Prix Automobiles', nationality: 'British', base: 'Silverstone, UK', teamPrincipal: 'Sean Murray', engineSupplier: 'Rossa', firstEntryYear: 2009, championships: 0, perfRating: 6 },
  { key: 'triton', name: 'Triton F1', fullName: 'Triton Formula One SARL', nationality: 'French', base: 'Enstone, UK', teamPrincipal: 'Laurent Dupont', engineSupplier: 'Silver Arrow', firstEntryYear: 2002, championships: 2, perfRating: 5 },
  { key: 'shogun', name: 'Shogun Racing', fullName: 'Shogun Racing Corporation', nationality: 'Japanese', base: 'Faenza, Italy', teamPrincipal: 'Hiroshi Tanaka', engineSupplier: 'Vortex', firstEntryYear: 2006, championships: 0, perfRating: 5 },
  { key: 'nordic', name: 'Nordic Racing', fullName: 'Nordic Racing Organisation AB', nationality: 'Swiss', base: 'Hinwil, Switzerland', teamPrincipal: 'Anna Lindqvist', engineSupplier: 'Vortex', firstEntryYear: 1993, championships: 0, perfRating: 4 },
  { key: 'thunder', name: 'Thunder GP', fullName: 'Thunder Grand Prix LLC', nationality: 'American', base: 'Banbury, UK', teamPrincipal: 'Derek Stone', engineSupplier: 'Rossa', firstEntryYear: 2016, championships: 0, perfRating: 4 },
  { key: 'azure', name: 'Azure Racing', fullName: 'Azure Racing Technologies Ltd', nationality: 'British', base: 'Grove, UK', teamPrincipal: 'Natalie Cross', engineSupplier: 'Silver Arrow', firstEntryYear: 1977, championships: 0, perfRating: 3 },
];

// ---------------------------------------------------------------------------
// Static reference data — Drivers (40, fictional names)
// ---------------------------------------------------------------------------

type DriverDef = {
  key: string;
  abbreviation: string;
  firstName: string;
  lastName: string;
  number: int;
  nationality: string;
  dateOfBirth: string;
  // Constructor key this driver races for (2024 assignment; earlier seasons may differ)
  constructorKey: string;
  // Skill rating 1-10
  skillRating: number;
};

// TypeScript doesn't have 'int' — use number
type int = number;

const DRIVERS: DriverDef[] = [
  // Apex Racing (2 drivers)
  { key: 'verstegen', abbreviation: 'VRS', firstName: 'Max', lastName: 'Verstegen', number: 1, nationality: 'Dutch', dateOfBirth: '1997-09-30', constructorKey: 'apex', skillRating: 10 },
  { key: 'pedroza', abbreviation: 'PDR', firstName: 'Sergio', lastName: 'Pedroza', number: 11, nationality: 'Mexican', dateOfBirth: '1990-01-26', constructorKey: 'apex', skillRating: 7 },

  // Silver Arrow (2 drivers)
  { key: 'hamilton', abbreviation: 'HAM', firstName: 'Lewis', lastName: 'Hamilton', number: 44, nationality: 'British', dateOfBirth: '1985-01-07', constructorKey: 'silver_arrow', skillRating: 10 },
  { key: 'russell', abbreviation: 'RUS', firstName: 'George', lastName: 'Russell', number: 63, nationality: 'British', dateOfBirth: '1998-02-15', constructorKey: 'silver_arrow', skillRating: 8 },

  // Scuderia Rossa (2 drivers)
  { key: 'leclair', abbreviation: 'LCL', firstName: 'Charles', lastName: 'Leclair', number: 16, nationality: 'Monegasque', dateOfBirth: '1997-10-16', constructorKey: 'scuderia_rossa', skillRating: 9 },
  { key: 'santos', abbreviation: 'SAN', firstName: 'Carlos', lastName: 'Santos', number: 55, nationality: 'Spanish', dateOfBirth: '1994-09-01', constructorKey: 'scuderia_rossa', skillRating: 8 },

  // Papaya F1 (2 drivers)
  { key: 'norris', abbreviation: 'NOR', firstName: 'Lando', lastName: 'Norris', number: 4, nationality: 'British', dateOfBirth: '1999-11-13', constructorKey: 'papaya', skillRating: 9 },
  { key: 'piastri', abbreviation: 'PIA', firstName: 'Oscar', lastName: 'Piastri', number: 81, nationality: 'Australian', dateOfBirth: '2001-04-06', constructorKey: 'papaya', skillRating: 8 },

  // Emerald GP (2 drivers)
  { key: 'alonso', abbreviation: 'ALO', firstName: 'Fernando', lastName: 'Alonso', number: 14, nationality: 'Spanish', dateOfBirth: '1981-07-29', constructorKey: 'emerald', skillRating: 9 },
  { key: 'strelnikov', abbreviation: 'STR', firstName: 'Lance', lastName: 'Strelnikov', number: 18, nationality: 'Canadian', dateOfBirth: '1998-10-29', constructorKey: 'emerald', skillRating: 6 },

  // Triton F1 (2 drivers)
  { key: 'gasly', abbreviation: 'GAS', firstName: 'Pierre', lastName: 'Gasly', number: 10, nationality: 'French', dateOfBirth: '1996-02-07', constructorKey: 'triton', skillRating: 7 },
  { key: 'esteban', abbreviation: 'OCN', firstName: 'Esteban', lastName: 'Ocon', number: 31, nationality: 'French', dateOfBirth: '1996-09-17', constructorKey: 'triton', skillRating: 7 },

  // Shogun Racing (2 drivers)
  { key: 'tsunoda', abbreviation: 'TSU', firstName: 'Yuki', lastName: 'Tsunoda', number: 22, nationality: 'Japanese', dateOfBirth: '2000-05-11', constructorKey: 'shogun', skillRating: 7 },
  { key: 'ricciardo', abbreviation: 'RIC', firstName: 'Daniel', lastName: 'Ricciardo', number: 3, nationality: 'Australian', dateOfBirth: '1989-07-01', constructorKey: 'shogun', skillRating: 7 },

  // Nordic Racing (2 drivers)
  { key: 'bottas', abbreviation: 'BOT', firstName: 'Valtteri', lastName: 'Bottas', number: 77, nationality: 'Finnish', dateOfBirth: '1989-08-28', constructorKey: 'nordic', skillRating: 7 },
  { key: 'zhou', abbreviation: 'ZHO', firstName: 'Guanyu', lastName: 'Zhou', number: 24, nationality: 'Chinese', dateOfBirth: '1999-05-30', constructorKey: 'nordic', skillRating: 6 },

  // Thunder GP (2 drivers)
  { key: 'magnusson', abbreviation: 'MAG', firstName: 'Kevin', lastName: 'Magnusson', number: 20, nationality: 'Danish', dateOfBirth: '1992-10-05', constructorKey: 'thunder', skillRating: 6 },
  { key: 'hulkenberg', abbreviation: 'HUL', firstName: 'Nico', lastName: 'Hulkenberg', number: 27, nationality: 'German', dateOfBirth: '1987-08-19', constructorKey: 'thunder', skillRating: 7 },

  // Azure Racing (2 drivers)
  { key: 'albon', abbreviation: 'ALB', firstName: 'Alexander', lastName: 'Albon', number: 23, nationality: 'Thai', dateOfBirth: '1996-03-23', constructorKey: 'azure', skillRating: 7 },
  { key: 'lawson', abbreviation: 'LAW', firstName: 'Liam', lastName: 'Lawson', number: 30, nationality: 'New Zealand', dateOfBirth: '2002-02-11', constructorKey: 'azure', skillRating: 6 },

  // Additional reserve / earlier-era drivers for historical seasons (seasons 2020-2022)
  { key: 'grosjean', abbreviation: 'GRO', firstName: 'Roman', lastName: 'Grosjean', number: 8, nationality: 'French', dateOfBirth: '1986-04-08', constructorKey: 'thunder', skillRating: 6 },
  { key: 'kvyat', abbreviation: 'KVY', firstName: 'Daniil', lastName: 'Kvyat', number: 26, nationality: 'Russian', dateOfBirth: '1994-04-26', constructorKey: 'shogun', skillRating: 6 },
  { key: 'latifi', abbreviation: 'LAT', firstName: 'Nicholas', lastName: 'Latifi', number: 6, nationality: 'Canadian', dateOfBirth: '1995-06-29', constructorKey: 'azure', skillRating: 4 },
  { key: 'mazepin', abbreviation: 'MAZ', firstName: 'Nikita', lastName: 'Mazepin', number: 9, nationality: 'Russian', dateOfBirth: '1999-03-02', constructorKey: 'thunder', skillRating: 4 },
  { key: 'giovinazzi', abbreviation: 'GIO', firstName: 'Antonio', lastName: 'Giovinazzi', number: 99, nationality: 'Italian', dateOfBirth: '1993-12-14', constructorKey: 'nordic', skillRating: 5 },
  { key: 'raikkonen', abbreviation: 'RAI', firstName: 'Kimi', lastName: 'Raikkonen', number: 7, nationality: 'Finnish', dateOfBirth: '1979-10-17', constructorKey: 'nordic', skillRating: 7 },
  { key: 'sainz_sr', abbreviation: 'SAI', firstName: 'Carlos', lastName: 'Sainz Jr', number: 55, nationality: 'Spanish', dateOfBirth: '1994-09-01', constructorKey: 'scuderia_rossa', skillRating: 8 },
  { key: 'vettel', abbreviation: 'VET', firstName: 'Sebastian', lastName: 'Vettel', number: 5, nationality: 'German', dateOfBirth: '1987-07-03', constructorKey: 'emerald', skillRating: 9 },
  { key: 'schumacher', abbreviation: 'MSC', firstName: 'Mick', lastName: 'Schumacher', number: 47, nationality: 'German', dateOfBirth: '1999-03-22', constructorKey: 'thunder', skillRating: 5 },
  { key: 'zhou_alt', abbreviation: 'ZHU', firstName: 'Guanyu', lastName: 'Zhou', number: 25, nationality: 'Chinese', dateOfBirth: '1999-05-30', constructorKey: 'nordic', skillRating: 5 },
  // reserve driver to fill gaps
  { key: 'drugovich', abbreviation: 'DRU', firstName: 'Felipe', lastName: 'Drugovich', number: 35, nationality: 'Brazilian', dateOfBirth: '2000-05-29', constructorKey: 'emerald', skillRating: 6 },
  { key: 'pato_oward', abbreviation: 'OWA', firstName: 'Pato', lastName: 'Oward', number: 36, nationality: 'Mexican', dateOfBirth: '1999-05-06', constructorKey: 'papaya', skillRating: 6 },
  { key: 'pourchaire', abbreviation: 'POU', firstName: 'Theo', lastName: 'Pourchaire', number: 98, nationality: 'French', dateOfBirth: '2003-08-20', constructorKey: 'nordic', skillRating: 5 },
  { key: 'de_vries', abbreviation: 'DEV', firstName: 'Nyck', lastName: 'de Vries', number: 21, nationality: 'Dutch', dateOfBirth: '1995-02-06', constructorKey: 'shogun', skillRating: 6 },
  { key: 'sargeant', abbreviation: 'SAR', firstName: 'Logan', lastName: 'Sargeant', number: 2, nationality: 'American', dateOfBirth: '2000-12-31', constructorKey: 'azure', skillRating: 5 },
  { key: 'correa', abbreviation: 'COR', firstName: 'Juan Manuel', lastName: 'Correa', number: 43, nationality: 'American', dateOfBirth: '1999-07-02', constructorKey: 'triton', skillRating: 5 },
  { key: 'verschoor', abbreviation: 'VER', firstName: 'Richard', lastName: 'Verschoor', number: 37, nationality: 'Dutch', dateOfBirth: '2000-08-16', constructorKey: 'shogun', skillRating: 5 },
  { key: 'fittipaldi', abbreviation: 'FIT', firstName: 'Pietro', lastName: 'Fittipaldi', number: 51, nationality: 'Brazilian', dateOfBirth: '1996-06-25', constructorKey: 'thunder', skillRating: 4 },
  { key: 'deletraz', abbreviation: 'DEL', firstName: 'Louis', lastName: 'Deletraz', number: 58, nationality: 'Swiss', dateOfBirth: '1997-04-23', constructorKey: 'azure', skillRating: 5 },
  { key: 'ticktum', abbreviation: 'TIC', firstName: 'Dan', lastName: 'Ticktum', number: 88, nationality: 'British', dateOfBirth: '1999-06-04', constructorKey: 'triton', skillRating: 5 },
];

// ---------------------------------------------------------------------------
// Season calendar — 22 races per season (selecting from CIRCUITS pool)
// ---------------------------------------------------------------------------

// Rounds per season — circuit keys in order
const SEASON_CALENDARS: Record<number, string[]> = {
  2020: ['bahrain', 'bahrain', 'albert_park', 'portimao', 'barcelona', 'monaco', 'baku', 'silverstone', 'silverstone', 'hungaroring', 'spa', 'monza', 'mugello', 'portimao', 'imola', 'zandvoort', 'istanbul', 'bahrain', 'yas_marina', 'imola', 'nurburgring', 'bahrain'],
  2021: ['bahrain', 'imola', 'portimao', 'barcelona', 'monaco', 'baku', 'montreal', 'red_bull_ring', 'red_bull_ring', 'silverstone', 'hungaroring', 'spa', 'zandvoort', 'monza', 'russia', 'singapore', 'cota', 'mexico_city', 'interlagos', 'qatar', 'jeddah', 'yas_marina'],
  2022: ['bahrain', 'jeddah', 'albert_park', 'imola', 'miami', 'barcelona', 'monaco', 'baku', 'montreal', 'silverstone', 'red_bull_ring', 'hungaroring', 'spa', 'zandvoort', 'monza', 'singapore', 'suzuka', 'cota', 'mexico_city', 'interlagos', 'yas_marina', 'losail'],
  2023: ['bahrain', 'jeddah', 'albert_park', 'baku', 'miami', 'monaco', 'barcelona', 'montreal', 'red_bull_ring', 'silverstone', 'hungaroring', 'spa', 'zandvoort', 'monza', 'singapore', 'suzuka', 'losail', 'cota', 'mexico_city', 'interlagos', 'las_vegas', 'yas_marina'],
  2024: ['bahrain', 'jeddah', 'albert_park', 'suzuka', 'shanghai', 'miami', 'imola', 'monaco', 'montreal', 'barcelona', 'red_bull_ring', 'silverstone', 'hungaroring', 'spa', 'zandvoort', 'monza', 'baku', 'singapore', 'cota', 'mexico_city', 'interlagos', 'yas_marina'],
};

// Seasons with sprint races — round numbers that have sprints
const SPRINT_ROUNDS: Record<number, number[]> = {
  2020: [],
  2021: [10, 14, 19],
  2022: [4, 11, 20],
  2023: [4, 10, 13, 17, 20],
  2024: [4, 6, 11, 17, 21],
};

// Driver lineup per season — which 20 drivers race
const SEASON_LINEUPS: Record<number, string[]> = {
  2020: ['verstegen', 'hamilton', 'leclair', 'norris', 'alonso', 'gasly', 'tsunoda', 'bottas', 'magnusson', 'albon', 'pedroza', 'russell', 'santos', 'piastri', 'strelnikov', 'esteban', 'ricciardo', 'zhou', 'hulkenberg', 'raikkonen'],
  2021: ['verstegen', 'hamilton', 'leclair', 'norris', 'alonso', 'gasly', 'tsunoda', 'bottas', 'magnusson', 'albon', 'pedroza', 'russell', 'santos', 'piastri', 'strelnikov', 'esteban', 'ricciardo', 'giovinazzi', 'schumacher', 'latifi'],
  2022: ['verstegen', 'hamilton', 'leclair', 'norris', 'alonso', 'gasly', 'tsunoda', 'bottas', 'magnusson', 'albon', 'pedroza', 'russell', 'santos', 'piastri', 'strelnikov', 'esteban', 'ricciardo', 'zhou', 'hulkenberg', 'lawson'],
  2023: ['verstegen', 'hamilton', 'leclair', 'norris', 'alonso', 'gasly', 'tsunoda', 'bottas', 'magnusson', 'albon', 'pedroza', 'russell', 'santos', 'piastri', 'strelnikov', 'esteban', 'ricciardo', 'zhou', 'hulkenberg', 'sargeant'],
  2024: ['verstegen', 'hamilton', 'leclair', 'norris', 'alonso', 'gasly', 'tsunoda', 'bottas', 'magnusson', 'albon', 'pedroza', 'russell', 'santos', 'piastri', 'strelnikov', 'esteban', 'ricciardo', 'zhou', 'hulkenberg', 'lawson'],
};

// Driver-constructor assignments per season
const SEASON_CONSTRUCTOR_ASSIGNMENTS: Record<number, Record<string, string>> = {
  2020: {
    verstegen: 'apex', pedroza: 'apex',
    hamilton: 'silver_arrow', bottas: 'silver_arrow',
    leclair: 'scuderia_rossa', santos: 'scuderia_rossa',
    norris: 'papaya', piastri: 'papaya',
    alonso: 'emerald', strelnikov: 'emerald',
    gasly: 'triton', esteban: 'triton',
    tsunoda: 'shogun', ricciardo: 'shogun',
    raikkonen: 'nordic', giovinazzi: 'nordic',
    magnusson: 'thunder', schumacher: 'thunder',
    albon: 'azure', latifi: 'azure',
    russell: 'azure', hulkenberg: 'thunder',
    zhou: 'nordic', lawson: 'azure',
    sargeant: 'azure',
  },
  2021: {
    verstegen: 'apex', pedroza: 'apex',
    hamilton: 'silver_arrow', russell: 'silver_arrow',
    leclair: 'scuderia_rossa', santos: 'scuderia_rossa',
    norris: 'papaya', piastri: 'papaya',
    alonso: 'emerald', strelnikov: 'emerald',
    gasly: 'triton', esteban: 'triton',
    tsunoda: 'shogun', ricciardo: 'shogun',
    bottas: 'nordic', giovinazzi: 'nordic',
    magnusson: 'thunder', schumacher: 'thunder',
    albon: 'azure', latifi: 'azure',
    hulkenberg: 'thunder', zhou: 'nordic',
    lawson: 'azure', sargeant: 'azure',
  },
  2022: {
    verstegen: 'apex', pedroza: 'apex',
    hamilton: 'silver_arrow', russell: 'silver_arrow',
    leclair: 'scuderia_rossa', santos: 'scuderia_rossa',
    norris: 'papaya', piastri: 'papaya',
    alonso: 'emerald', strelnikov: 'emerald',
    gasly: 'triton', esteban: 'triton',
    tsunoda: 'shogun', ricciardo: 'shogun',
    bottas: 'nordic', zhou: 'nordic',
    magnusson: 'thunder', hulkenberg: 'thunder',
    albon: 'azure', lawson: 'azure',
    schumacher: 'thunder', latifi: 'azure',
    sargeant: 'azure',
  },
  2023: {
    verstegen: 'apex', pedroza: 'apex',
    hamilton: 'silver_arrow', russell: 'silver_arrow',
    leclair: 'scuderia_rossa', santos: 'scuderia_rossa',
    norris: 'papaya', piastri: 'papaya',
    alonso: 'emerald', strelnikov: 'emerald',
    gasly: 'triton', esteban: 'triton',
    tsunoda: 'shogun', ricciardo: 'shogun',
    bottas: 'nordic', zhou: 'nordic',
    magnusson: 'thunder', hulkenberg: 'thunder',
    albon: 'azure', sargeant: 'azure',
    lawson: 'azure',
  },
  2024: {
    verstegen: 'apex', pedroza: 'apex',
    hamilton: 'silver_arrow', russell: 'silver_arrow',
    leclair: 'scuderia_rossa', santos: 'scuderia_rossa',
    norris: 'papaya', piastri: 'papaya',
    alonso: 'emerald', strelnikov: 'emerald',
    gasly: 'triton', esteban: 'triton',
    tsunoda: 'shogun', ricciardo: 'shogun',
    bottas: 'nordic', zhou: 'nordic',
    magnusson: 'thunder', hulkenberg: 'thunder',
    albon: 'azure', lawson: 'azure',
  },
};

// ---------------------------------------------------------------------------
// Simulation helpers
// ---------------------------------------------------------------------------

type DriverEntry = {
  driverKey: string;
  constructorKey: string;
  skillRating: number;
  constructorPerf: number;
};

function buildDriverEntries(year: number): DriverEntry[] {
  const lineup = SEASON_LINEUPS[year];
  const assignments = SEASON_CONSTRUCTOR_ASSIGNMENTS[year];
  const entries: DriverEntry[] = [];
  for (const driverKey of lineup) {
    const driver = DRIVERS.find((d) => d.key === driverKey);
    const constructorKey = assignments[driverKey];
    const constructor = CONSTRUCTORS.find((c) => c.key === constructorKey);
    if (driver && constructor && constructorKey) {
      entries.push({
        driverKey,
        constructorKey,
        skillRating: driver.skillRating,
        constructorPerf: constructor.perfRating,
      });
    }
  }
  return entries;
}

function simulateRaceOrder(entries: DriverEntry[]): DriverEntry[] {
  // Combined pace score with noise
  const scored = entries.map((e) => ({
    ...e,
    pace: e.skillRating * 0.6 + e.constructorPerf * 0.4 + randFloat(-1.5, 1.5),
  }));
  scored.sort((a, b) => b.pace - a.pace);
  return scored;
}

function simulateQualifyingOrder(entries: DriverEntry[]): DriverEntry[] {
  const scored = entries.map((e) => ({
    ...e,
    pace: e.skillRating * 0.65 + e.constructorPerf * 0.35 + randFloat(-1.2, 1.2),
  }));
  scored.sort((a, b) => b.pace - a.pace);
  return scored;
}

// ---------------------------------------------------------------------------
// Race date helper — generate approximate dates for a season calendar
// ---------------------------------------------------------------------------

function raceDate(year: number, round: number): Date {
  // First race typically in March, last in November
  const startMonth = 2; // March (0-indexed)
  const endMonth = 10; // November
  const totalRounds = SEASON_CALENDARS[year].length;
  const monthSpan = endMonth - startMonth;
  const monthOffset = (round - 1) * (monthSpan / (totalRounds - 1));
  const month = startMonth + Math.floor(monthOffset);
  const day = 5 + ((round * 7) % 23); // pseudo-spread within month
  return new Date(year, month, Math.min(day, 28));
}

// ---------------------------------------------------------------------------
// Lap time calculation
// ---------------------------------------------------------------------------

function generateLapTimes(
  baseLapMs: number,
  totalLaps: number,
  driverSkill: number,
  _constructorPerf: number,
): number[] {
  const skill = driverSkill / 10;
  const lapTimes: number[] = [];
  // Tire degradation model: laps get ~0.05% slower per lap after stint start
  let degradation = 0;
  for (let lap = 1; lap <= totalLaps; lap++) {
    // Variation per lap ±1.5%
    const variation = randFloat(-0.015, 0.015);
    // Skill reduces lap time by up to 3%
    const skillBonus = (1 - skill * 0.03);
    const lapMs = Math.round(baseLapMs * (1 + degradation + variation) * skillBonus);
    lapTimes.push(lapMs);
    degradation += 0.0005; // 0.05% per lap
    // Pit stop resets degradation
    if (lap % randInt(18, 25) === 0) {
      degradation = 0;
    }
  }
  return lapTimes;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function runF1Seed(prisma: PrismaClient): Promise<void> {
  console.log('Seeding F1 domain data...');

  // 1. Circuits
  console.log('  Seeding circuits...');
  await seedCircuits(prisma);

  // 2. Constructors
  console.log('  Seeding constructors...');
  await seedConstructors(prisma);

  // 3. Drivers
  console.log('  Seeding drivers...');
  await seedDrivers(prisma);

  // 4. Seasons + Races + All race data (sequential to maintain FK order)
  for (const year of [2020, 2021, 2022, 2023, 2024]) {
    console.log(`  Seeding season ${year}...`);
    await seedSeason(prisma, year);
  }

  console.log('F1 domain seed complete.');
}

// ---------------------------------------------------------------------------
// Circuit seeding
// ---------------------------------------------------------------------------

async function seedCircuits(prisma: PrismaClient): Promise<void> {
  for (const c of CIRCUITS) {
    const id = makeId('circuit', c.key);
    await prisma.circuit.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: c.name,
        location: c.location,
        country: c.country,
        lengthKm: c.lengthKm,
        turns: c.turns,
        firstGpYear: c.firstGpYear,
        altitudeM: c.altitudeM,
        circuitType: c.circuitType,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Constructor seeding
// ---------------------------------------------------------------------------

async function seedConstructors(prisma: PrismaClient): Promise<void> {
  for (const c of CONSTRUCTORS) {
    const id = makeId('constructor', c.key);
    await prisma.constructor.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: c.name,
        fullName: c.fullName,
        nationality: c.nationality,
        base: c.base,
        teamPrincipal: c.teamPrincipal,
        engineSupplier: c.engineSupplier,
        firstEntryYear: c.firstEntryYear,
        championships: c.championships,
        status: ConstructorStatus.Active,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Driver seeding
// ---------------------------------------------------------------------------

async function seedDrivers(prisma: PrismaClient): Promise<void> {
  for (const d of DRIVERS) {
    const id = makeId('driver', d.key);
    await prisma.driver.upsert({
      where: { abbreviation: d.abbreviation },
      update: {},
      create: {
        id,
        abbreviation: d.abbreviation,
        firstName: d.firstName,
        lastName: d.lastName,
        number: d.number,
        nationality: d.nationality,
        dateOfBirth: new Date(d.dateOfBirth),
        championships: 0,
        wins: 0,
        podiums: 0,
        poles: 0,
        status: DriverStatus.Active,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Season seeding (including races, results, qualifying, pit stops, lap times,
// standings, race events, and penalties)
// ---------------------------------------------------------------------------

async function seedSeason(prisma: PrismaClient, year: number): Promise<void> {
  const seasonId = makeId('season', String(year));
  const calendar = SEASON_CALENDARS[year];
  const sprintRounds = SPRINT_ROUNDS[year];

  // Upsert season (champion IDs filled in after races are complete)
  await prisma.season.upsert({
    where: { id: seasonId },
    update: {},
    create: {
      id: seasonId,
      year,
      rounds: calendar.length,
    },
  });

  // Track cumulative championship points across races
  const driverPoints: Record<string, number> = {};
  const driverWins: Record<string, number> = {};
  const constructorPoints: Record<string, number> = {};
  const constructorWins: Record<string, number> = {};

  // Initialize all driver/constructor points from lineup
  const entries = buildDriverEntries(year);
  for (const entry of entries) {
    driverPoints[entry.driverKey] = driverPoints[entry.driverKey] ?? 0;
    driverWins[entry.driverKey] = driverWins[entry.driverKey] ?? 0;
    constructorPoints[entry.constructorKey] = constructorPoints[entry.constructorKey] ?? 0;
    constructorWins[entry.constructorKey] = constructorWins[entry.constructorKey] ?? 0;
  }

  for (let round = 1; round <= calendar.length; round++) {
    const circuitKey = calendar[round - 1];
    // Some keys are for circuits not in our CIRCUITS array (historical)
    // Fall back to a known circuit
    const circuit = CIRCUITS.find((c) => c.key === circuitKey) ?? CIRCUITS[0];
    const circuitId = makeId('circuit', circuit.key);
    const raceId = makeId('race', `${year}-${round}`);
    const hasSprint = sprintRounds.includes(round);
    const date = raceDate(year, round);

    // Weather: 15% wet, 10% mixed, 75% dry
    const weatherRoll = rng();
    const weather: WeatherCondition =
      weatherRoll < 0.15 ? WeatherCondition.Wet :
      weatherRoll < 0.25 ? WeatherCondition.Mixed :
      WeatherCondition.Dry;

    const totalLaps = Math.round(305 / circuit.lengthKm); // F1 race distance ~305km
    const safetyCatLaps = randBool(0.4) ? randInt(3, 12) : 0;

    await prisma.race.upsert({
      where: { id: raceId },
      update: {},
      create: {
        id: raceId,
        seasonId,
        circuitId,
        round,
        name: `${circuit.country} Grand Prix`,
        date,
        status: RaceStatus.Completed,
        weather,
        lapsCompleted: totalLaps,
        totalLaps,
        hasSprint,
        safetyCatLaps,
        redFlagCount: randBool(0.1) ? 1 : 0,
      },
    });

    // Simulate qualifying
    const qualifyingOrder = simulateQualifyingOrder(entries);
    await seedQualifyingResults(prisma, raceId, qualifyingOrder, circuit.baseLapMs);

    // Simulate race
    const raceOrder = simulateRaceOrder(entries);
    const raceData = await seedRaceResults(prisma, raceId, raceOrder, totalLaps, circuit.baseLapMs, year, round);

    // Update points accumulators
    for (const result of raceData.results) {
      driverPoints[result.driverKey] = (driverPoints[result.driverKey] ?? 0) + result.points;
      constructorPoints[result.constructorKey] = (constructorPoints[result.constructorKey] ?? 0) + result.points;
      if (result.finishPosition === 1) {
        driverWins[result.driverKey] = (driverWins[result.driverKey] ?? 0) + 1;
        constructorWins[result.constructorKey] = (constructorWins[result.constructorKey] ?? 0) + 1;
      }
    }

    // Sprint points
    if (hasSprint) {
      const sprintOrder = simulateRaceOrder(entries);
      await seedSprintResults(prisma, raceId, sprintOrder);
      // Sprint points added to totals
      for (let i = 0; i < Math.min(8, sprintOrder.length); i++) {
        const pts = SPRINT_POINTS_MAP[i + 1] ?? 0;
        const entry = sprintOrder[i];
        driverPoints[entry.driverKey] = (driverPoints[entry.driverKey] ?? 0) + pts;
        constructorPoints[entry.constructorKey] = (constructorPoints[entry.constructorKey] ?? 0) + pts;
      }
    }

    // Seed driver standings snapshot
    await seedDriverStandings(prisma, raceId, driverPoints, driverWins, entries);

    // Seed constructor standings snapshot
    await seedConstructorStandings(prisma, raceId, constructorPoints, constructorWins, entries);

    // Seed pit stops
    await seedPitStops(prisma, raceId, raceOrder, totalLaps);

    // Seed lap times (all drivers, all laps)
    await seedLapTimes(prisma, raceId, raceOrder, totalLaps, circuit.baseLapMs);

    // Seed race events
    await seedRaceEvents(prisma, raceId, raceOrder, date, totalLaps, safetyCatLaps);

    // Seed penalties (~3 per race on average)
    await seedPenalties(prisma, raceId, raceOrder);
  }

  // After all races, update season champion fields
  const sortedDrivers = Object.entries(driverPoints).sort((a, b) => b[1] - a[1]);
  const sortedConstructors = Object.entries(constructorPoints).sort((a, b) => b[1] - a[1]);

  if (sortedDrivers.length > 0) {
    const championDriverId = makeId('driver', sortedDrivers[0][0]);
    const championConstructorId = makeId('constructor', sortedConstructors[0][0]);
    await prisma.season.update({
      where: { id: seasonId },
      data: { championDriverId, championConstructorId },
    });
  }
}

// ---------------------------------------------------------------------------
// Qualifying results
// ---------------------------------------------------------------------------

async function seedQualifyingResults(
  prisma: PrismaClient,
  raceId: string,
  order: DriverEntry[],
  baseLapMs: number,
): Promise<void> {
  for (let i = 0; i < order.length; i++) {
    const entry = order[i];
    const position = i + 1;
    const driverId = makeId('driver', entry.driverKey);
    const constructorId = makeId('constructor', entry.constructorKey);
    const id = makeId('qualifying', `${raceId}-${entry.driverKey}`);

    // All drivers set Q1 time
    const q1TimeMs = Math.round(baseLapMs * randFloat(1.01, 1.03));

    // Top 15 set Q2 time
    const q2TimeMs = position <= 15 ? Math.round(baseLapMs * randFloat(1.005, 1.02)) : null;

    // Top 10 set Q3 time (pole pace)
    const q3TimeMs = position <= 10 ? Math.round(baseLapMs * randFloat(0.995, 1.01)) : null;

    await prisma.qualifyingResult.upsert({
      where: { id },
      update: {},
      create: {
        id,
        raceId,
        driverId,
        constructorId,
        position,
        q1TimeMs,
        q2TimeMs,
        q3TimeMs,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Race results
// ---------------------------------------------------------------------------

type RaceResultData = {
  driverKey: string;
  constructorKey: string;
  points: number;
  finishPosition: number | null;
};

async function seedRaceResults(
  prisma: PrismaClient,
  raceId: string,
  order: DriverEntry[],
  totalLaps: number,
  baseLapMs: number,
  _year: number,
  _round: number,
): Promise<{ results: RaceResultData[] }> {
  const results: RaceResultData[] = [];
  let fastestLapDriverIdx = -1;
  let fastestLapMs = Infinity;

  // Determine grid order (from qualifying — roughly the same order with some variation)
  const gridOrder = simulateQualifyingOrder(order);

  // Simulate DNFs (~8% rate)
  const dnfSet = new Set<number>();
  for (let i = 0; i < order.length; i++) {
    if (randBool(0.08)) dnfSet.add(i);
  }

  let finishPos = 1;
  for (let i = 0; i < order.length; i++) {
    const entry = order[i];
    const gridPos = gridOrder.findIndex((g) => g.driverKey === entry.driverKey) + 1;
    const isDNF = dnfSet.has(i);
    const isDSQ = !isDNF && randBool(0.005); // 0.5% disqualification rate

    let status: RaceResultStatus;
    let finishPosition: number | null;
    if (isDSQ) {
      status = RaceResultStatus.DSQ;
      finishPosition = null;
    } else if (isDNF) {
      status = RaceResultStatus.DNF;
      finishPosition = null;
    } else {
      status = RaceResultStatus.Finished;
      finishPosition = finishPos++;
    }

    // Fastest lap for a random finisher in top 10
    const lapTimeMs = Math.round(baseLapMs * randFloat(0.995, 1.015));
    if (finishPosition !== null && finishPosition <= 10 && lapTimeMs < fastestLapMs) {
      fastestLapMs = lapTimeMs;
      fastestLapDriverIdx = i;
    }

    const lapsCompleted = isDNF
      ? Math.round(totalLaps * randFloat(0.1, 0.85))
      : isDSQ
      ? totalLaps
      : totalLaps;

    const totalTimeMs = finishPosition === 1 ? totalLaps * lapTimeMs :
      finishPosition !== null ? totalLaps * lapTimeMs + randInt(500, 60000) : null;

    const gapToLeaderMs = finishPosition === 1 ? null :
      finishPosition !== null ? randInt(500, 90000) : null;

    const pts = racePoints(finishPosition, false, status);
    results.push({ driverKey: entry.driverKey, constructorKey: entry.constructorKey, points: pts, finishPosition });

    const driverId = makeId('driver', entry.driverKey);
    const constructorId = makeId('constructor', entry.constructorKey);
    const id = makeId('race-result', `${raceId}-${entry.driverKey}`);

    await prisma.raceResult.upsert({
      where: { id },
      update: {},
      create: {
        id,
        raceId,
        driverId,
        constructorId,
        gridPosition: gridPos,
        finishPosition,
        status,
        statusDetail: isDNF ? pick(['Engine failure', 'Hydraulics', 'Collision', 'Spin off', 'Gearbox', 'Brake failure']) : null,
        points: pts,
        lapsCompleted,
        totalTimeMs,
        fastestLap: false, // Will be patched below
        fastestLapTimeMs: lapTimeMs,
        gapToLeaderMs,
      },
    });
  }

  // Patch fastest lap
  if (fastestLapDriverIdx >= 0) {
    const flEntry = order[fastestLapDriverIdx];
    const flId = makeId('race-result', `${raceId}-${flEntry.driverKey}`);
    const flPts = racePoints(results[fastestLapDriverIdx].finishPosition, true, RaceResultStatus.Finished);
    await prisma.raceResult.update({
      where: { id: flId },
      data: { fastestLap: true, points: flPts },
    });
    // Also update accumulated points for this driver
    results[fastestLapDriverIdx].points = flPts;
  }

  return { results };
}

// ---------------------------------------------------------------------------
// Sprint results
// ---------------------------------------------------------------------------

async function seedSprintResults(
  prisma: PrismaClient,
  raceId: string,
  order: DriverEntry[],
): Promise<void> {
  const sprintLaps = 17; // sprints are ~100km
  for (let i = 0; i < order.length; i++) {
    const entry = order[i];
    const finishPosition = i + 1;
    const pts = SPRINT_POINTS_MAP[finishPosition] ?? 0;
    const driverId = makeId('driver', entry.driverKey);
    const constructorId = makeId('constructor', entry.constructorKey);
    const id = makeId('sprint-result', `${raceId}-${entry.driverKey}`);

    await prisma.sprintResult.upsert({
      where: { id },
      update: {},
      create: {
        id,
        raceId,
        driverId,
        constructorId,
        gridPosition: i + 1,
        finishPosition,
        points: pts,
        lapsCompleted: sprintLaps,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Driver standings snapshot
// ---------------------------------------------------------------------------

async function seedDriverStandings(
  prisma: PrismaClient,
  raceId: string,
  driverPoints: Record<string, number>,
  driverWins: Record<string, number>,
  entries: DriverEntry[],
): Promise<void> {
  // Only include drivers that participated in this race
  const driverKeys = [...new Set(entries.map((e) => e.driverKey))];
  const sorted = driverKeys
    .map((key) => ({ key, pts: driverPoints[key] ?? 0, wins: driverWins[key] ?? 0 }))
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins);

  for (let i = 0; i < sorted.length; i++) {
    const { key, pts, wins } = sorted[i];
    const id = makeId('driver-standing', `${raceId}-${key}`);
    const driverId = makeId('driver', key);

    await prisma.driverStanding.upsert({
      where: { id },
      update: {},
      create: {
        id,
        raceId,
        driverId,
        points: pts,
        position: i + 1,
        wins,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Constructor standings snapshot
// ---------------------------------------------------------------------------

async function seedConstructorStandings(
  prisma: PrismaClient,
  raceId: string,
  constructorPoints: Record<string, number>,
  constructorWins: Record<string, number>,
  entries: DriverEntry[],
): Promise<void> {
  const constructorKeys = [...new Set(entries.map((e) => e.constructorKey))];
  const sorted = constructorKeys
    .map((key) => ({ key, pts: constructorPoints[key] ?? 0, wins: constructorWins[key] ?? 0 }))
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins);

  for (let i = 0; i < sorted.length; i++) {
    const { key, pts, wins } = sorted[i];
    const id = makeId('constructor-standing', `${raceId}-${key}`);
    const constructorId = makeId('constructor', key);

    await prisma.constructorStanding.upsert({
      where: { id },
      update: {},
      create: {
        id,
        raceId,
        constructorId,
        points: pts,
        position: i + 1,
        wins,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Pit stops
// ---------------------------------------------------------------------------

async function seedPitStops(
  prisma: PrismaClient,
  raceId: string,
  order: DriverEntry[],
  totalLaps: number,
): Promise<void> {
  const compounds: TireCompound[] = [TireCompound.Soft, TireCompound.Medium, TireCompound.Hard];

  for (const entry of order) {
    const driverId = makeId('driver', entry.driverKey);
    const numStops = randInt(1, 3);

    // Space stops throughout race
    const stopLaps = new Set<number>();
    while (stopLaps.size < numStops) {
      stopLaps.add(randInt(5, totalLaps - 5));
    }

    const sortedLaps = [...stopLaps].sort((a, b) => a - b);

    for (let stopIdx = 0; stopIdx < sortedLaps.length; stopIdx++) {
      const lap = sortedLaps[stopIdx];
      const compound = pick(compounds);
      const durationMs = randInt(2200, 4500); // 2.2s–4.5s pit stop
      const id = makeId('pit-stop', `${raceId}-${entry.driverKey}-${stopIdx + 1}`);

      await prisma.pitStop.upsert({
        where: { id },
        update: {},
        create: {
          id,
          raceId,
          driverId,
          lap,
          stopNumber: stopIdx + 1,
          durationMs,
          tireCompound: compound,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Lap times (high-volume table)
// ---------------------------------------------------------------------------

async function seedLapTimes(
  prisma: PrismaClient,
  raceId: string,
  order: DriverEntry[],
  totalLaps: number,
  baseLapMs: number,
): Promise<void> {
  // Use createMany for performance on the large lap times table
  const rows: Array<{
    id: string;
    raceId: string;
    driverId: string;
    lapNumber: number;
    timeMs: number;
    position: number;
    sector1Ms: number;
    sector2Ms: number;
    sector3Ms: number;
    isPersonalBest: boolean;
  }> = [];

  // Track each driver's current position (simplified — position based on cumulative time)
  const cumulativeTimes: Record<string, number> = {};
  for (const entry of order) {
    cumulativeTimes[entry.driverKey] = 0;
  }

  const driverBestLap: Record<string, number> = {};

  for (let lap = 1; lap <= totalLaps; lap++) {
    const lapTimesForLap: Array<{ driverKey: string; lapMs: number }> = [];

    for (const entry of order) {
      const driverId = makeId('driver', entry.driverKey);
      const lapTimes = generateLapTimes(baseLapMs, 1, entry.skillRating, entry.constructorPerf);
      const timeMs = lapTimes[0];

      cumulativeTimes[entry.driverKey] += timeMs;
      lapTimesForLap.push({ driverKey: entry.driverKey, lapMs: cumulativeTimes[entry.driverKey] });

      const isPersonalBest = !driverBestLap[entry.driverKey] || timeMs < driverBestLap[entry.driverKey];
      if (isPersonalBest) driverBestLap[entry.driverKey] = timeMs;

      // Sector splits ~33% each with small variation
      const s1 = Math.round(timeMs * randFloat(0.28, 0.35));
      const s2 = Math.round(timeMs * randFloat(0.33, 0.38));
      const s3 = timeMs - s1 - s2;

      const id = makeId('lap-time', `${raceId}-${entry.driverKey}-${lap}`);
      rows.push({
        id,
        raceId,
        driverId,
        lapNumber: lap,
        timeMs,
        position: 0, // Will be set after sorting
        sector1Ms: s1,
        sector2Ms: s2,
        sector3Ms: Math.max(s3, 1000),
        isPersonalBest,
      });
    }

    // Calculate positions for this lap
    lapTimesForLap.sort((a, b) => a.lapMs - b.lapMs);
    const positionMap: Record<string, number> = {};
    lapTimesForLap.forEach(({ driverKey }, idx) => {
      positionMap[driverKey] = idx + 1;
    });

    // Update positions in rows
    for (const row of rows) {
      if (row.lapNumber === lap) {
        const driverKey = order.find((e) => makeId('driver', e.driverKey) === row.driverId)?.driverKey;
        if (driverKey) row.position = positionMap[driverKey] ?? 1;
      }
    }
  }

  // Batch insert with skipDuplicates for idempotency
  // Process in chunks to avoid memory issues
  const CHUNK_SIZE = 500;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await prisma.lapTime.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Race events
// ---------------------------------------------------------------------------

async function seedRaceEvents(
  prisma: PrismaClient,
  raceId: string,
  order: DriverEntry[],
  raceDate: Date,
  totalLaps: number,
  safetyCatLaps: number,
): Promise<void> {
  const events: Array<{
    id: string;
    raceId: string;
    lap: number;
    type: RaceEventType;
    driverId: string | null;
    description: string;
    timestamp: Date;
  }> = [];

  const baseTime = new Date(raceDate.getTime());

  // Start event
  events.push({
    id: makeId('race-event', `${raceId}-start`),
    raceId,
    lap: 1,
    type: RaceEventType.Start,
    driverId: null,
    description: 'Race start — lights out',
    timestamp: baseTime,
  });

  // Safety car if applicable
  if (safetyCatLaps > 0) {
    const scLap = randInt(5, Math.floor(totalLaps * 0.7));
    events.push({
      id: makeId('race-event', `${raceId}-safety-car`),
      raceId,
      lap: scLap,
      type: RaceEventType.SafetyCar,
      driverId: null,
      description: `Safety car deployed — incident on track`,
      timestamp: new Date(baseTime.getTime() + scLap * 90000),
    });
  }

  // Overtakes (~5 per race)
  const numOvertakes = randInt(3, 8);
  for (let i = 0; i < numOvertakes; i++) {
    const overtakingDriver = pick(order);
    const lap = randInt(2, totalLaps - 1);
    events.push({
      id: makeId('race-event', `${raceId}-overtake-${i}`),
      raceId,
      lap,
      type: RaceEventType.Overtake,
      driverId: makeId('driver', overtakingDriver.driverKey),
      description: `${overtakingDriver.driverKey} passes for position`,
      timestamp: new Date(baseTime.getTime() + lap * 90000 + i * 1000),
    });
  }

  // Fastest lap event
  const fastestDriver = pick(order.slice(0, 5));
  const fastestLap = randInt(Math.floor(totalLaps * 0.7), totalLaps - 2);
  events.push({
    id: makeId('race-event', `${raceId}-fastest-lap`),
    raceId,
    lap: fastestLap,
    type: RaceEventType.FastestLap,
    driverId: makeId('driver', fastestDriver.driverKey),
    description: `Fastest lap set by ${fastestDriver.driverKey}`,
    timestamp: new Date(baseTime.getTime() + fastestLap * 90000),
  });

  // Finish event
  const winner = order[0];
  events.push({
    id: makeId('race-event', `${raceId}-finish`),
    raceId,
    lap: totalLaps,
    type: RaceEventType.Finish,
    driverId: makeId('driver', winner.driverKey),
    description: `${winner.driverKey} wins the race`,
    timestamp: new Date(baseTime.getTime() + totalLaps * 90000),
  });

  // Retirement events
  const numRetirements = randInt(0, 3);
  for (let i = 0; i < numRetirements && i < order.length; i++) {
    const retiredDriver = order[order.length - 1 - i];
    const retireLap = randInt(5, totalLaps - 5);
    events.push({
      id: makeId('race-event', `${raceId}-retirement-${i}`),
      raceId,
      lap: retireLap,
      type: RaceEventType.Retirement,
      driverId: makeId('driver', retiredDriver.driverKey),
      description: `${retiredDriver.driverKey} retires from the race`,
      timestamp: new Date(baseTime.getTime() + retireLap * 90000),
    });
  }

  for (const event of events) {
    await prisma.raceEvent.upsert({
      where: { id: event.id },
      update: {},
      create: event,
    });
  }
}

// ---------------------------------------------------------------------------
// Penalties
// ---------------------------------------------------------------------------

async function seedPenalties(
  prisma: PrismaClient,
  raceId: string,
  order: DriverEntry[],
): Promise<void> {
  const numPenalties = randInt(0, 4);
  const penaltyTypes = [PenaltyType.TimePenalty, PenaltyType.Reprimand, PenaltyType.GridPenalty];
  const reasons = [
    'Exceeding track limits',
    'Unsafe release from pit lane',
    'Collision with another driver',
    'Impeding another driver during qualifying',
    'Ignoring blue flags',
    'Formation lap infringement',
  ];

  for (let i = 0; i < numPenalties; i++) {
    const driver = pick(order);
    const penaltyType = pick(penaltyTypes);
    const lap = randInt(1, 60);
    const id = makeId('penalty', `${raceId}-${driver.driverKey}-${i}`);
    const driverId = makeId('driver', driver.driverKey);

    await prisma.penalty.upsert({
      where: { id },
      update: {},
      create: {
        id,
        raceId,
        driverId,
        lap,
        type: penaltyType,
        seconds: penaltyType === PenaltyType.TimePenalty ? pick([5, 10, 20]) : null,
        gridPlaces: penaltyType === PenaltyType.GridPenalty ? pick([3, 5, 10]) : null,
        reason: pick(reasons),
      },
    });
  }
}
