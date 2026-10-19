// -----------------------------------------------------------------------------
// Traditional names of the wedding anniversaries ("noces de porcelaine",
// "silver anniversary", "Goldene Hochzeit", "bodas de oro").
//
// Each language has its own tradition, never a translation of another one:
//   - fr: the French list, one name a year from 1 to 80 (Wikipedia
//         "Anniversaire de mariage"; the first name where it gives two);
//   - en: the US traditional list (Wikipedia "Wedding anniversary"), the
//         years it names;
//   - de: the most common German name of the years Wikipedia "Hochzeitstag"
//         names;
//   - es: the traditional gifts of Wikipedia "Aniversario de bodas", as
//         "bodas de …".
// A year a tradition does not name has no name: nothing is shown.
//
// Written to sit in a sentence ("joyeuses noces de porcelaine"): lower case
// except the German nouns; capitalize() gives the form of a label.
// -----------------------------------------------------------------------------

const FR = [
  'coton', 'cuir', 'froment', 'cire', 'bois', 'chypre', 'laine', 'coquelicot', 'faïence', 'étain',
  'corail', 'soie', 'muguet', 'plomb', 'cristal', 'saphir', 'rose', 'turquoise', 'cretonne',
  'porcelaine', 'opale', 'bronze', 'béryl', 'satin', 'argent', 'jade', 'acajou', 'nickel',
  'velours', 'perle', 'basane', 'cuivre', 'porphyre', 'ambre', 'rubis', 'mousseline', 'papier',
  'mercure', 'crêpe', 'émeraude', 'fer', 'nacre', 'flanelle', 'topaze', 'vermeil', 'lavande',
  'cachemire', 'améthyste', 'cèdre', 'or', 'camélia', 'tourmaline', 'merisier', 'zibeline',
  'orchidée', 'buis', 'azalée', 'érable', 'olivier', 'diamant', 'platane', 'ivoire', 'lilas',
  'astrakan', 'palissandre', 'jasmin', 'chinchilla', 'granit', 'mélèze', 'platine', 'ocre',
  'titane', 'fonte', 'sienne', 'albâtre', 'zinc', 'silice', 'ébène', 'bambou', 'chêne',
]; // prettier-ignore

const EN = {
  1: 'paper', 2: 'cotton', 3: 'leather', 4: 'fruit and flowers', 5: 'wood', 6: 'iron', 7: 'wool',
  8: 'bronze', 9: 'pottery', 10: 'tin', 11: 'steel', 12: 'silk', 13: 'lace', 14: 'ivory',
  15: 'crystal', 20: 'china', 25: 'silver', 30: 'pearl', 35: 'coral', 40: 'ruby', 45: 'sapphire',
  50: 'golden', 55: 'emerald', 60: 'diamond', 65: 'blue sapphire', 70: 'platinum',
  75: 'diamond and gold', 80: 'oak',
}; // prettier-ignore

const DE = {
  1: 'Papierhochzeit', 2: 'Baumwollhochzeit', 3: 'Lederhochzeit', 4: 'Seidenhochzeit',
  5: 'Holzhochzeit', 6: 'Zuckerhochzeit', 7: 'Kupferhochzeit', 8: 'Blechhochzeit',
  9: 'Keramikhochzeit', 10: 'Rosenhochzeit', 11: 'Stählerne Hochzeit', 12: 'Nickelhochzeit',
  13: 'Maiglöckchenhochzeit', 14: 'Elfenbeinhochzeit', 15: 'Kristallhochzeit',
  16: 'Saphirhochzeit', 20: 'Porzellanhochzeit', 25: 'Silberhochzeit', 26: 'Jadehochzeit',
  29: 'Samthochzeit', 30: 'Perlenhochzeit', 31: 'Lindenhochzeit', 34: 'Bernsteinhochzeit',
  35: 'Leinenhochzeit', 40: 'Rubinhochzeit', 44: 'Sternenhochzeit', 45: 'Messinghochzeit',
  50: 'Goldene Hochzeit', 51: 'Weidenhochzeit', 55: 'Platinhochzeit', 56: 'Asternhochzeit',
  57: 'Jadehochzeit', 58: 'Engelshochzeit', 59: 'Gezeitenhochzeit', 60: 'Diamantene Hochzeit',
  65: 'Eiserne Hochzeit', 70: 'Gnadenhochzeit', 75: 'Kronjuwelenhochzeit', 80: 'Eichenhochzeit',
  85: 'Engelshochzeit', 90: 'Marmorhochzeit', 100: 'Himmelshochzeit',
}; // prettier-ignore

const ES = [
  'papel', 'algodón', 'cuero', 'lino', 'madera', 'hierro', 'lana', 'bronce', 'arcilla',
  'aluminio', 'acero', 'seda', 'encaje', 'marfil', 'cristal', 'hiedra', 'alhelí', 'cuarzo',
  'madreselva', 'porcelana', 'roble', 'cobre', 'agua', 'granito', 'plata', 'rosas', 'azabache',
  'ámbar', 'granate', 'perla', 'ébano', 'cobre', 'estaño', 'amapola', 'coral', 'sílex', 'piedra',
  'jade', 'ágata', 'rubí', 'topacio', 'jaspe', 'ópalo', 'turquesa', 'zafiro', 'nácar', 'amatista',
  'feldespato', 'circón', 'oro',
]; // prettier-ignore
const ES_LATER = {
  55: 'esmeralda', 60: 'diamante', 65: 'platino', 70: 'titanio', 75: 'brillantes', 80: 'roble',
  85: 'mármol', 90: 'granito', 95: 'ónix', 100: 'hueso',
}; // prettier-ignore

// "noces d’or", "noces d’étain": the elision of French.
const frenchName = (material) =>
  /^[aeéèêioôuh]/i.test(material) ? `noces d’${material}` : `noces de ${material}`;

/**
 * @description The traditional name of a wedding anniversary.
 * @param {number|null} years - The years of marriage.
 * @param {string} language - en, fr, de or es (English otherwise).
 * @returns {string} The name, or '' when the tradition does not name it.
 * @example
 * weddingName(20, 'fr'); // -> 'noces de porcelaine'
 */
function weddingName(years, language) {
  if (!Number.isInteger(years) || years < 1) {
    return '';
  }
  switch (language) {
    case 'fr':
      return FR[years - 1] ? frenchName(FR[years - 1]) : '';
    case 'de':
      return DE[years] ?? '';
    case 'es': {
      const material = ES[years - 1] ?? ES_LATER[years];
      return material ? `bodas de ${material}` : '';
    }
    default:
      return EN[years] ? `${EN[years]} anniversary` : '';
  }
}

/**
 * @description The form of a label: first letter in upper case.
 * @param {string} text - The text.
 * @returns {string} The text.
 */
const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '');

export { weddingName, capitalize };
