// -----------------------------------------------------------------------------
// Texts of the integration, in English, French, German and Spanish (English
// fallback).
//
// The manifest carries its own labels; these are the texts the code writes at
// runtime: feature names, the next date, widget contents, scene summaries,
// messages of the Configuration screen. Vocabulary of the Gladys interface:
// appareil / Gerät / dispositivo, scène / Szene / escena, Découverte /
// Entdecken / Descubrir.
// -----------------------------------------------------------------------------

const LANGUAGES = ['en', 'fr', 'de', 'es'];

const TEXTS = {
  // kinds of date
  kind_birthday: { en: 'Birthday', fr: 'Anniversaire', de: 'Geburtstag', es: 'Cumpleaños' },
  kind_wedding: {
    en: 'Wedding anniversary',
    fr: 'Anniversaire de mariage',
    de: 'Hochzeitstag',
    es: 'Aniversario de boda',
  },
  kind_anniversary: {
    en: 'Anniversary',
    fr: 'Date anniversaire',
    de: 'Jahrestag',
    es: 'Aniversario',
  },
  kind_memorial: { en: 'Remembrance', fr: 'Commémoration', de: 'Gedenktag', es: 'Conmemoración' },
  kind_event: { en: 'Event', fr: 'Événement', de: 'Ereignis', es: 'Evento' },
  kind_other: { en: 'Other', fr: 'Autre', de: 'Sonstiges', es: 'Otro' },
  recurrence_yearly: { en: 'every year', fr: 'chaque année', de: 'jährlich', es: 'cada año' },
  recurrence_once: { en: 'one time', fr: 'une seule fois', de: 'einmalig', es: 'una sola vez' },

  // features
  featureDaysRemaining: {
    en: 'Days remaining',
    fr: 'Jours restants',
    de: 'Verbleibende Tage',
    es: 'Días restantes',
  },
  featureYearsNext_birthday: {
    en: 'Age at next birthday',
    fr: 'Âge au prochain anniversaire',
    de: 'Alter am nächsten Geburtstag',
    es: 'Edad en el próximo cumpleaños',
  },
  featureYearsNext: {
    en: 'Years at next anniversary',
    fr: 'Années au prochain anniversaire',
    de: 'Jahre am nächsten Jahrestag',
    es: 'Años en el próximo aniversario',
  },
  featureYearsCurrent_birthday: { en: 'Age', fr: 'Âge', de: 'Alter', es: 'Edad' },
  featureYearsCurrent: {
    en: 'Years elapsed',
    fr: 'Années écoulées',
    de: 'Vergangene Jahre',
    es: 'Años transcurridos',
  },
  featureDaysSince: {
    en: 'Days elapsed',
    fr: 'Jours écoulés',
    de: 'Vergangene Tage',
    es: 'Días transcurridos',
  },
  featureHalfDays: {
    en: 'Days to half anniversary',
    fr: 'Jours avant le demi-anniversaire',
    de: 'Tage bis zum halben Jahrestag',
    es: 'Días hasta el medio aniversario',
  },
  featureNextDate: {
    en: 'Next date',
    fr: 'Prochaine date',
    de: 'Nächstes Datum',
    es: 'Próxima fecha',
  },
  featureDate: { en: 'Date', fr: 'Date', de: 'Datum', es: 'Fecha' },

  // relative days
  today: { en: 'Today', fr: 'Aujourd’hui', de: 'Heute', es: 'Hoy' },
  tomorrow: { en: 'Tomorrow', fr: 'Demain', de: 'Morgen', es: 'Mañana' },
  inDays: { en: 'In {n} days', fr: 'Dans {n} jours', de: 'In {n} Tagen', es: 'En {n} días' },
  daysAgo: {
    en: '{n} days ago',
    fr: 'Il y a {n} jours',
    de: 'Vor {n} Tagen',
    es: 'Hace {n} días',
  },
  yesterday: { en: 'Yesterday', fr: 'Hier', de: 'Gestern', es: 'Ayer' },
  years: { en: '{n} years', fr: '{n} ans', de: '{n} Jahre', es: '{n} años' },
  oneYear: { en: '1 year', fr: '1 an', de: '1 Jahr', es: '1 año' },

  // scene summaries ("Marie: today, 31 years")
  summaryToday: {
    en: '{name}: today{years}',
    fr: '{name} : aujourd’hui{years}',
    de: '{name}: heute{years}',
    es: '{name}: hoy{years}',
  },
  summaryTomorrow: {
    en: '{name}: tomorrow, {date}{years}',
    fr: '{name} : demain, {date}{years}',
    de: '{name}: morgen, {date}{years}',
    es: '{name}: mañana, {date}{years}',
  },
  summaryIn: {
    en: '{name}: in {n} days, {date}{years}',
    fr: '{name} : dans {n} jours, {date}{years}',
    de: '{name}: in {n} Tagen, {date}{years}',
    es: '{name}: en {n} días, {date}{years}',
  },
  summaryYears: { en: ' ({years})', fr: ' ({years})', de: ' ({years})', es: ' ({years})' },
  summaryNone: {
    en: 'No date in the next {n} days.',
    fr: 'Aucune date dans les {n} prochains jours.',
    de: 'Kein Datum in den nächsten {n} Tagen.',
    es: 'Ninguna fecha en los próximos {n} días.',
  },
  summaryDaysMilestone: {
    en: '{name}: {n} days today',
    fr: '{name} : {n} jours aujourd’hui',
    de: '{name}: heute {n} Tage',
    es: '{name}: {n} días hoy',
  },
  summaryNoneToday: {
    en: 'No date today.',
    fr: 'Aucune date aujourd’hui.',
    de: 'Heute kein Datum.',
    es: 'Ninguna fecha hoy.',
  },

  // widgets
  tileDays: { en: 'Days left', fr: 'Jours restants', de: 'Tage übrig', es: 'Días restantes' },
  tileYearsNext_birthday: {
    en: 'Next age',
    fr: 'Prochain âge',
    de: 'Nächstes Alter',
    es: 'Próxima edad',
  },
  tileYearsNext: { en: 'Years', fr: 'Années', de: 'Jahre', es: 'Años' },
  tileDaysSince: { en: 'Days elapsed', fr: 'Jours écoulés', de: 'Tage vorbei', es: 'Días pasados' },
  unitDays: { en: 'd', fr: 'j', de: 'T', es: 'd' },
  unitYears: { en: 'yrs', fr: 'ans', de: 'J.', es: 'años' },
  statusKind: { en: 'Kind', fr: 'Type', de: 'Art', es: 'Tipo' },
  // the date the anniversary counts from, named after its kind
  statusOriginal: {
    en: 'Date of the event',
    fr: 'Date de l’événement',
    de: 'Datum des Ereignisses',
    es: 'Fecha del evento',
  },
  statusOriginal_birthday: {
    en: 'Date of birth',
    fr: 'Date de naissance',
    de: 'Geburtsdatum',
    es: 'Fecha de nacimiento',
  },
  statusOriginal_wedding: {
    en: 'Wedding date',
    fr: 'Date du mariage',
    de: 'Hochzeitsdatum',
    es: 'Fecha de la boda',
  },
  statusHalf: {
    en: 'Half anniversary',
    fr: 'Demi-anniversaire',
    de: 'Halber Jahrestag',
    es: 'Medio aniversario',
  },
  statusReminder: { en: 'Reminder', fr: 'Rappel', de: 'Erinnerung', es: 'Recordatorio' },
  statusWedding: { en: 'Tradition', fr: 'Noces', de: 'Bezeichnung', es: 'Bodas' },
  reminderDays: {
    en: '{n} days before',
    fr: '{n} jours avant',
    de: '{n} Tage vorher',
    es: '{n} días antes',
  },
  reminderOff: { en: 'None', fr: 'Aucun', de: 'Keine', es: 'Ninguno' },
  passedCaption: {
    en: 'Passed: {date}',
    fr: 'Passée : {date}',
    de: 'Vorbei: {date}',
    es: 'Pasada: {date}',
  },
  upcomingCaption: {
    en: '{count} date(s) in the next {days} days',
    fr: '{count} date(s) dans les {days} prochains jours',
    de: '{count} Datum/Daten in den nächsten {days} Tagen',
    es: '{count} fecha(s) en los próximos {days} días',
  },
  itemDescription: {
    en: '{kind}, {recurrence}. Next: {date} ({relative}).{years} {originalLabel}: {original}.',
    fr: '{kind}, {recurrence}. Prochaine : {date} ({relative}).{years} {originalLabel} : {original}.',
    de: '{kind}, {recurrence}. Nächstes: {date} ({relative}).{years} {originalLabel}: {original}.',
    es: '{kind}, {recurrence}. Próxima: {date} ({relative}).{years} {originalLabel}: {original}.',
  },
  itemYears: {
    en: ' {years} on that day.',
    fr: ' {years} ce jour-là.',
    de: ' {years} an diesem Tag.',
    es: ' {years} ese día.',
  },
  widgetEmpty: {
    en: 'No date yet. Add them in the configuration of the integration (“Add a date” button).',
    fr: 'Aucune date pour l’instant. Ajoutez-les dans la configuration de l’intégration (bouton « Ajouter une date »).',
    de: 'Noch kein Datum. Fügen Sie sie in der Konfiguration der Integration hinzu (Schaltfläche „Datum hinzufügen“).',
    es: 'Todavía no hay fechas. Añádalas en la configuración de la integración (botón «Añadir una fecha»).',
  },
  widgetNothingSoon: {
    en: 'No date in the next {days} days.',
    fr: 'Aucune date dans les {days} prochains jours.',
    de: 'Kein Datum in den nächsten {days} Tagen.',
    es: 'Ninguna fecha en los próximos {days} días.',
  },
  monthCaption: {
    en: '{count} date(s) this month',
    fr: '{count} date(s) ce mois-ci',
    de: '{count} Datum/Daten in diesem Monat',
    es: '{count} fecha(s) este mes',
  },
  monthCaptionMore: {
    en: '{shown} of {count} dates this month',
    fr: '{shown} dates sur {count} ce mois-ci',
    de: '{shown} von {count} Daten in diesem Monat',
    es: '{shown} de {count} fechas este mes',
  },
  monthNothing: {
    en: 'No date in {month}.',
    fr: 'Aucune date en {month}.',
    de: 'Kein Datum im {month}.',
    es: 'Ninguna fecha en {month}.',
  },

  // the "Add a date" button of the widgets and its form
  buttonAdd: {
    en: 'Add a date',
    fr: 'Ajouter une date',
    de: 'Datum hinzufügen',
    es: 'Añadir fecha',
  },
  formName: { en: 'Name', fr: 'Nom', de: 'Name', es: 'Nombre' },
  formNamePlaceholder: { en: 'Marie', fr: 'Marie', de: 'Marie', es: 'María' },
  formDate: {
    en: 'Date (day/month/year)',
    fr: 'Date (jour/mois/année)',
    de: 'Datum (Tag.Monat.Jahr)',
    es: 'Fecha (día/mes/año)',
  },
  formDatePlaceholder: { en: '24/12/1995', fr: '24/12/1995', de: '24.12.1995', es: '24/12/1995' },
  formDateDescription: {
    en: 'Day first. The year is optional (24/12) for a yearly date.',
    fr: 'Le jour d’abord. L’année est facultative (24/12) pour une date annuelle.',
    de: 'Der Tag zuerst. Das Jahr ist bei einem jährlichen Datum optional (24.12.).',
    es: 'Primero el día. El año es opcional (24/12) en una fecha anual.',
  },
  formKind: { en: 'Kind', fr: 'Type', de: 'Art', es: 'Tipo' },
  formRecurrence: { en: 'Repeat', fr: 'Répétition', de: 'Wiederholung', es: 'Repetición' },
  toastAdded: {
    en: 'Date added: {name}. Add its device from the Discover tab of the integration.',
    fr: 'Date ajoutée : {name}. Ajoutez son appareil depuis l’onglet Découverte de l’intégration.',
    de: 'Datum hinzugefügt: {name}. Fügen Sie sein Gerät im Tab Entdecken der Integration hinzu.',
    es: 'Fecha añadida: {name}. Añada su dispositivo desde la pestaña Descubrir de la integración.',
  },
  toastNoForm: {
    en: 'This version of Gladys does not send the form: update Gladys, or use the configuration of the integration.',
    fr: 'Cette version de Gladys n’envoie pas le formulaire : mettez Gladys à jour, ou passez par la configuration de l’intégration.',
    de: 'Diese Gladys-Version sendet das Formular nicht: Aktualisieren Sie Gladys oder nutzen Sie die Konfiguration der Integration.',
    es: 'Esta versión de Gladys no envía el formulario: actualice Gladys o use la configuración de la integración.',
  },
  widgetChooseDate: {
    en: 'Choose a date in the settings of this widget.',
    fr: 'Choisissez une date dans les réglages de ce widget.',
    de: 'Wählen Sie ein Datum in den Einstellungen dieses Widgets.',
    es: 'Elija una fecha en los ajustes de este widget.',
  },
  widgetUnknownDate: {
    en: 'This date no longer exists: choose another one in the settings of this widget.',
    fr: 'Cette date n’existe plus : choisissez-en une autre dans les réglages de ce widget.',
    de: 'Dieses Datum existiert nicht mehr: Wählen Sie in den Einstellungen dieses Widgets ein anderes.',
    es: 'Esta fecha ya no existe: elija otra en los ajustes de este widget.',
  },

  // configuration actions
  added: {
    en: 'Added: {line}\nIt is now on the Discover tab of the integration: add it there to get its device.',
    fr: 'Ajoutée : {line}\nElle est maintenant dans l’onglet Découverte de l’intégration : ajoutez-la depuis cet onglet pour obtenir son appareil.',
    de: 'Hinzugefügt: {line}\nEs steht jetzt im Tab Entdecken der Integration: Fügen Sie es dort hinzu, um sein Gerät zu erhalten.',
    es: 'Añadida: {line}\nAhora está en la pestaña Descubrir de la integración: añádala desde allí para obtener su dispositivo.',
  },
  edited: {
    en: 'Updated: {line}',
    fr: 'Modifiée : {line}',
    de: 'Geändert: {line}',
    es: 'Modificada: {line}',
  },
  editedFeatures: {
    en: '\nIts features changed: open the Discover tab and click “Update” on its device.',
    fr: '\nSes fonctionnalités ont changé : ouvrez l’onglet Découverte et cliquez sur « Mettre à jour » sur son appareil.',
    de: '\nSeine Funktionen haben sich geändert: Öffnen Sie den Tab Entdecken und klicken Sie bei seinem Gerät auf „Aktualisieren“.',
    es: '\nSus funciones han cambiado: abra la pestaña Descubrir y pulse «Actualizar» en su dispositivo.',
  },
  removed: {
    en: 'Removed: {name}. If its device exists in Gladys, delete it from the Devices tab.',
    fr: 'Supprimée : {name}. Si son appareil existe dans Gladys, supprimez-le depuis l’onglet Appareils.',
    de: 'Entfernt: {name}. Wenn sein Gerät in Gladys existiert, löschen Sie es im Tab Geräte.',
    es: 'Eliminada: {name}. Si su dispositivo existe en Gladys, elimínelo desde la pestaña Dispositivos.',
  },
  listEmpty: {
    en: 'No date yet: use “Add a date”.',
    fr: 'Aucune date pour l’instant : utilisez « Ajouter une date ».',
    de: 'Noch kein Datum: Verwenden Sie „Datum hinzufügen“.',
    es: 'Todavía no hay fechas: use «Añadir una fecha».',
  },
  listHeader: {
    en: '{count} date(s), today is {today} ({timezone}):',
    fr: '{count} date(s), nous sommes le {today} ({timezone}) :',
    de: '{count} Datum/Daten, heute ist {today} ({timezone}):',
    es: '{count} fecha(s), hoy es {today} ({timezone}):',
  },
  listLine: {
    en: '#{n} {name} — {kind}, {original} ({recurrence}) — next: {date}, {relative}{years}{options}',
    fr: '#{n} {name} — {kind}, {original} ({recurrence}) — prochaine : {date}, {relative}{years}{options}',
    de: '#{n} {name} — {kind}, {original} ({recurrence}) — nächstes: {date}, {relative}{years}{options}',
    es: '#{n} {name} — {kind}, {original} ({recurrence}) — próxima: {date}, {relative}{years}{options}',
  },
  listOptionReminder: {
    en: 'reminder {n} d before',
    fr: 'rappel {n} j avant',
    de: 'Erinnerung {n} T vorher',
    es: 'recordatorio {n} d antes',
  },
  listOptionCountUp: {
    en: 'counts the days elapsed',
    fr: 'compte les jours écoulés',
    de: 'zählt die vergangenen Tage',
    es: 'cuenta los días pasados',
  },
  listOptionHalf: {
    en: 'half anniversary',
    fr: 'demi-anniversaire',
    de: 'halber Jahrestag',
    es: 'medio aniversario',
  },
  statusOk: {
    en: '{count} date(s) registered.',
    fr: '{count} date(s) enregistrée(s).',
    de: '{count} Datum/Daten gespeichert.',
    es: '{count} fecha(s) registrada(s).',
  },
  statusEmpty: {
    en: 'No date yet: add them with the “Add a date” button below.',
    fr: 'Aucune date pour l’instant : ajoutez-les avec le bouton « Ajouter une date » ci-dessous.',
    de: 'Noch kein Datum: Fügen Sie sie mit der Schaltfläche „Datum hinzufügen“ unten hinzu.',
    es: 'Todavía no hay fechas: añádalas con el botón «Añadir una fecha» de abajo.',
  },

  // errors of the configuration actions (thrown: shown in red)
  errorName: {
    en: 'Give the date a name (1 to {max} characters).',
    fr: 'Donnez un nom à la date (1 à {max} caractères).',
    de: 'Geben Sie dem Datum einen Namen (1 bis {max} Zeichen).',
    es: 'Dé un nombre a la fecha (de 1 a {max} caracteres).',
  },
  errorDay: {
    en: 'The day must be a whole number from 1 to 31.',
    fr: 'Le jour doit être un nombre entier de 1 à 31.',
    de: 'Der Tag muss eine ganze Zahl von 1 bis 31 sein.',
    es: 'El día debe ser un número entero de 1 a 31.',
  },
  errorMonth: {
    en: 'Choose a month.',
    fr: 'Choisissez un mois.',
    de: 'Wählen Sie einen Monat.',
    es: 'Elija un mes.',
  },
  errorYear: {
    en: 'The year must be a whole number from {min} to {max}, or empty when it is unknown.',
    fr: 'L’année doit être un nombre entier de {min} à {max}, ou vide si elle est inconnue.',
    de: 'Das Jahr muss eine ganze Zahl von {min} bis {max} sein, oder leer, wenn es unbekannt ist.',
    es: 'El año debe ser un número entero de {min} a {max}, o vacío si se desconoce.',
  },
  errorNoSuchDay: {
    en: 'This day does not exist: {day}/{month}{year}.',
    fr: 'Ce jour n’existe pas : {day}/{month}{year}.',
    de: 'Diesen Tag gibt es nicht: {day}.{month}.{year}',
    es: 'Este día no existe: {day}/{month}{year}.',
  },
  errorOnceNeedsYear: {
    en: 'A one-time date needs its year.',
    fr: 'Une date unique a besoin de son année.',
    de: 'Ein einmaliges Datum braucht sein Jahr.',
    es: 'Una fecha única necesita su año.',
  },
  errorReminder: {
    en: 'The reminder must be a whole number of days from 0 to {max}.',
    fr: 'Le rappel doit être un nombre entier de jours de 0 à {max}.',
    de: 'Die Erinnerung muss eine ganze Zahl von Tagen von 0 bis {max} sein.',
    es: 'El recordatorio debe ser un número entero de días de 0 a {max}.',
  },
  errorTypedDate: {
    en: 'Type the date day first: 24/12/1995, or 24/12 without the year.',
    fr: 'Saisissez la date en commençant par le jour : 24/12/1995, ou 24/12 sans l’année.',
    de: 'Geben Sie das Datum mit dem Tag zuerst ein: 24.12.1995, oder 24.12. ohne Jahr.',
    es: 'Escriba la fecha empezando por el día: 24/12/1995, o 24/12 sin el año.',
  },
  errorChoice: {
    en: 'Unknown value: {value}.',
    fr: 'Valeur inconnue : {value}.',
    de: 'Unbekannter Wert: {value}.',
    es: 'Valor desconocido: {value}.',
  },
  errorTarget: {
    en: 'Type the name of the date or its number (#2), as shown by “List the dates”.',
    fr: 'Saisissez le nom de la date ou son numéro (#2), comme l’affiche « Lister les dates ».',
    de: 'Geben Sie den Namen des Datums oder seine Nummer (#2) ein, wie „Daten auflisten“ sie anzeigt.',
    es: 'Escriba el nombre de la fecha o su número (#2), como lo muestra «Listar las fechas».',
  },
  errorNotFound: {
    en: 'No date matches “{query}”. “List the dates” shows their names and numbers.',
    fr: 'Aucune date ne correspond à « {query} ». « Lister les dates » affiche leurs noms et numéros.',
    de: 'Kein Datum passt zu „{query}“. „Daten auflisten“ zeigt ihre Namen und Nummern.',
    es: 'Ninguna fecha coincide con «{query}». «Listar las fechas» muestra sus nombres y números.',
  },
  errorAmbiguous: {
    en: 'Several dates are named “{query}”: use their number ({numbers}).',
    fr: 'Plusieurs dates s’appellent « {query} » : utilisez leur numéro ({numbers}).',
    de: 'Mehrere Daten heißen „{query}“: Verwenden Sie ihre Nummer ({numbers}).',
    es: 'Varias fechas se llaman «{query}»: use su número ({numbers}).',
  },
  errorFull: {
    en: 'At most {max} dates.',
    fr: '{max} dates au maximum.',
    de: 'Höchstens {max} Daten.',
    es: '{max} fechas como máximo.',
  },
  errorSave: {
    en: 'Gladys could not save the dates: {message}',
    fr: 'Gladys n’a pas pu enregistrer les dates : {message}',
    de: 'Gladys konnte die Daten nicht speichern: {message}',
    es: 'Gladys no pudo guardar las fechas: {message}',
  },
};

