-- Home Comfort NY: start fresh before the study.
-- 1. Deletes the check-ins and reminder phones left behind by participants who were removed on the
--    dashboard (test data). Check-ins of anyone still in the participant list are not touched.
-- 2. Sets the numbering so the next person to join gets the lowest free code: NY001 when nobody is left.
delete from public.comfort_votes v where not exists (select 1 from public.participants p where p.code = v.participant);
delete from public.push_subscriptions s where not exists (select 1 from public.participants p where p.code = s.participant);
select setval('public.participant_seq', coalesce((select max(substring(code from 3)::int) from public.participants), 0) + 1, false);
select (select count(*) from public.participants) as participants_left,
       (select count(*) from public.comfort_votes) as check_ins_left,
       'NY' || lpad(((select last_value from public.participant_seq))::text, 3, '0') as next_code;
