# Anniversaries

## Présentation

Cette intégration fait le compte à rebours des dates qui comptent : anniversaires, anniversaires de mariage, commémorations, événements. Pour chaque date, elle indique le nombre de jours restants, l’âge atteint ou le nombre d’années écoulées, et peut démarrer vos scènes le jour J, quelques jours avant ou au rappel propre à chaque date.

- Chaque date devient un **appareil** : jours restants, années au prochain anniversaire et années écoulées, jours écoulés (option), jours avant le demi-anniversaire (option), prochaine date.
- **Déclencheurs de scène** : une date est aujourd’hui, une date est dans N jours, rappel d’une date (filtre « années rondes »), une date atteint un millier de jours. **Action de scène** : obtenir les prochaines dates en texte à envoyer.
- Trois **widgets de tableau de bord** : prochaines dates, compte à rebours d’une date, dates du mois. Un bouton **Ajouter une date** directement depuis le tableau de bord.
- Les **noces** des anniversaires de mariage : noces de coton, de porcelaine, d’or…

![Les trois widgets de l’intégration : prochaines dates, compte à rebours d’un anniversaire de mariage et dates du mois (illustration générée, pas une capture d’écran)](https://raw.githubusercontent.com/William-De71/gladys-anniversaries/main/docs/assets/widgets.fr.png)

L’image ci-dessus est une illustration générée, pas une capture d’écran.

## Prérequis

- Gladys Assistant 5.2.0 ou plus récent.
- Le fuseau horaire de Gladys correctement réglé (**Paramètres > Système**) : les jours changent à son minuit.
- Rien d’autre : ni compte, ni appareil, ni accès à Internet.

## Configuration

Les dates ne se saisissent pas en JSON : chacune est un petit formulaire, derrière les boutons en bas de la page de configuration.

| Champ ou bouton               | Description                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heure des événements de scène | L’heure (0 à 23) à laquelle les scènes « aujourd’hui », « dans N jours » et de rappel démarrent chaque jour. 9 par défaut.                                           |
| Rappel par défaut             | Jours avant une date pour ses scènes « Rappel d’une date », pour les dates sans rappel propre. 7 par défaut, 0 pour aucun.                                           |
| Langue des textes             | Noms des fonctionnalités, prochaine date, résumés des scènes, messages des boutons. Automatique : la langue de votre tableau de bord dès qu’un widget a été affiché. |
| Ajouter une date              | Nom, jour, mois, année (vide si inconnue), type, chaque année ou une seule fois, rappel propre, « compter les jours écoulés », « demi-anniversaire ».                |
| Modifier une date             | Le nom ou le numéro de la date (tel que « Lister les dates » l’affiche), puis seulement les champs à changer. Une année à 0 retire l’année.                          |
| Supprimer une date            | Son nom ou son numéro. Son appareil reste dans Gladys jusqu’à ce que vous le supprimiez.                                                                             |
| Lister les dates              | Toutes les dates avec leur numéro, leur prochaine occurrence, leurs années et options, ainsi que le jour et le fuseau horaire utilisés par l’intégration.            |

Les dates sont enregistrées dans la configuration de l’intégration dans Gladys : elles suivent vos sauvegardes de Gladys.

## Utilisation

### Dates

- **Avec ou sans l’année** : sans elle, l’intégration compte les jours mais pas les années.
- **Chaque année ou une seule fois** : une date unique (un événement, une échéance) a besoin de son année ; une fois passée, ses jours restants deviennent négatifs et elle quitte les widgets.
- Le **29 février** tombe le 28 février les autres années.
- **Type** : anniversaire, anniversaire de mariage, date anniversaire, commémoration, événement ou autre. Les scènes et les widgets peuvent filtrer dessus.
- **Anniversaire de mariage** avec son année : l’intégration donne le nom traditionnel des noces (noces de coton la 1re année, de porcelaine à 20 ans, d’or à 50 ans… liste française de 1 à 80 ans), dans les widgets et les scènes. Chaque langue suit sa propre tradition : en anglais, allemand ou espagnol, les noms (et les années nommées) ne sont pas les mêmes.

### Appareils

Après **Ajouter une date**, ouvrez l’onglet **Découverte** de l’intégration et ajoutez la date : elle devient un appareil qui porte son nom.

- Jours restants (jours ; 0 le jour J).
- Années au prochain anniversaire et années écoulées (si l’année est connue ; « âge » pour un anniversaire).
- Jours écoulés (option « compter les jours écoulés ») : depuis la dernière occurrence, ou depuis une date unique.
- Jours avant le demi-anniversaire (option), six mois après la date.
- Prochaine date, écrite dans la langue de l’intégration.

Les valeurs changent à minuit dans le fuseau horaire de Gladys. Quand vous changez les options d’une date, son appareil reçoit de nouvelles fonctionnalités : cliquez sur **Mettre à jour** dans l’onglet Découverte.

### Widgets du tableau de bord

- **Prochaines dates** : les prochaines dates (1 à 8), avec les années atteintes, le jour et un badge (vert le jour J, orange dans la période de rappel). Réglages : combien, dans combien de jours, quels types. Touchez une date pour ses détails.
- **Compte à rebours** : une date parmi les appareils ajoutés : jours restants, années, jours écoulés, date d’origine, demi-anniversaire, noces et rappel.
- **Dates du mois** : toutes les dates du mois en cours (ou du mois suivant), jours passés compris, dans l’ordre des jours ; 8 au maximum, la légende indique combien il y en a. Réglages : quel mois, quels types.

**Prochaines dates** et **Dates du mois** ont un bouton **Ajouter une date** : un petit formulaire avec le nom, la date (le jour d’abord : 24/12/1995, ou 24/12 sans l’année), le type et la répétition. Le rappel propre et les options se règlent ensuite avec « Modifier une date » dans la configuration. Comme pour le bouton de la configuration, ajoutez ensuite la date depuis l’onglet Découverte pour obtenir son appareil.

### Scènes

Déclencheurs, envoyés une fois par jour à l’heure de la configuration (jamais deux fois pour la même date le même jour ; si Gladys était arrêtée à cette heure, ils arrivent à son retour, le même jour) :

- **Une date est aujourd’hui** : filtres sur la date et les types.
- **Une date est dans N jours** : vous choisissez N (1 à 60), par exemple 7 pour « une semaine avant ».
- **Rappel d’une date** : quand une date atteint son propre rappel (ou celui par défaut).
- **Une date atteint un millier de jours** : tous les 1 000 jours depuis la date, pour les dates dont l’année est connue (10 000 jours de vie, 1 000 jours depuis l’emménagement). Variables : nom, type, nombre de jours, date d’origine, phrase de résumé.

Les trois premiers ont un filtre **Années rondes** : laissé vide, toutes les années ; « Années rondes seulement », les dizaines, 25, 75 et les autres multiples de 25, et 18 ans pour un anniversaire.

Variables : nom, type, années atteintes, noces (pour un anniversaire de mariage, vide sinon), date d’origine, jour, jours restants et une phrase de résumé toute prête (« Marie : dans 7 jours, jeudi 24 décembre 2026 (31 ans) », « Claire & Alex : aujourd’hui (20 ans, noces de porcelaine) »).

Action **Obtenir les prochaines dates** : dans les N jours (0 pour aujourd’hui seulement), éventuellement pour certains types ; renvoie le nombre, un résumé (une ligne par date) et la date la plus proche.

Exemples :

- Quand un anniversaire est aujourd’hui → envoyer « {{triggerEvent.data.summary}} » à la famille et mettre la lumière du salon en couleur festive.
- Quand une date est dans 7 jours, type anniversaire de mariage → vous envoyer un message pour réserver le restaurant.
- Quand un anniversaire de mariage est dans 30 jours, années rondes seulement → vous envoyer « Bientôt les {{triggerEvent.data.wedding}} ! » pour préparer une fête.
- Chaque lundi à 8 h → obtenir les prochaines dates sur 7 jours → envoyer le résumé par message.

### Transport

Local : l’intégration n’appelle aucun service en ligne, rien ne quitte votre Gladys. Son badge dans le catalogue indique « local ».

## Dépannage

- **Une date est décalée d’un jour** : vérifiez le fuseau horaire de Gladys (Paramètres > Système) ; « Lister les dates » affiche le jour et le fuseau utilisés par l’intégration.
- **Une scène n’a pas démarré** : les événements arrivent à l’heure de la configuration, pas à minuit. Une date ajoutée après cette heure envoie tout de suite ses événements du jour ; une date n’envoie jamais deux fois le même événement le même jour.
- **Une fonctionnalité manque après une modification** : cliquez sur **Mettre à jour** sur l’appareil dans l’onglet Découverte.
- **Autre chose** : ouvrez une issue sur GitHub (https://github.com/William-De71/gladys-anniversaries/issues) avec les versions de Gladys et de l’intégration, le résultat de « Lister les dates » et les journaux de l’intégration (Paramètres > Supervision).
