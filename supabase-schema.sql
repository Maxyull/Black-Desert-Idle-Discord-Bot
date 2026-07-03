-- ============================================================
-- Support du bot Discord — Velia Idle
-- Le bot se connecte avec la clé "service_role" (contourne les RLS), donc les
-- policies ci-dessous ne concernent que les JOUEURS (via le navigateur, clé anon).
-- Supabase > SQL Editor > New query > Run
-- ============================================================

-- ---------- codes de liaison temporaires (générés en jeu, consommés par /lier) ----------
create table if not exists public.link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.link_codes enable row level security;
-- pas de select/insert direct pour les joueurs : uniquement via ensure_link_code() ci-dessous
-- (le bot, lui, passe par la clé service_role et n'est pas concerné par ces policies)

-- ---------- liaison compte Discord <-> compte Velia Idle ----------
create table if not exists public.discord_links (
  discord_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now()
);
alter table public.discord_links enable row level security;
-- chacun peut voir si SON compte est lié (pas les autres)
drop policy if exists "discord_links_select_own" on public.discord_links;
create policy "discord_links_select_own" on public.discord_links
  for select using (auth.uid() = user_id);

-- ---------- petite table clé/valeur pour l'état du bot (ex: dernière version annoncée) ----------
create table if not exists public.bot_state (
  key text primary key,
  value text not null
);
alter table public.bot_state enable row level security;
-- aucune policy : ni lecture ni écriture pour les joueurs, seul le bot (service_role) y touche

-- ---------- génère un code de liaison à usage unique (valable 10 min) ----------
-- Appelée depuis le panneau "Mon compte" du jeu. Réservée aux comptes vérifiés.
create or replace function public.ensure_link_code()
returns text
language plpgsql security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, true) then
    raise exception 'Compte invité non autorisé — lie un compte vérifié';
  end if;

  -- un seul code actif à la fois par joueur : on remplace l'ancien s'il existe
  delete from public.link_codes where user_id = v_uid;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.link_codes (code, user_id, expires_at)
  values (v_code, v_uid, now() + interval '10 minutes');

  return v_code;
end;
$$;

grant execute on function public.ensure_link_code() to authenticated;
