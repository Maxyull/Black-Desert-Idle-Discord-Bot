# Velia Idle — Bot Discord

Bot pour le serveur Discord de Velia Idle : annonces de nouvelle version, classement,
nombre de joueurs en ligne, liaison de compte Discord ↔ compte du jeu, signalement de bug.

## Fonctionnalités

- **Annonces automatiques** — poste les notes de version FR et EN (chacune dans son propre salon) à chaque nouvelle version déployée (détectée en surveillant `index.html`).
- **`/classement [categorie]`** — top 10 silver ou gearscore.
- **`/joueurs-en-ligne`** — nombre de joueurs actuellement connectés (invités inclus).
- **`/bug <description>`** — poste un signalement de bug dans un salon dédié.
- **`/suggestion <texte>`** — crée un post dans un **salon Forum** dédié, avec vote par réaction (👍/👎) et des boutons "✅ Accepter"/"❌ Refuser" réservés au staff (permission Discord "Gérer le serveur") qui appliquent automatiquement le tag correspondant (🗳️ En attente / ✅ Accepté / ❌ Refusé, créés automatiquement si absents).
- **Relais de traduction** — tout message posté dans le salon FR configuré est automatiquement retranscrit en anglais dans le salon EN configuré, avec 🇬🇧 et un lien direct vers le message d'origine.
- **Réaction auto sur les suggestions des forums communautaires** — quand un joueur crée directement un post (sans `/suggestion`) dans l'un des forums bug+suggestion (FR ou EN) et lui applique un tag dont le nom contient "Suggestion", le bot réagit automatiquement avec 👍 👎 🤷.
- **Statut du bot** — affiche en continu "X joueur(s) en ligne".
- **`POST /join-guild`** — endpoint interne appelé par le jeu juste après une connexion "Se connecter avec Discord" : ajoute automatiquement le joueur au serveur Discord via son token OAuth (scope `guilds.join`).

## 1. Créer l'application Discord

