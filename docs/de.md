# Anniversaries

## Überblick

Diese Integration zählt die Tage bis zu den wichtigen Daten: Geburtstage, Hochzeitstage, Gedenktage, Ereignisse. Für jedes Datum zeigt sie die verbleibenden Tage, das erreichte Alter oder die vergangenen Jahre, und sie kann Ihre Szenen am Tag selbst, einige Tage vorher oder zur eigenen Erinnerung jedes Datums starten.

- Jedes Datum wird ein **Gerät**: verbleibende Tage, Jahre am nächsten Jahrestag und bisherige Jahre, vergangene Tage (Option), Tage bis zum halben Jahrestag (Option), nächstes Datum.
- **Szenen-Auslöser**: ein Datum ist heute, ein Datum ist in N Tagen, Erinnerung an ein Datum. **Szenen-Aktion**: die nächsten Daten als Text zum Versenden abrufen.
- Zwei **Dashboard-Widgets**: nächste Daten, Countdown eines Datums.

![Die zwei Widgets der Integration: nächste Daten und Countdown eines Hochzeitstags (generierte Illustration, kein Screenshot)](https://raw.githubusercontent.com/William-De71/gladys-anniversaries/main/docs/assets/widgets.de.png)

Das Bild oben ist eine generierte Illustration, kein Screenshot.

## Voraussetzungen

- Gladys Assistant 5.1.0 oder neuer.
- Die Zeitzone von Gladys richtig eingestellt (**Einstellungen > System**): Die Tage wechseln um ihre Mitternacht.
- Sonst nichts: kein Konto, kein Gerät, kein Internetzugang.

## Konfiguration

Die Daten werden nicht als JSON eingegeben: Jedes ist ein kleines Formular hinter den Schaltflächen unten auf der Konfigurationsseite.

| Feld oder Schaltfläche       | Beschreibung                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uhrzeit der Szenenereignisse | Die Stunde (0 bis 23), zu der die Szenen „heute“, „in N Tagen“ und Erinnerung jeden Tag starten. Standardmäßig 9.                                                    |
| Standard-Erinnerung          | Tage vor einem Datum für seine Szenen „Erinnerung an ein Datum“, für Daten ohne eigene Erinnerung. Standardmäßig 7, 0 für keine.                                     |
| Sprache der Texte            | Funktionsnamen, nächstes Datum, Szenen-Zusammenfassungen, Meldungen der Schaltflächen. Automatisch: die Sprache Ihres Dashboards, sobald ein Widget angezeigt wurde. |
| Datum hinzufügen             | Name, Tag, Monat, Jahr (leer, wenn unbekannt), Art, jedes Jahr oder nur einmal, eigene Erinnerung, „vergangene Tage zählen“, „halber Jahrestag“.                     |
| Datum ändern                 | Name oder Nummer des Datums (wie „Daten auflisten“ sie anzeigt), dann nur die zu ändernden Felder. Ein Jahr 0 entfernt das Jahr.                                     |
| Datum entfernen              | Sein Name oder seine Nummer. Sein Gerät bleibt in Gladys, bis Sie es löschen.                                                                                        |
| Daten auflisten              | Alle Daten mit Nummer, nächstem Termin, Jahren und Optionen sowie dem Tag und der Zeitzone, die die Integration verwendet.                                           |

Die Daten werden in der Konfiguration der Integration in Gladys gespeichert: Sie sind in Ihren Gladys-Sicherungen enthalten.

## Verwendung

### Daten

- **Mit oder ohne Jahr**: Ohne Jahr zählt die Integration die Tage, aber nicht die Jahre.
- **Jedes Jahr oder nur einmal**: Ein einmaliges Datum (ein Ereignis, eine Frist) braucht sein Jahr; danach werden seine verbleibenden Tage negativ und es verschwindet aus den Widgets.
- Der **29. Februar** fällt in den anderen Jahren auf den 28. Februar.
- **Art**: Geburtstag, Hochzeitstag, Jahrestag, Gedenktag, Ereignis oder Sonstiges. Szenen und Widgets können danach filtern.

### Geräte

Nach **Datum hinzufügen** öffnen Sie den Tab **Entdecken** der Integration und fügen das Datum hinzu: Es wird ein Gerät mit seinem Namen.

- Verbleibende Tage (Tage; 0 am Tag selbst).
- Jahre am nächsten Jahrestag und bisherige Jahre (wenn das Jahr bekannt ist; „Alter“ bei einem Geburtstag).
- Vergangene Tage (Option „vergangene Tage zählen“): seit dem letzten Termin oder seit einem einmaligen Datum.
- Tage bis zum halben Jahrestag (Option), sechs Monate nach dem Datum.
- Nächstes Datum, in der Sprache der Integration geschrieben.

Die Werte wechseln um Mitternacht in der Zeitzone von Gladys. Wenn Sie die Optionen eines Datums ändern, erhält sein Gerät neue Funktionen: Klicken Sie im Tab Entdecken bei ihm auf **Aktualisieren**.

### Dashboard-Widgets

- **Nächste Daten**: die nächsten Daten (1 bis 8), mit den erreichten Jahren, dem Tag und einem Badge (grün am Tag selbst, orange innerhalb der Erinnerung). Einstellungen: wie viele, innerhalb wie vieler Tage, welche Arten. Tippen Sie auf ein Datum für die Details.
- **Countdown**: ein Datum unter den hinzugefügten Geräten: verbleibende Tage, Jahre, vergangene Tage, ursprüngliches Datum, halber Jahrestag und Erinnerung.

### Szenen

Auslöser, einmal am Tag zur Stunde der Konfiguration (nie zweimal für dasselbe Datum am selben Tag; war Gladys zu dieser Stunde gestoppt, kommen sie bei der Rückkehr, am selben Tag):

- **Ein Datum ist heute**: Filter nach Datum und Arten.
- **Ein Datum ist in N Tagen**: Sie wählen N (1 bis 60), zum Beispiel 7 für „eine Woche vorher“.
- **Erinnerung an ein Datum**: wenn ein Datum seine eigene Erinnerung (oder die Standard-Erinnerung) erreicht.

Variablen: Name, Art, erreichte Jahre, ursprüngliches Datum, Tag, verbleibende Tage und ein fertiger Zusammenfassungssatz („Marie: in 7 Tagen, Donnerstag, 24. Dezember 2026 (31 Jahre)“).

Aktion **Nächste Daten abrufen**: innerhalb von N Tagen (0 nur für heute), optional für bestimmte Arten; liefert die Anzahl, eine Zusammenfassung (eine Zeile pro Datum) und das nächste Datum.

Beispiele:

- Wenn heute ein Geburtstag ist → „{{triggerEvent.data.summary}}“ an die Familie senden und das Wohnzimmerlicht in eine festliche Farbe schalten.
- Wenn ein Datum in 7 Tagen ist, Art Hochzeitstag → sich selbst eine Nachricht senden, um das Restaurant zu reservieren.
- Jeden Montag um 8:00 → die nächsten Daten innerhalb von 7 Tagen abrufen → die Zusammenfassung per Nachricht senden.

### Transport

Lokal: Die Integration ruft keinen Onlinedienst auf, nichts verlässt Ihr Gladys. Ihr Badge im Katalog zeigt „lokal“.

## Fehlerbehebung

- **Ein Datum ist um einen Tag verschoben**: Prüfen Sie die Zeitzone von Gladys (Einstellungen > System); „Daten auflisten“ zeigt den Tag und die Zeitzone der Integration.
- **Eine Szene ist nicht gestartet**: Die Ereignisse kommen zur Stunde der Konfiguration, nicht um Mitternacht. Ein nach dieser Stunde hinzugefügtes Datum sendet seine Ereignisse des Tages sofort; ein Datum sendet nie zweimal dasselbe Ereignis am selben Tag.
- **Nach einer Änderung fehlt eine Funktion**: Klicken Sie im Tab Entdecken beim Gerät auf **Aktualisieren**.
- **Etwas anderes**: Öffnen Sie ein Issue auf GitHub (https://github.com/William-De71/gladys-anniversaries/issues) mit den Versionen von Gladys und der Integration, dem Ergebnis von „Daten auflisten“ und den Protokollen der Integration (Einstellungen > Supervision).
