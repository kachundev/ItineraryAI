-- Community MVP closed loop: publish (is_public) -> Explore -> like / save -> comment.
--
-- Likes contract (single source of truth):
--   Clients insert or delete public.itinerary_likes.
--   Trigger on_like_change calls public.update_likes_count(), which is the only
--   writer of public.itineraries.likes.
--   increment_likes(uuid) and decrement_likes(uuid) used to update itineraries.likes
--   directly (security definer, executable by anon). That second path double-counted
--   when a client also inserted a like row. Both functions are dropped.
--   Do not add a counter RPC back. Do not update itineraries.likes from the client.
--
-- Visibility contract:
--   A community interaction is allowed when the caller owns the itinerary or the
--   itinerary is public (is_public = true). Private itineraries do not leak
--   comments or likes to anyone else. Saves stay readable only by the saver.
--
-- Table name: public.itinerary_comments. This migration does not create or rename
-- a "comments" table. Frontend queries must use itinerary_comments.
--
-- Publish: the owner updates itineraries.is_public. No separate publish RPC.
-- QA may insert one or two public itinerary rows later. This file seeds nothing.

do $$
begin
  if to_regclass('public.itinerary_comments') is null then
    raise exception
      'expected public.itinerary_comments (the live table). This migration does not rename comments.';
  end if;

  if to_regclass('public.itineraries') is null
     or to_regclass('public.itinerary_likes') is null
     or to_regclass('public.itinerary_saves') is null then
    raise exception
      'expected public.itineraries, public.itinerary_likes, and public.itinerary_saves';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'update_likes_count'
  ) then
    raise exception
      'expected public.update_likes_count(), the trigger writer for itineraries.likes';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'anon')
     or not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise exception
      'expected Supabase roles anon and authenticated';
  end if;
end $$;

-- Remove the direct counter RPCs. Insert/delete on itinerary_likes is the only API.
drop function if exists public.increment_likes(uuid);
drop function if exists public.decrement_likes(uuid);

comment on function public.update_likes_count() is
  'Only writer of itineraries.likes. Fired by trigger on_like_change after insert or delete on itinerary_likes. Clients must not update the likes column and must not call a counter RPC.';

comment on column public.itineraries.likes is
  'Cached like count. Maintained only by trigger on_like_change / update_likes_count().';

-- Comments: read and write only when the itinerary is public or owned.
-- Delete-own policy is unchanged.
drop policy if exists "Anyone can read comments" on public.itinerary_comments;
drop policy if exists "Users can read comments on visible itineraries" on public.itinerary_comments;
create policy "Users can read comments on visible itineraries"
  on public.itinerary_comments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.itineraries as i
      where i.id = itinerary_comments.itinerary_id
        and (
          i.is_public = true
          or i.user_id = (select auth.uid())
        )
    )
  );

drop policy if exists "Users can insert own comments" on public.itinerary_comments;
drop policy if exists "Users can insert own comments on visible itineraries" on public.itinerary_comments;
create policy "Users can insert own comments on visible itineraries"
  on public.itinerary_comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.itineraries as i
      where i.id = itinerary_comments.itinerary_id
        and (
          i.is_public = true
          or i.user_id = (select auth.uid())
        )
    )
  );

-- Likes: same visibility rule for select and insert. Delete-own policy is unchanged.
drop policy if exists "Users can view all likes." on public.itinerary_likes;
drop policy if exists "Users can view likes on visible itineraries." on public.itinerary_likes;
create policy "Users can view likes on visible itineraries."
  on public.itinerary_likes
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.itineraries as i
      where i.id = itinerary_likes.itinerary_id
        and (
          i.is_public = true
          or i.user_id = (select auth.uid())
        )
    )
  );

drop policy if exists "Users can insert their own likes." on public.itinerary_likes;
drop policy if exists "Users can insert likes on visible itineraries." on public.itinerary_likes;
create policy "Users can insert likes on visible itineraries."
  on public.itinerary_likes
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.itineraries as i
      where i.id = itinerary_likes.itinerary_id
        and (
          i.is_public = true
          or i.user_id = (select auth.uid())
        )
    )
  );

-- Saves: select-own and delete-own policies stay. Insert requires a visible itinerary.
drop policy if exists "Users can insert own saves" on public.itinerary_saves;
drop policy if exists "Users can insert own saves on visible itineraries" on public.itinerary_saves;
create policy "Users can insert own saves on visible itineraries"
  on public.itinerary_saves
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.itineraries as i
      where i.id = itinerary_saves.itinerary_id
        and (
          i.is_public = true
          or i.user_id = (select auth.uid())
        )
    )
  );

-- Explore lists public itineraries newest first.
create index if not exists itineraries_public_created_at_idx
  on public.itineraries (created_at desc)
  where is_public = true;

comment on index public.itineraries_public_created_at_idx is
  'Explore: public itineraries ordered by created_at descending.';

notify pgrst, 'reload schema';
