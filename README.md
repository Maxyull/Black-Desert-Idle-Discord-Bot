# Velia Idle — Bot Discord

Bot pour le serveur Discord de Velia Idle : annonces de nouvelle version, classement,
nombre de joueurs en ligne, liaison de compte Discord ↔ compte du jeu, signalement de bug.

## Fonctionnalités

- **Annonces automatiques** — poste les notes de version FR et EN (chacune dans son propre salon) à chaque nouvelle version déployée (détectée en surveillant `index.html`).
- **`/classement [categorie]`** — top 10 silver ou gearscore.
- **`/joueurs-en-ligne`** — nombre de joueurs actuellement connectés (invités inclus).
- **`/lier <code>`** — lie le compte Discord au compte Velia Idle via un code généré dans le panneau "Mon compte" du jeu.
- **`/bug <description>`** — poste un signalement de bug dans un salon dédié.
- **`/suggestion <texte>`** — crée un post dans un **salon Forum** dédié, avec vote par réaction (👍/👎) et des boutons "✅ Accepter"/"❌ Refuser" réservés au staff (permission Discord "Gérer le serveur") qui appliquent automatiquement le tag correspondant (🗳️ En attente / ✅ Accepté / ❌ Refusé, créés automatiquement si absents).
- **Relais de traduction** — tout message posté dans le salon FR configuré est automatiquement retranscrit en anglais dans le salon EN configuré.
- **Statut du bot** — affiche en continu "X joueur(s) en ligne".

## 1. Créer l'application Discord

1. Va sur https://discord.com/developers/applications → **New Application**.
2. Onglet **Bot** → **Reset Token** → copie le token (`DISCORD_TOKEN`).
3. Toujours dans **Bot**, décoche "Public Bot" si tu veux garder le contrôle de qui l'ajoute.
4. Toujours dans **Bot**, active **"Message Content Intent"** (nécessaire pour le relais de traduction — sans ça le bot reçoit des messages vides).
5. Onglet **General Information** → copie l'**Application ID** (`DISCORD_CLIENT_ID`).
6. Onglet **OAuth2 > URL Generator** → coche `bot` + `applications.commands`, permissions minimales (Send Messages, Send Messages in Threads, Create Public Threads, Embed Links, Add Reactions, Manage Threads, **Manage Channels** — nécessaire pour créer les tags du forum) → ouvre l'URL générée pour ajouter le bot à ton serveur.
7. En mode développeur Discord (Paramètres > Avancés > Mode développeur), clic droit sur ton serveur → "Copier l'identifiant" (`DISCORD_GUILD_ID`, optionnel mais recommandé pour un déploiement instantané des commandes).
8. Crée (ou réutilise) un salon **bugs** classique (`DISCORD_BUG_CHANNEL_ID`) et un salon **suggestions** de type **Forum** (`DISCORD_SUGGESTIONS_CHANNEL_ID` — le bot crée lui-même les 3 tags "🗳️ En attente"/"✅ Accepté"/"❌ Refusé" au premier `/suggestion` s'ils n'existent pas encore). Les salons pour les annonces de version (FR/EN) et le relais de traduction (FR/EN) sont déjà connus et pré-remplis dans `.env.example`.

## 2. Récupérer la clé Supabase

Dashboard Supabase > Project Settings > API > **service_role key** (⚠️ secrète, jamais dans le navigateur/index.html — contrairement à la clé "anon" du jeu, celle-ci contourne toutes les règles RLS).

## 3. Exécuter le schéma SQL

Exécute `../supabase-discord-bot-schema.sql` dans l'éditeur SQL Supabase (après les schémas précédents).

## 4. Configurer les variables d'environnement

Copie `.env.example` en `.env` (en local) et remplis toutes les valeurs — ou configure les mêmes variables dans le panneau de ton hébergeur (voir section Pella ci-dessous).

## 5. Installer et lancer

```bash
npm install
npm run deploy-commands   # à refaire seulement quand tu ajoutes/modifies une commande
npm start
```

## Déploiement sur Pella (pella.app)

1. Crée un nouveau service **Node.js / Discord Bot** sur Pella.
2. Uploade ce dossier `discord-bot/` (ou connecte le repo GitHub et pointe Pella sur ce sous-dossier).
3. Dans les paramètres du service, vérifie que :
   - la **commande de démarrage** est `npm start` (ou `node index.js`) ;
   - la **commande d'installation** est `npm install`.
4. Onglet **Variables/Environment** de Pella : ajoute toutes les variables listées dans `.env.example` (ne mets jamais le vrai `.env` dans le repo — il est déjà ignoré par `.gitignore`).
5. Lance le service une première fois, puis exécute `npm run deploy-commands` (Pella propose généralement une console/terminal pour lancer une commande ponctuelle) pour enregistrer les commandes slash.
6. Démarre/redémarre le bot — il doit apparaître en ligne sur ton serveur Discord.

Les spécificités exactes du panneau Pella peuvent varier légèrement ; si un champ ne correspond pas à ce qui est décrit ici, cherche l'équivalent le plus proche (commande de démarrage, variables d'environnement, logs).

## Notes

- Le bot ne stocke jamais de mot de passe ni de silver côté client — toutes les écritures sensibles passent par la clé `service_role`, qui ne doit exister que dans les variables d'environnement du bot.
- `checkForNewVersion` retient la dernière version annoncée dans la table `bot_state` (Supabase) plutôt qu'un fichier local, pour survivre aux redémarrages/redéploiements du bot.