1. Va sur https://discord.com/developers/applications → **New Application**.
2. Onglet **Bot** → **Reset Token** → copie le token (`DISCORD_TOKEN`).
3. Toujours dans **Bot**, décoche "Public Bot" si tu veux garder le contrôle de qui l'ajoute.
4. Toujours dans **Bot**, active **"Message Content Intent"** (nécessaire pour le relais de traduction — sans ça le bot reçoit des messages vides).
5. Onglet **General Information** → copie l'**Application ID** (`DISCORD_CLIENT_ID`).
6. Onglet **OAuth2 > URL Generator** → coche `bot` + `applications.commands`, permissions minimales (Send Messages, Send Messages in Threads, Create Public Threads, Embed Links, Add Reactions, Manage Threads, **Manage Channels** — tags du forum, **Create Invite** — requis par Discord pour `PUT /guilds/{id}/members/{id}`, l'ajout auto au serveur) → ouvre l'URL générée pour ajouter le bot à ton serveur.
7. En mode développeur Discord (Paramètres > Avancés > Mode développeur), clic droit sur ton serveur → "Copier l'identifiant" (`DISCORD_GUILD_ID`, optionnel mais recommandé pour un déploiement instantané des commandes).
8. Crée (ou réutilise) un salon **bugs** classique (`DISCORD_BUG_CHANNEL_ID`) et un salon **suggestions** de type **Forum** (`DISCORD_SUGGESTIONS_CHANNEL_ID` — le bot crée lui-même les 3 tags "🗳️ En attente"/"✅ Accepté"/"❌ Refusé" au premier `/suggestion` s'ils n'existent pas encore). Les salons pour les annonces de version (FR/EN) et le relais de traduction (FR/EN) sont déjà connus et pré-remplis dans `.env.example`.
9. Pour les **forums communautaires combinés bug+suggestion** (`DISCORD_COMMUNITY_FORUM_FR_ID`/`DISCORD_COMMUNITY_FORUM_EN_ID`, déjà pré-remplis) : dans les paramètres de chaque salon Forum, crée un tag dont le nom contient le mot **"Suggestion"** (ex: "💡 Suggestion") — c'est ce nom que le bot recherche pour savoir sur quels posts réagir automatiquement. Le nom exact du tag "Bug" n'a pas d'importance, le bot l'ignore.

## 2. Récupérer la clé Supabase

Dashboard Supabase > Project Settings > API > **service_role key** (⚠️ secrète, jamais dans le navigateur/index.html — contrairement à la clé "anon" du jeu, celle-ci contourne toutes les règles RLS).

## 3. Exécuter le schéma SQL

Exécute `supabase-schema.sql` dans l'éditeur SQL Supabase (après les schémas du jeu — voir le repo `black-desert-idle`).

## 4. Configurer les variables d'environnement

Copie `.env.example` en `.env` (en local) et remplis toutes les valeurs — ou configure les mêmes variables dans le panneau de ton hébergeur (voir section Render ci-dessous).

## 5. Installer, enregistrer les commandes, et lancer en local

```bash
npm install
npm run deploy-commands   # à refaire seulement quand tu ajoutes/modifies une commande
npm start
```

## Déploiement sur Render (render.com)

Ce repo inclut un `render.yaml` (Blueprint) qui configure tout automatiquement.

1. Sur https://dashboard.render.com → **New > Blueprint** → connecte ce repo GitHub (`Black-Desert-Idle-Discord-Bot`).
2. Render détecte `render.yaml` et crée un service **Web Service** (plan gratuit) nommé `velia-idle-discord-bot`, build `npm install`, démarrage `npm start`.
3. Render te demande de remplir les variables marquées `sync: false` (secrets : `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DISCORD_BUG_CHANNEL_ID`, `DISCORD_SUGGESTIONS_CHANNEL_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) — les autres (IDs de salons FR/EN déjà connus, `GAME_URL`) sont déjà pré-remplies dans le blueprint.
4. Déploie. Une fois le service "Live", **enregistre les commandes slash depuis ton PC en local** (pas besoin d'un shell sur Render) :
   ```bash
   npm run deploy-commands
   ```
   avec un fichier `.env` local contenant au minimum `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` et `DISCORD_GUILD_ID`.
5. Le bot doit apparaître en ligne sur ton serveur Discord.

**⚠️ Limite du plan gratuit Render** : un "Web Service" gratuit se met en veille après ~15 min sans requête HTTP entrante (le bot lui-même reste connecté à Discord tant qu'il tourne, mais Render peut arrêter le service faute de trafic web). Ce repo inclut un petit serveur HTTP de "santé" (`lib/keepAlive.js`) pour satisfaire l'exigence de Render, mais ça ne l'empêche pas de se mettre en veille par inactivité. Pour un bot vraiment 24/7 sans coupure :
- configure un ping externe gratuit (ex: [UptimeRobot](https://uptimerobot.com)) toutes les 5-10 min sur l'URL publique du service Render, ou
- passe sur un plan payant Render (pas de mise en veille).

## Connexion Discord + ajout auto au serveur (côté jeu)

Le jeu (repo `black-desert-idle`) propose "🎮 Se connecter avec Discord" (connexion) et
"🎮 Connecter Discord" (liaison d'un compte email existant, panneau "Mon compte"). Pour
que ça fonctionne, en plus de ce bot :

1. **Discord Developer Portal** → ta même application → onglet **OAuth2** → section
   **Redirects** → ajoute : `https://<ton-projet>.supabase.co/auth/v1/callback`
   (remplace `<ton-projet>` par l'ID de ton projet Supabase, visible dans l'URL de ton
   dashboard ou dans `SUPABASE_URL`).
2. Toujours dans **OAuth2**, note le **Client Secret** (bouton "Reset Secret" si tu ne
   l'as pas encore généré).
3. **Supabase Dashboard** → Authentication → Providers → **Discord** → active-le, colle le
   **Client ID** (Application ID) et le **Client Secret** de l'étape 2.
4. **Supabase Dashboard** → Authentication → Settings → active **"Allow manual linking"**
   (nécessaire pour que "Connecter Discord" fonctionne sur un compte email déjà existant,
   sans ça seule la connexion directe via Discord marche).
5. Exécute `supabase-pseudo-schema.sql` (vit dans le repo du jeu, `black-desert-idle`) dans
   le même projet Supabase.
6. Dans `index.html` (repo du jeu), remplace `BOT_API_URL` par l'URL publique de ce
   service Render, et `BOT_API_SECRET` par une valeur aléatoire de ton choix.
7. Sur Render (ou en local), configure `INTERNAL_API_SECRET` avec **exactement la même
   valeur** que `BOT_API_SECRET` côté jeu.

⚠️ `BOT_API_SECRET` n'est **pas un vrai secret** puisqu'il vit dans un fichier public sur
GitHub Pages — ce n'est qu'un filtre anti-spam basique sur l'endpoint `/join-guild`. La
vraie sécurité vient de Discord : un `access_token` invalide, expiré, ou sans le scope
`guilds.join` est rejeté par l'API Discord elle-même, quelle que soit la valeur du secret.

## Notes

- Le bot ne stocke jamais de mot de passe ni de silver côté client — toutes les écritures sensibles passent par la clé `service_role`, qui ne doit exister que dans les variables d'environnement du bot.
- `checkForNewVersion` retient la dernière version annoncée dans la table `bot_state` (Supabase) plutôt qu'un fichier local, pour survivre aux redémarrages/redéploiements du bot.
