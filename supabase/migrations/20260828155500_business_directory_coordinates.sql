alter table public.businesses
  add column if not exists directory_latitude double precision,
  add column if not exists directory_longitude double precision;

alter table public.businesses
  drop constraint if exists businesses_directory_latitude_check,
  add constraint businesses_directory_latitude_check check (
    directory_latitude is null or directory_latitude between -90 and 90
  ),
  drop constraint if exists businesses_directory_longitude_check,
  add constraint businesses_directory_longitude_check check (
    directory_longitude is null or directory_longitude between -180 and 180
  ),
  drop constraint if exists businesses_directory_coordinates_pair_check,
  add constraint businesses_directory_coordinates_pair_check check (
    (directory_latitude is null and directory_longitude is null)
    or (directory_latitude is not null and directory_longitude is not null)
  );

grant update (directory_latitude, directory_longitude) on public.businesses to authenticated;

comment on column public.businesses.directory_latitude is
  'Optional latitude used for distance and map features in the Bonoa directory.';
comment on column public.businesses.directory_longitude is
  'Optional longitude used for distance and map features in the Bonoa directory.';
