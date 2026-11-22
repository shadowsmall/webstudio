# 🎹 WebStudio

**Un studio de création musicale qui tourne entièrement dans le navigateur, inspiré de FL Studio.**
Beats, mélodies, arrangement, mixage, effets, automation, MIDI et export WAV, sans rien installer.

> 📘 **Documentation complète** : ouvrez [`documentation`](https://shadowsmall.github.io/webstudio-doc/) (ou menu **AIDE › Documentation complète** dans l'application).                                 

> site disponnible sans telechargement : https://shadowsmall.github.io/webstudio/

---

## Sommaire

- [Aperçu](#aperçu)
- [Démarrage rapide](#démarrage-rapide)
- [Où sont enregistrées mes données ?](#où-sont-enregistrées-mes-données-)
- [Fonctionnalités](#fonctionnalités)
- [Raccourcis clavier](#raccourcis-clavier)
- [Clics droits](#clics-droits-façon-fl-studio)
- [Navigateurs compatibles](#navigateurs-compatibles)
- [Dépannage](#dépannage)
- [Structure du projet](#structure-du-projet)
- [Pour les développeurs](#pour-les-développeurs)
- [Limites connues](#limites-connues)
- [Mentions](#mentions)

---

## Aperçu

| Fenêtre | Rôle | Touche |
|---|---|---|
| **Playlist** | Arrangement du morceau : on y place les patterns sur 32 pistes et 160 mesures | `F5` |
| **Channel Rack** | Les instruments (canaux) et le séquenceur pas à pas | `F6` |
| **Piano roll** | Écriture des notes, accords, gammes, vélocités | `F7` |
| **Navigateur** | Panneau de gauche : sons, outils, thèmes | `F8` |
| **Mixer** | Master + 12 inserts, 10 emplacements d'effets par insert, envois | `F9` |
| **Automation** | Courbes de volume, pan, filtre, paramètres d'effets | `F10` |
| **Réglages du canal** | Synthèse, enveloppe, filtre, arpégiateur | clic sur le nom d'un canal |

L'interface reprend les codes de FL Studio : barre du haut avec écran LCD (tempo, position), modes **PAT / SONG**, fenêtres flottantes avec boutons **▼ / – / □ / ×**, menus clic droit presque partout.

---

## Démarrage rapide

1. Ouvrez **`index.html`** avec **Microsoft Edge** ou **Google Chrome** (double-clic, ou glisser le fichier dans le navigateur).
2. Au premier lancement, la fenêtre **« Bienvenue dans WebStudio »** s'affiche :
   - cliquez sur **📁 Choisir le dossier (Documents)** ;
   - sélectionnez **Documents**, puis **Sélectionner un dossier** ;
   - acceptez l'autorisation de modification.
3. Cliquez une fois n'importe où dans la page (le navigateur n'active le son qu'après un clic), puis appuyez sur **Espace** pour écouter le projet de démo.
4. Dans le **Channel Rack**, cliquez sur les pas pour créer un rythme. Ouvrez le **Piano roll** (`F7`) pour écrire une mélodie.
5. Passez en mode **SONG** (`L`) et placez vos patterns dans la **Playlist**.
6. Exportez avec **Fichier › Exporter en WAV…** (`Ctrl+R`).

> 💡 Survolez n'importe quel élément : une aide s'affiche dans la barre du haut.

---

## Où sont enregistrées mes données ?

Les données ne sont **pas** stockées dans le code de l'application : elles vont dans un dossier séparé sur votre PC.

```
Documents\WebStudio\
  ├─ projet-en-cours.json   ← sauvegarde automatique à chaque modification
  ├─ samples.json           ← les sons importés (micro, fichiers audio)
  ├─ reglages.json   ← thème, date de création, dernier lancement
  ├─ Projets\        ← vos projets enregistrés (Fichier › Enregistrer… / Ctrl+S)
  └─ LISEZ-MOI.txt
```

- **Sauvegarde automatique** : chaque modification est écrite dans `projet-en-cours.json` moins d'une seconde après.
- **Au lancement suivant**, le navigateur redemande l'accès au dossier (règle de sécurité, impossible à contourner). Une fenêtre **« Bon retour »** s'affiche : cliquez sur **▶ Reprendre mon travail**.
- **Indicateur 💾** en haut à droite : `WebStudio ✓` (enregistré), `enregistrement…`, `erreur !` ou `Navigateur seulement`. Cliquez dessus pour : enregistrer maintenant, ouvrir un projet, changer de dossier, déconnecter le dossier, revoir le message d'accueil.
- **Changer de PC / sauvegarder** : copiez simplement le dossier `Documents\WebStudio`. Sur l'autre PC, choisissez ce dossier au lancement et votre travail revient.
- **Sans dossier** (bouton *Plus tard*, ou Firefox) : les données restent dans la mémoire du navigateur (`localStorage`). Elles peuvent être perdues si vous videz les données de navigation.

---

## Fonctionnalités

### 🥁 Channel Rack et séquenceur
- Séquenceur pas à pas, patterns de **1 à 4 mesures**, **swing** réglable.
- **23 instruments** intégrés, tous synthétisés (aucun fichier audio requis) :
  - *Batterie* : Kick, Snare, Clap, Hi-hat, Open hat, Tom, Cowbell, Crash, Rimshot, Shaker, Conga
  - *Synthés* : Synth Bass, Synth Lead, Synth Pad, Synth Pluck, FM Synth, Super Saw, Orgue, 808 Bass, Guitare pluck, Piano électrique, Cordes
  - *Sampler* : vos propres sons (glisser-déposer de fichiers audio ou enregistrement micro)
- **6 moteurs de synthèse** : soustractive (2 oscillateurs), FM, Super saw, additive (orgue), 808, corde pincée.
- **Arpégiateur** : montant, descendant, aller-retour, aléatoire, accord répété ; vitesse 1/32 à 1/4, 1 à 4 octaves, gate.

### 🎼 Piano roll
- Notes de **C1 à C7**, longueur 1/16 à 1 mesure, vélocité par note.
- **Accords en un clic** : majeur, mineur, 7, maj7, min7, sus4, quinte.
- **Gammes** avec surlignage : majeur, mineur, mineur harmonique, dorien, phrygien, mixolydien, pentatoniques, blues.
- **Outils** : générer une mélodie / un rythme 🎲, legato, rétrograde, miroir, ralentir ×2 / accélérer ÷2, accrocher à la gamme, octave ±1, humaniser, supprimer les doublons, copier / coller.

### 🎚️ Mixer
- **Master + 12 inserts**, volume, pan, mute, solo, vumètres, oscilloscope.
- **10 emplacements d'effets** par insert et **2 envois (sends)** vers un insert de numéro supérieur.
- **27 effets** : Distorsion, Filtre, EQ 3 bandes, EQ paramétrique 7 bandes, Delay, Delay ping-pong, Reverb, Reverb Hall, Chorus, Phaser, Flanger, Compresseur, Maximus (multibande), Limiteur, Soft Clipper, Bitcrusher, Lo-Fi, Largeur stéréo, Trémolo, Auto-pan, Auto-wah, Ring Modulator, Trance Gate, Sidechain / Pump, Exciteur, Bass Boost, Utilitaire.
- **9 chaînes d'effets prêtes à l'emploi** : Mastering doux, Master fort (club), Master transparent, Lo-fi / chill, Voix, Batterie punchy, Sidechain EDM, Ambiance, Trance gate.

### 🎞️ Playlist et automation
- **32 pistes**, **160 mesures**, couleurs et noms de pistes, mute / solo.
- **Clips d'automation** (joués en mode SONG) sur : volume, pan, hauteur, cutoff, résonance des canaux ; volume et pan des inserts ; tous les paramètres d'effets.
- Création directe : **clic droit sur un bouton ou un fader › Créer un clip d'automation**.

### 🎛️ MIDI, enregistrement, import / export
| Action | Où |
|---|---|
| Jouer avec un **clavier MIDI** | Options › Activer un clavier MIDI |
| **Enregistrer le micro** → nouveau canal Sampler | bouton 🎙 |
| **Enregistrer la sortie audio** (fichier .webm / .ogg) | bouton ⏺ |
| **Exporter en WAV** (pattern ou morceau) | `Ctrl+R` |
| **Exporter les pistes séparées** (un WAV par insert) | Fichier |
| **Exporter / importer en MIDI** | `Ctrl+M` / Fichier, ou glisser un `.mid` |
| **Importer un projet FL Studio (.flp)** | Fichier › Importer un projet FL Studio |

### 🎨 Personnalisation
5 thèmes (Orange, Bleu, Vert, Violet, Clair), tap tempo, métronome, réorganisation automatique des fenêtres.

---

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| `Espace` | Lecture / stop |
| `L` | Mode Pattern / Song |
| `F5` `F6` `F7` `F8` `F9` `F10` | Playlist, Channel Rack, Piano roll, Navigateur, Mixer, Automation |
| `Ctrl+Z` / `Ctrl+Y` | Annuler / rétablir (100 niveaux) |
| `Ctrl+S` | Enregistrer (dans `Documents\WebStudio\Projets` si le dossier est connecté) |
| `Ctrl+O` | Ouvrir un projet |
| `Ctrl+R` | Exporter en WAV |
| `Ctrl+M` | Exporter en MIDI |
| `F4` | Premier pattern vide (en crée un s'il n'y en a pas) |
| `Pavé +` / `Pavé −` | Pattern suivant / précédent |
| `F2` | Renommer le canal sélectionné |
| `Alt+C` | Cloner le canal |
| `Alt+Suppr` | Supprimer le canal |
| `Alt+↑` / `Alt+↓` | Monter / descendre le canal |
| `Ctrl+L` | Lier le canal sélectionné à l'insert sélectionné du mixer |
| `←` / `→` | Octave du clavier de l'ordinateur |
| Touches lettres | Jouer des notes (rangée du bas à partir de `W`, rangée du haut à partir de `A`, AZERTY géré) |

---

## Clics droits (façon FL Studio)

| Zone | Contenu du menu |
|---|---|
| **Nom d'un canal** | Piano roll, fenêtre du canal, renommer, couleur, insérer, remplacer, cloner, supprimer, couper / copier / coller les pas, remplir chaque 2 / 4 / 8 pas, décaler, piste du mixer, mute, solo, monter / descendre |
| **Pas du séquenceur** | Efface le pas (glisser pour en effacer plusieurs) · `Maj` + clic droit : note douce |
| **Bouton rotatif / fader** | Modifier les événements, initialiser le morceau avec cette position, créer un clip d'automation, saisir une valeur, réinitialiser, min / max, copier / coller la valeur |
| **Tranche du mixer** | Renommer, couleur, lier le canal (`Ctrl+L`), canaux routés, chaînes d'effets, ajouter un effet, copier / coller / effacer la chaîne, mute, volume, pan, fichier (enregistrer / ouvrir l'état), réinitialiser |
| **Slot d'effet** | Sélectionner un effet, monter / descendre, copier, coller, supprimer |
| **En-tête de piste** | Renommer, couleur, nom auto, insérer / supprimer une piste, monter / descendre, mute, solo, vider |
| **Clip de la playlist** | Supprime le clip (glisser pour en supprimer plusieurs) |
| **Sélecteur de pattern** | Liste, premier vide, nouveau, cloner, renommer, diviser par canal, vider, supprimer |
| **Barre de titre d'une fenêtre** | Options de la fenêtre, réduire, agrandir, fermer, réorganiser |

---

## Navigateurs compatibles

| Navigateur | Son, édition | Dossier `Documents\WebStudio` | Clavier MIDI |
|---|---|---|---|
| **Microsoft Edge** (recommandé) | ✅ | ✅ | ✅ |
| **Google Chrome** | ✅ | ✅ | ✅ |
| Firefox | ✅ | ❌ (données dans le navigateur) | ❌ |
| Safari | non testé | ❌ | ❌ |

---

## Dépannage

| Problème | Solution |
|---|---|
| **Pas de son** | Cliquez une fois dans la page : le navigateur bloque le son tant qu'il n'y a pas eu de clic. Vérifiez le volume Master. |
| **Les changements n'apparaissent pas** après une mise à jour | `Ctrl+F5` pour vider le cache. |
| **« Navigateur seulement »** dans l'indicateur 💾 | Cliquez dessus › *Choisir un dossier sur le PC…* |
| **Le dossier n'est plus reconnu** | Cliquez sur 💾 › *Changer de dossier…* et choisissez `Documents\WebStudio` : le projet est repris. |
| **Le micro ne marche pas** | Autorisez le micro dans la barre d'adresse. Si la page est ouverte en `file://`, essayez via un petit serveur local (voir plus bas). |
| **Le clavier MIDI n'est pas détecté** | Utilisez Edge ou Chrome, branchez le clavier, puis *Options › Activer un clavier MIDI*. |
| **Import .flp incomplet** | Normal : seuls le tempo, les canaux, les patterns, les notes et la playlist sont importés (voir [Limites](#limites-connues)). |

---

## Structure du projet

```
webstudio/
├─ index.html          Application (interface + moteur audio de base)
├─ documentation.html  Documentation complète
├─ README.md           Ce fichier
├─ css/
│  ├─ extra.css        Styles complémentaires
│  └─ fl.css           Thème façon FL Studio
└─ js/   Modules, chargés dans cet ordre :
   ├─ ui.js     Utilitaires d'interface partagés
   ├─ instruments.js   11 instruments, 6 moteurs de synthèse, arpégiateur (réglages)
   ├─ effects.js       7 effets + envois du mixer
   ├─ sequencer.js     Séquenceur étendu (arpégiateur, automation)
   ├─ automation.js    Clips d'automation + fenêtre Automation
   ├─ midi-rec.js      Clavier MIDI, enregistrement micro et sortie
   ├─ export.js        Export pistes séparées, export / import MIDI
   ├─ flp.js           Import des projets FL Studio (.flp)
   ├─ mixer-plus.js    13 effets, chaînes d'effets, menus clic droit
   ├─ fl-ui.js         Interface et clics droits façon FL, raccourcis
   ├─ tools.js         Gammes, outils du piano roll, thèmes, menus
   └─ storage.js       Accueil + enregistrement dans Documents\WebStudio
```

---

## Pour les développeurs

- **Aucune dépendance, aucune compilation** : HTML, CSS et JavaScript « vanilla » + Web Audio API.
- **État global** : tout le projet est dans l'objet `S` (canaux, patterns, clips, inserts, automations, gamme, tempo…). Les sons importés sont dans `SAMPLES` (data URL).
- **Cycle de mise à jour** : modifier `S` → `rebuild()` (graphe audio) si besoin → `render…()` (interface) → `commit()` (historique d'annulation + sauvegarde).
- **Extension par surcharge** : chaque module remplace des fonctions globales en gardant l'ancienne version :
  ```js
  const _old = renderMixer;
  renderMixer = function () { _old(); /* ajouts du module */ };
  ```
- **Ajouter un effet** : ajouter une entrée dans `FX` (`name`, `def`, `params`, fonction de construction) : il apparaît automatiquement dans le mixer, les menus et l'automation.
- **Cache** : les fichiers sont chargés avec `?v=7`. Augmentez ce numéro dans `index.html` après une modification.
- **Serveur local (optionnel)** : depuis le dossier `webstudio`, `python -m http.server 8000` puis ouvrir `http://localhost:8000`. Attention : en changeant d'adresse (`file://` → `http://`), le navigateur considère que c'est un autre site. Il faudra rechoisir le dossier `Documents\WebStudio`, et votre projet sera repris.

### Format d'un projet (`.json`)
Fichier JSON contenant `bpm`, `channels`, `patterns`, `clips`, `tracks`, `inserts`, `autos`, `scale`, etc. Les projets enregistrés dans `Projets\` incluent aussi les sons (`samples`). Un projet peut être ouvert dans n'importe quelle installation de WebStudio.

---

## Limites connues

- **Import .flp** : tempo, canaux (type deviné d'après le nom), patterns, notes et playlist. Non importés : plugins tiers et leurs réglages, audio des samples, automation, effets du mixer.
- **Autorisation du dossier** redemandée à chaque lancement (sécurité du navigateur).
- **Firefox / Safari** : pas d'écriture dans un dossier du PC ni de MIDI.
- **Gros samples** : sans dossier connecté, la mémoire du navigateur peut être trop petite. Connectez le dossier `Documents\WebStudio`.
- Pas de plugins VST, pas de clips audio dans la playlist (les sons passent par des canaux Sampler).

---

## Mentions

WebStudio est un projet indépendant, **inspiré** de l'ergonomie de FL Studio. Il n'est ni affilié à Image-Line ni approuvé par cette société. « FL Studio » est une marque d'Image-Line Software.