/**
 * @description Whether a value is one of the languages of the integration.
 * @param {unknown} value - The value.
 * @returns {boolean} True for en, fr, de, es.
 */
function isLanguage(value) {
  return LANGUAGES.includes(value);
}

/**
 * @description A text in a language (English fallback), with its
 * substitutions.
 * @param {string} key - The TEXTS key.
 * @param {string} language - The language.
 * @param {object} [values] - The substitutions.
 * @returns {string} The text.
 * @example
 * t('inDays', 'fr', { n: 3 }); // -> 'Dans 3 jours'
 */
function t(key, language, values = {}) {
  const entry = TEXTS[key];
  if (!entry) {
    return key;
  }
  const template = entry[language] ?? entry.en;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

/**
 * @description The text in every language, for a multi-language message.
 * @param {string|Function} key - The TEXTS key, or `(language) => string`.
 * @param {object} [values] - The substitutions.
 * @returns {{ en: string, fr: string, de: string, es: string }} The message.
 * @example
 * all('statusOk', { count: 3 });
 */
function all(key, values = {}) {
  return Object.fromEntries(
    LANGUAGES.map((language) => [
      language,
      typeof key === 'function' ? key(language) : t(key, language, values),
    ]),
  );
}

const locale = (language) => (isLanguage(language) ? language : 'en');

/**
 * @description A calendar day written in a language: "Thursday, December 24,
 * 2026" (long), "Dec 24, 2026" (short); without a year for --MM-DD.
 * @param {string} iso - YYYY-MM-DD or --MM-DD.
 * @param {string} language - The language.
 * @param {'long'|'short'} [style] - The style.
 * @returns {string} The text.
 * @example
 * formatDay('2026-12-24', 'fr'); // -> 'jeudi 24 décembre 2026'
 */
function formatDay(iso, language, style = 'long') {
  const noYear = iso.startsWith('--');
  const [year, month, day] = (noYear ? `2000${iso.slice(1)}` : iso).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const options =
    style === 'long'
      ? { day: 'numeric', month: 'long', timeZone: 'UTC' }
      : { day: 'numeric', month: 'short', timeZone: 'UTC' };
  if (!noYear) {
    options.year = 'numeric';
    if (style === 'long') {
      options.weekday = 'long';
    }
  }
  return new Intl.DateTimeFormat(locale(language), options).format(date);
}

/**
 * @description The month of a day, as a title: "October 2026", "Oktober 2026".
 * @param {number} year - The year.
 * @param {number} month - 1-12.
 * @param {string} language - The language.
 * @returns {string} The text, first letter in upper case.
 * @example
 * formatMonth(2026, 10, 'fr'); // -> 'Octobre 2026'
 */
function formatMonth(year, month, language) {
  const text = new Intl.DateTimeFormat(locale(language), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return text.charAt(0).toLocaleUpperCase(locale(language)) + text.slice(1);
}

/**
 * @description A whole number written in a language ("10 000", "10,000").
 * @param {number} n - The number.
 * @param {string} language - The language.
 * @returns {string} The text.
 */
const formatNumber = (n, language) => new Intl.NumberFormat(locale(language)).format(n);

/**
 * @description "Today", "Tomorrow", "In 3 days", "Yesterday", "5 days ago".
 * @param {number} days - Days from today (negative in the past).
 * @param {string} language - The language.
 * @returns {string} The text.
 */
function relativeDays(days, language) {
  if (days === 0) return t('today', language);
  if (days === 1) return t('tomorrow', language);
  if (days === -1) return t('yesterday', language);
  return days > 0 ? t('inDays', language, { n: days }) : t('daysAgo', language, { n: -days });
}

/**
 * @description relativeDays in the middle of a sentence: only the first
 * letter is lowered ("in 3 Tagen", never "in 3 tagen").
 * @param {number} days - Days from today.
 * @param {string} language - The language.
 * @returns {string} The text.
 */
function relativeInline(days, language) {
  const text = relativeDays(days, language);
  return text.charAt(0).toLocaleLowerCase(locale(language)) + text.slice(1);
}

/**
 * @description "31 years", "1 year".
 * @param {number} n - The years.
 * @param {string} language - The language.
 * @returns {string} The text.
 */
const yearsText = (n, language) => (n === 1 ? t('oneYear', language) : t('years', language, { n }));

export {
  LANGUAGES,
  TEXTS,
  isLanguage,
  t,
  all,
  formatDay,
  formatMonth,
  formatNumber,
  relativeDays,
  relativeInline,
  yearsText,
};
