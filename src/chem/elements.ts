export interface ElementData {
  readonly symbol: string;
  readonly name: string;
  readonly z: number;
  readonly atomicMass: number;
  readonly mostAbundantA: number;
  readonly group: number;
  readonly period: number;
  readonly block: 's' | 'p' | 'd' | 'f';
  readonly electronegativity: number | null;
  readonly ionizationEnergy1: number; // in eV
}

// Compact raw data: [symbol, name, Z, mass, mostAbundantA, group, period, block, electronegativity, IE1]
type RawElement = [string, string, number, number, number, number, number, 's' | 'p' | 'd' | 'f', number | null, number];

const RAW_ELEMENTS: readonly RawElement[] = [
  ['H', 'Hydrogen', 1, 1.008, 1, 1, 1, 's', 2.20, 13.598],
  ['He', 'Helium', 2, 4.0026, 4, 18, 1, 's', null, 24.587],
  ['Li', 'Lithium', 3, 6.94, 7, 1, 2, 's', 0.98, 5.392],
  ['Be', 'Beryllium', 4, 9.0122, 9, 2, 2, 's', 1.57, 9.323],
  ['B', 'Boron', 5, 10.81, 11, 13, 2, 'p', 2.04, 8.298],
  ['C', 'Carbon', 6, 12.011, 12, 14, 2, 'p', 2.55, 11.260],
  ['N', 'Nitrogen', 7, 14.007, 14, 15, 2, 'p', 3.04, 14.534],
  ['O', 'Oxygen', 8, 15.999, 16, 16, 2, 'p', 3.44, 13.618],
  ['F', 'Fluorine', 9, 18.998, 19, 17, 2, 'p', 3.98, 17.423],
  ['Ne', 'Neon', 10, 20.180, 20, 18, 2, 'p', null, 21.565],
  ['Na', 'Sodium', 11, 22.990, 23, 1, 3, 's', 0.93, 5.139],
  ['Mg', 'Magnesium', 12, 24.305, 24, 2, 3, 's', 1.31, 7.646],
  ['Al', 'Aluminium', 13, 26.982, 27, 13, 3, 'p', 1.61, 5.986],
  ['Si', 'Silicon', 14, 28.085, 28, 14, 3, 'p', 1.90, 8.152],
  ['P', 'Phosphorus', 15, 30.974, 31, 15, 3, 'p', 2.19, 10.487],
  ['S', 'Sulfur', 16, 32.06, 32, 16, 3, 'p', 2.58, 10.360],
  ['Cl', 'Chlorine', 17, 35.45, 35, 17, 3, 'p', 3.16, 12.968],
  ['Ar', 'Argon', 18, 39.95, 40, 18, 3, 'p', null, 15.760],
  ['K', 'Potassium', 19, 39.098, 39, 1, 4, 's', 0.82, 4.341],
  ['Ca', 'Calcium', 20, 40.078, 40, 2, 4, 's', 1.00, 6.113],
  ['Sc', 'Scandium', 21, 44.956, 45, 3, 4, 'd', 1.36, 6.561],
  ['Ti', 'Titanium', 22, 47.867, 48, 4, 4, 'd', 1.54, 6.828],
  ['V', 'Vanadium', 23, 50.942, 51, 5, 4, 'd', 1.63, 6.746],
  ['Cr', 'Chromium', 24, 51.996, 52, 6, 4, 'd', 1.66, 6.767],
  ['Mn', 'Manganese', 25, 54.938, 55, 7, 4, 'd', 1.55, 7.434],
  ['Fe', 'Iron', 26, 55.845, 56, 8, 4, 'd', 1.83, 7.902],
  ['Co', 'Cobalt', 27, 58.933, 59, 9, 4, 'd', 1.88, 7.881],
  ['Ni', 'Nickel', 28, 58.693, 58, 10, 4, 'd', 1.91, 7.640],
  ['Cu', 'Copper', 29, 63.546, 63, 11, 4, 'd', 1.90, 7.726],
  ['Zn', 'Zinc', 30, 65.38, 64, 12, 4, 'd', 1.65, 9.394],
  ['Ga', 'Gallium', 31, 69.723, 69, 13, 4, 'p', 1.81, 5.999],
  ['Ge', 'Germanium', 32, 72.630, 74, 14, 4, 'p', 2.01, 7.899],
  ['As', 'Arsenic', 33, 74.922, 75, 15, 4, 'p', 2.18, 9.789],
  ['Se', 'Selenium', 34, 78.971, 80, 16, 4, 'p', 2.55, 9.752],
  ['Br', 'Bromine', 35, 79.904, 79, 17, 4, 'p', 2.96, 11.814],
  ['Kr', 'Krypton', 36, 83.798, 84, 18, 4, 'p', 3.00, 14.000],
  ['Rb', 'Rubidium', 37, 85.468, 85, 1, 5, 's', 0.82, 4.177],
  ['Sr', 'Strontium', 38, 87.62, 88, 2, 5, 's', 0.95, 5.695],
  ['Y', 'Yttrium', 39, 88.906, 89, 3, 5, 'd', 1.22, 6.217],
  ['Zr', 'Zirconium', 40, 91.224, 90, 4, 5, 'd', 1.33, 6.634],
  ['Nb', 'Niobium', 41, 92.906, 93, 5, 5, 'd', 1.60, 6.759],
  ['Mo', 'Molybdenum', 42, 95.95, 98, 6, 5, 'd', 2.16, 7.092],
  ['Tc', 'Technetium', 43, 98.0, 98, 7, 5, 'd', 1.90, 7.280],
  ['Ru', 'Ruthenium', 44, 101.07, 102, 8, 5, 'd', 2.20, 7.361],
  ['Rh', 'Rhodium', 45, 102.91, 103, 9, 5, 'd', 2.28, 7.459],
  ['Pd', 'Palladium', 46, 106.42, 106, 10, 5, 'd', 2.20, 8.337],
  ['Ag', 'Silver', 47, 107.87, 107, 11, 5, 'd', 1.93, 7.576],
  ['Cd', 'Cadmium', 48, 112.41, 114, 12, 5, 'd', 1.69, 8.994],
  ['In', 'Indium', 49, 114.82, 115, 13, 5, 'p', 1.78, 5.786],
  ['Sn', 'Tin', 50, 118.71, 120, 14, 5, 'p', 1.96, 7.344],
  ['Sb', 'Antimony', 51, 121.76, 121, 15, 5, 'p', 2.05, 8.608],
  ['Te', 'Tellurium', 52, 127.60, 130, 16, 5, 'p', 2.10, 9.010],
  ['I', 'Iodine', 53, 126.90, 127, 17, 5, 'p', 2.66, 10.451],
  ['Xe', 'Xenon', 54, 131.29, 132, 18, 5, 'p', 2.60, 12.130],
  ['Cs', 'Caesium', 55, 132.91, 133, 1, 6, 's', 0.79, 3.894],
  ['Ba', 'Barium', 56, 137.33, 138, 2, 6, 's', 0.89, 5.212],
  ['La', 'Lanthanum', 57, 138.91, 139, 3, 6, 'f', 1.10, 5.577],
  ['Ce', 'Cerium', 58, 140.12, 140, 3, 6, 'f', 1.12, 5.539],
  ['Pr', 'Praseodymium', 59, 140.91, 141, 3, 6, 'f', 1.13, 5.473],
  ['Nd', 'Neodymium', 60, 144.24, 142, 3, 6, 'f', 1.14, 5.525],
  ['Pm', 'Promethium', 61, 145.0, 145, 3, 6, 'f', 1.13, 5.582],
  ['Sm', 'Samarium', 62, 150.36, 152, 3, 6, 'f', 1.17, 5.644],
  ['Eu', 'Europium', 63, 151.96, 153, 3, 6, 'f', 1.20, 5.670],
  ['Gd', 'Gadolinium', 64, 157.25, 158, 3, 6, 'f', 1.20, 6.150],
  ['Tb', 'Terbium', 65, 158.93, 159, 3, 6, 'f', 1.22, 5.864],
  ['Dy', 'Dysprosium', 66, 162.50, 164, 3, 6, 'f', 1.23, 5.939],
  ['Ho', 'Holmium', 67, 164.93, 165, 3, 6, 'f', 1.24, 6.022],
  ['Er', 'Erbium', 68, 167.26, 166, 3, 6, 'f', 1.24, 6.108],
  ['Tm', 'Thulium', 69, 168.93, 169, 3, 6, 'f', 1.25, 6.184],
  ['Yb', 'Ytterbium', 70, 173.05, 174, 3, 6, 'f', 1.10, 6.254],
  ['Lu', 'Lutetium', 71, 174.97, 175, 3, 6, 'd', 1.27, 5.426],
  ['Hf', 'Hafnium', 72, 178.49, 180, 4, 6, 'd', 1.30, 6.825],
  ['Ta', 'Tantalum', 73, 180.95, 181, 5, 6, 'd', 1.50, 7.550],
  ['W', 'Tungsten', 74, 183.84, 184, 6, 6, 'd', 2.36, 7.864],
  ['Re', 'Rhenium', 75, 186.21, 187, 7, 6, 'd', 1.90, 7.834],
  ['Os', 'Osmium', 76, 190.23, 192, 8, 6, 'd', 2.20, 8.438],
  ['Ir', 'Iridium', 77, 192.22, 193, 9, 6, 'd', 2.20, 8.967],
  ['Pt', 'Platinum', 78, 195.08, 195, 10, 6, 'd', 2.28, 8.959],
  ['Au', 'Gold', 79, 196.97, 197, 11, 6, 'd', 2.54, 9.226],
  ['Hg', 'Mercury', 80, 200.59, 202, 12, 6, 'd', 2.00, 10.438],
  ['Tl', 'Thallium', 81, 204.38, 205, 13, 6, 'p', 1.62, 6.108],
  ['Pb', 'Lead', 82, 207.2, 208, 14, 6, 'p', 2.33, 7.417],
  ['Bi', 'Bismuth', 83, 208.98, 209, 15, 6, 'p', 2.02, 7.286],
  ['Po', 'Polonium', 84, 209.0, 209, 16, 6, 'p', 2.00, 8.417],
  ['At', 'Astatine', 85, 210.0, 210, 17, 6, 'p', 2.20, 9.318],
  ['Rn', 'Radon', 86, 222.0, 222, 18, 6, 'p', 2.20, 10.749],
  ['Fr', 'Francium', 87, 223.0, 223, 1, 7, 's', 0.70, 4.073],
  ['Ra', 'Radium', 88, 226.0, 226, 2, 7, 's', 0.90, 5.278],
  ['Ac', 'Actinium', 89, 227.0, 227, 3, 7, 'f', 1.10, 5.170],
  ['Th', 'Thorium', 90, 232.04, 232, 3, 7, 'f', 1.30, 6.307],
  ['Pa', 'Protactinium', 91, 231.04, 231, 3, 7, 'f', 1.50, 5.890],
  ['U', 'Uranium', 92, 238.03, 238, 3, 7, 'f', 1.38, 6.194],
  ['Np', 'Neptunium', 93, 237.0, 237, 3, 7, 'f', 1.36, 6.266],
  ['Pu', 'Plutonium', 94, 244.0, 244, 3, 7, 'f', 1.28, 6.026],
  ['Am', 'Americium', 95, 243.0, 243, 3, 7, 'f', 1.13, 5.974],
  ['Cm', 'Curium', 96, 247.0, 247, 3, 7, 'f', 1.28, 5.991],
  ['Bk', 'Berkelium', 97, 247.0, 247, 3, 7, 'f', 1.30, 6.198],
  ['Cf', 'Californium', 98, 251.0, 251, 3, 7, 'f', 1.30, 6.282],
  ['Es', 'Einsteinium', 99, 252.0, 252, 3, 7, 'f', 1.30, 6.420],
  ['Fm', 'Fermium', 100, 257.0, 257, 3, 7, 'f', 1.30, 6.500],
  ['Md', 'Mendelevium', 101, 258.0, 258, 3, 7, 'f', 1.30, 6.580],
  ['No', 'Nobelium', 102, 259.0, 259, 3, 7, 'f', 1.30, 6.650],
  ['Lr', 'Lawrencium', 103, 266.0, 262, 3, 7, 'd', 1.30, 4.900],
  ['Rf', 'Rutherfordium', 104, 267.0, 267, 4, 7, 'd', null, 6.000],
  ['Db', 'Dubnium', 105, 268.0, 268, 5, 7, 'd', null, 6.000],
  ['Sg', 'Seaborgium', 106, 269.0, 269, 6, 7, 'd', null, 6.000],
  ['Bh', 'Bohrium', 107, 270.0, 270, 7, 7, 'd', null, 6.000],
  ['Hs', 'Hassium', 108, 270.0, 269, 8, 7, 'd', null, 6.000],
  ['Mt', 'Meitnerium', 109, 278.0, 278, 9, 7, 'd', null, 6.000],
  ['Ds', 'Darmstadtium', 110, 281.0, 281, 10, 7, 'd', null, 6.000],
  ['Rg', 'Roentgenium', 111, 282.0, 281, 11, 7, 'd', null, 6.000],
  ['Cn', 'Copernicium', 112, 285.0, 285, 12, 7, 'd', null, 11.970],
  ['Nh', 'Nihonium', 113, 286.0, 286, 13, 7, 'p', null, 7.300],
  ['Fl', 'Flerovium', 114, 289.0, 289, 14, 7, 'p', null, 8.540],
  ['Mc', 'Moscovium', 115, 290.0, 289, 15, 7, 'p', null, 5.580],
  ['Lv', 'Livermorium', 116, 293.0, 293, 16, 7, 'p', null, 7.100],
  ['Ts', 'Tennessine', 117, 294.0, 293, 17, 7, 'p', null, 7.700],
  ['Og', 'Oganesson', 118, 294.0, 294, 18, 7, 'p', null, 8.900],
];

export const ELEMENTS: readonly ElementData[] = RAW_ELEMENTS.map(([symbol, name, z, atomicMass, mostAbundantA, group, period, block, electronegativity, ionizationEnergy1]) => ({
  symbol,
  name,
  z,
  atomicMass,
  mostAbundantA,
  group,
  period,
  block,
  electronegativity,
  ionizationEnergy1,
}));

const BY_SYMBOL = new Map<string, ElementData>();
const BY_Z = new Map<number, ElementData>();

for (const el of ELEMENTS) {
  BY_SYMBOL.set(el.symbol.toLowerCase(), el);
  BY_Z.set(el.z, el);
}

export function getElement(symbolOrZ: string | number): ElementData {
  if (typeof symbolOrZ === 'number') {
    const el = BY_Z.get(symbolOrZ);
    if (!el) {
      throw new Error(`Unknown element with atomic number Z=${symbolOrZ}`);
    }
    return el;
  }
  const el = BY_SYMBOL.get(symbolOrZ.trim().toLowerCase());
  if (!el) {
    throw new Error(`Unknown element with symbol "${symbolOrZ}"`);
  }
  return el;
}
