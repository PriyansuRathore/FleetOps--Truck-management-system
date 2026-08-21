create table if not exists users (
  id text primary key,
  name text not null,
  email text unique not null,
  password text not null,
  role text not null
);

create table if not exists metrics (
  id text primary key,
  label text not null,
  value text not null,
  delta text not null
);

create table if not exists vehicles (
  id text primary key,
  number text unique not null,
  model text not null,
  driver text,
  status text not null,
  odometer text not null,
  permit text not null
);

create table if not exists drivers (
  id text primary key,
  name text not null,
  score integer not null,
  hours text not null,
  route text not null,
  salary numeric(12,2) default 0,
  notes text
);

create table if not exists routes (
  id text primary key,
  origin text not null,
  destination text not null,
  distance text not null,
  eta text not null,
  saving text not null,
  status text not null,
  toll_total integer default 0,
  fuel_liters integer default 0,
  fuel_cost integer default 0,
  freight_revenue integer default 0,
  driver_allowance integer default 0,
  other_expense integer default 0
);

create table if not exists loads (
  id text primary key,
  item text not null,
  truck text not null,
  weight text not null,
  margin text not null,
  state text not null
);

create table if not exists trips (
  id text primary key,
  trip_no text not null,
  vehicle text not null,
  driver text,
  origin text not null,
  destination text not null,
  start_date text,
  end_date text,
  load_name text,
  km text,
  freight_price integer default 0,
  fuel_expense integer default 0,
  toll_expense integer default 0,
  driver_allowance integer default 0,
  maintenance_expense integer default 0,
  other_expense integer default 0,
  total_expense integer default 0,
  profit integer default 0,
  notes text,
  status text not null
);

create table if not exists expense_notes (
  id text primary key,
  trip_no text,
  vehicle text,
  note_date text,
  category text not null,
  amount integer default 0,
  note text not null
);

create table if not exists maintenance_notes (
  id text primary key,
  vehicle text,
  note_date text,
  notes text not null,
  total_cost integer default 0
);

create table if not exists trip_loads (
  id text primary key,
  trip_id text not null,
  source text,
  destination text,
  party text,
  description text,
  freight_amount numeric(12,2) default 0,
  loading_date text,
  unloading_date text,
  payment_status text,
  received_amount numeric(12,2) default 0,
  invoice_number text,
  lr_number text,
  pod_status text,
  notes text,
  attachment text
);

create table if not exists trip_expenses (
  id text primary key,
  trip_id text not null,
  description text not null,
  amount numeric(12,2) default 0,
  expense_date text,
  category text,
  paid_by text,
  payment_method text,
  notes text,
  attachment text
);

create table if not exists trip_payments (
  id text primary key,
  trip_id text not null,
  load_id text,
  party text,
  payment_date text,
  amount numeric(12,2) default 0,
  mode text,
  reference_number text,
  notes text
);

create table if not exists trip_notes (
  id text primary key,
  trip_id text not null,
  note_date text,
  note text not null
);

create table if not exists fuel_entries (
  id text primary key,
  trip_id text,
  vehicle text,
  fuel_date text,
  station text,
  litres numeric(10,2) default 0,
  rate_per_litre numeric(10,2) default 0,
  total_amount numeric(12,2) default 0,
  odometer text,
  receipt text,
  notes text
);

create table if not exists maintenance (
  id text primary key,
  vehicle text not null,
  task text not null,
  service_date text not null,
  cost text not null,
  health text not null,
  parts text,
  mechanic text
);

create table if not exists tolls (
  id text primary key,
  route_id text,
  plaza text not null,
  vehicle text not null,
  amount text not null,
  amount_value integer default 0,
  tag text not null
);

create table if not exists tyres (
  id text primary key,
  vehicle text,
  position text not null,
  tyre text not null,
  tread text not null,
  rotation text not null
);

create table if not exists expenses (
  id text primary key,
  type text not null,
  amount text not null,
  period text not null,
  trend text not null
);

create table if not exists finance_bars (
  id text primary key,
  label text not null,
  value integer not null,
  color text not null
);

create table if not exists parts (
  id text primary key,
  vehicle text not null,
  name text not null,
  stock integer not null,
  unit_cost integer not null,
  status text not null
);

create table if not exists truck_reports (
  id text primary key,
  vehicle text not null,
  trips integer not null,
  revenue integer not null,
  expense integer not null,
  profit integer not null,
  utilization integer not null
);

alter table metrics add column if not exists owner_id text;
alter table vehicles add column if not exists owner_id text;
alter table drivers add column if not exists owner_id text;
alter table drivers add column if not exists salary numeric(12,2) default 0;
alter table drivers add column if not exists notes text;
alter table routes add column if not exists owner_id text;
alter table loads add column if not exists owner_id text;
alter table trips add column if not exists owner_id text;
alter table trips add column if not exists notes text;
alter table expense_notes add column if not exists owner_id text;
alter table maintenance_notes add column if not exists owner_id text;
alter table trip_loads add column if not exists owner_id text;
alter table trip_expenses add column if not exists owner_id text;
alter table trip_payments add column if not exists owner_id text;
alter table trip_notes add column if not exists owner_id text;
alter table fuel_entries add column if not exists owner_id text;
alter table maintenance add column if not exists owner_id text;
alter table tolls add column if not exists owner_id text;
alter table tyres add column if not exists owner_id text;
alter table tyres add column if not exists vehicle text;
alter table tyres alter column tyre type text using tyre::text;
alter table maintenance alter column cost type text using cost::text;
alter table expenses add column if not exists owner_id text;
alter table parts add column if not exists owner_id text;
alter table truck_reports add column if not exists owner_id text;

alter table expense_notes alter column trip_no drop not null;
alter table expense_notes alter column vehicle drop not null;

create index if not exists trip_loads_trip_id_idx on trip_loads (trip_id);
create index if not exists trip_expenses_trip_id_idx on trip_expenses (trip_id);
create index if not exists trip_payments_trip_id_idx on trip_payments (trip_id);
create index if not exists trip_notes_trip_id_idx on trip_notes (trip_id);
create index if not exists fuel_entries_trip_id_idx on fuel_entries (trip_id);
create index if not exists fuel_entries_vehicle_idx on fuel_entries (vehicle);

-- These links prevent new orphaned child records. NOT VALID keeps this migration
-- safe for existing installations; run VALIDATE CONSTRAINT after cleaning old data.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'trip_loads_trip_id_fk') then
    alter table trip_loads add constraint trip_loads_trip_id_fk foreign key (trip_id) references trips(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_expenses_trip_id_fk') then
    alter table trip_expenses add constraint trip_expenses_trip_id_fk foreign key (trip_id) references trips(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_payments_trip_id_fk') then
    alter table trip_payments add constraint trip_payments_trip_id_fk foreign key (trip_id) references trips(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_payments_load_id_fk') then
    alter table trip_payments add constraint trip_payments_load_id_fk foreign key (load_id) references trip_loads(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trip_notes_trip_id_fk') then
    alter table trip_notes add constraint trip_notes_trip_id_fk foreign key (trip_id) references trips(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fuel_entries_trip_id_fk') then
    alter table fuel_entries add constraint fuel_entries_trip_id_fk foreign key (trip_id) references trips(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tolls_route_id_fk') then
    alter table tolls add constraint tolls_route_id_fk foreign key (route_id) references routes(id) on delete set null not valid;
  end if;
end $$;

-- Tenant-owned rows must point to a real user. Null is retained only for the
-- bundled public demo records created before multi-user support.
do $$
declare
  table_name text;
  constraint_name text;
begin
  foreach table_name in array array[
    'metrics', 'vehicles', 'drivers', 'routes', 'loads', 'trips',
    'expense_notes', 'maintenance_notes', 'trip_loads', 'trip_expenses',
    'trip_payments', 'trip_notes', 'fuel_entries', 'maintenance', 'tolls',
    'tyres', 'expenses', 'parts', 'truck_reports'
  ] loop
    constraint_name := table_name || '_owner_id_fk';
    if not exists (select 1 from pg_constraint where conname = constraint_name) then
      execute format(
        'alter table %I add constraint %I foreign key (owner_id) references users(id) on delete cascade not valid',
        table_name,
        constraint_name
      );
    end if;
  end loop;
end $$;

insert into users (id, name, email, password, role)
values ('user-1', 'Admin Manager', 'admin@fleetops.com', '$2b$10$N2gEpRFf4cCTzPYxad7puObIqo0YZGPsVDqBdC8ZmaB0TJQkl22rG', 'Owner')
on conflict (email) do nothing;

insert into metrics (id, label, value, delta) values
('metric-1', 'Active trucks', '74', '+8 this month'),
('metric-2', 'On-time trips', '96.4%', '+4.2% improved'),
('metric-3', 'Monthly profit', 'Rs.18.7L', 'Rs.2.3L saved'),
('metric-4', 'Fleet alerts', '11', '5 critical')
on conflict (id) do nothing;

insert into routes (id, origin, destination, distance, eta, saving, status, toll_total, fuel_liters, fuel_cost, freight_revenue, driver_allowance, other_expense) values
('route-1', 'Delhi', 'Mumbai', '1,418 km', '26h 20m', 'Rs.18,400 fuel/toll saved', 'Optimized', 7420, 405, 38880, 128000, 6200, 9400),
('route-2', 'Jaipur', 'Ahmedabad', '678 km', '12h 05m', 'Avoids NH48 congestion', 'Live', 3860, 194, 18624, 68000, 3400, 4200),
('route-3', 'Pune', 'Bengaluru', '842 km', '15h 45m', '2 rest stops planned', 'Planned', 5120, 241, 23136, 79000, 4100, 5600)
on conflict (id) do nothing;

insert into loads (id, item, truck, weight, margin, state) values
('LD-4812', 'FMCG pallets', 'RJ 14 GT 2291', '18.2 T', '28%', 'In transit'),
('LD-4831', 'Auto components', 'MH 12 QR 7314', '12.6 T', '34%', 'Loading'),
('LD-4864', 'Cold chain cartons', 'HR 55 AX 1808', '9.8 T', '22%', 'Assigned')
on conflict (id) do nothing;

insert into trips (id, trip_no, vehicle, driver, origin, destination, start_date, end_date, load_name, km, freight_price, fuel_expense, toll_expense, driver_allowance, maintenance_expense, other_expense, total_expense, profit, status) values
('trip-1', 'TRP-1001', 'RJ 14 GT 2291', 'Ramesh Yadav', 'Delhi', 'Mumbai', '2026-07-01', '2026-07-03', 'FMCG pallets', '1,418 km', 128000, 38880, 7420, 6200, 18500, 9400, 80400, 47600, 'Completed'),
('trip-2', 'TRP-1002', 'RJ 14 GT 2291', 'Ramesh Yadav', 'Mumbai', 'Delhi', '2026-07-08', '2026-07-10', 'Return load', '1,418 km', 118000, 40200, 7100, 6200, 0, 8800, 62300, 55700, 'Completed'),
('trip-3', 'TRP-1003', 'MH 12 QR 7314', 'Iqbal Khan', 'Jaipur', 'Ahmedabad', '2026-07-11', '2026-07-12', 'Auto components', '678 km', 68000, 18624, 3860, 3400, 9200, 4200, 39284, 28716, 'Completed'),
('trip-4', 'TRP-1004', 'HR 55 AX 1808', 'Suresh Patel', 'Pune', 'Bengaluru', '2026-07-15', '2026-07-16', 'Cold chain cartons', '842 km', 79000, 23136, 5120, 4100, 12800, 5600, 50756, 28244, 'In transit')
on conflict (id) do nothing;

insert into expense_notes (id, trip_no, vehicle, note_date, category, amount, note) values
('note-1', 'TRP-1001', 'RJ 14 GT 2291', '2026-07-02', 'Diesel', 4200, 'Extra diesel filled near Udaipur'),
('note-2', 'TRP-1001', 'RJ 14 GT 2291', '2026-07-02', 'Loading', 900, 'Helper charge at warehouse'),
('note-3', 'TRP-1003', 'MH 12 QR 7314', '2026-07-11', 'Parking', 350, 'Night parking near Ahmedabad')
on conflict (id) do nothing;

insert into drivers (id, name, score, hours, route) values
('driver-1', 'Ramesh Yadav', 98, '6h 40m', 'Delhi - Mumbai'),
('driver-2', 'Iqbal Khan', 94, '5h 10m', 'Jaipur - Ahmedabad'),
('driver-3', 'Suresh Patel', 91, '7h 15m', 'Pune - Bengaluru')
on conflict (id) do nothing;

insert into vehicles (id, number, model, driver, status, odometer, permit) values
('vehicle-1', 'RJ 14 GT 2291', 'Tata Signa 5530', 'Ramesh Yadav', 'In transit', '2,84,120 km', 'Valid'),
('vehicle-2', 'MH 12 QR 7314', 'BharatBenz 4228R', 'Iqbal Khan', 'Loading', '1,92,450 km', 'Valid'),
('vehicle-3', 'HR 55 AX 1808', 'Ashok Leyland AVTR', 'Suresh Patel', 'Assigned', '3,08,720 km', 'Renewal due')
on conflict (id) do nothing;

insert into maintenance (id, vehicle, task, service_date, cost, health, parts, mechanic) values
('maint-1', 'RJ 14 GT 2291', 'Brake liner replacement', '02 Aug', 'Rs.18,500', 'Good', 'Brake liner, drum polish', 'Sharma Workshop'),
('maint-2', 'MH 12 QR 7314', 'Engine oil service', '05 Aug', 'Rs.9,200', 'Due soon', 'Engine oil, oil filter, diesel filter', 'Highway Motors'),
('maint-3', 'HR 55 AX 1808', 'Reefer unit check', '09 Aug', 'Rs.12,800', 'Scheduled', 'Reefer belt, coolant top-up', 'ColdLine Service')
on conflict (id) do nothing;

insert into tolls (id, route_id, plaza, vehicle, amount, amount_value, tag) values
('toll-1', 'route-1', 'Kishangarh', 'RJ 14 GT 2291', 'Rs.1,120', 1120, 'FASTag synced'),
('toll-2', 'route-1', 'Vadodara', 'RJ 14 GT 2291', 'Rs.1,860', 1860, 'Reconciled'),
('toll-3', 'route-1', 'Bharuch', 'RJ 14 GT 2291', 'Rs.1,440', 1440, 'FASTag synced'),
('toll-4', 'route-2', 'Udaipur', 'MH 12 QR 7314', 'Rs.860', 860, 'Reconciled'),
('toll-5', 'route-2', 'Himmatnagar', 'MH 12 QR 7314', 'Rs.740', 740, 'Pending bill'),
('toll-6', 'route-3', 'Tumakuru', 'HR 55 AX 1808', 'Rs.940', 940, 'FASTag synced')
on conflict (id) do nothing;

insert into tyres (id, position, tyre, tread, rotation) values
('tyre-1', 'Front Left', 'TY-7294', '82%', '3,200 km left'),
('tyre-2', 'Rear Right', 'TY-7311', '64%', 'Rotate now'),
('tyre-3', 'Spare', 'TY-7088', '91%', 'Healthy')
on conflict (id) do nothing;

insert into expenses (id, type, amount, period, trend) values
('expense-1', 'Fuel', 'Rs.21.8L', 'July', '+3%'),
('expense-2', 'Tolls', 'Rs.4.7L', 'July', '-1%'),
('expense-3', 'Maintenance', 'Rs.7.2L', 'July', '+5%')
on conflict (id) do nothing;

insert into finance_bars (id, label, value, color) values
('finance-1', 'Freight', 88, '#0f9f8f'),
('finance-2', 'Fuel', 46, '#d97706'),
('finance-3', 'Toll', 24, '#2563eb'),
('finance-4', 'Maintenance', 31, '#7c3aed'),
('finance-5', 'Profit', 68, '#16a34a')
on conflict (id) do nothing;

insert into parts (id, vehicle, name, stock, unit_cost, status) values
('part-1', 'RJ 14 GT 2291', 'Brake liner set', 4, 8500, 'Available'),
('part-2', 'MH 12 QR 7314', 'Oil filter', 12, 650, 'Available'),
('part-3', 'HR 55 AX 1808', 'Reefer belt', 2, 3200, 'Low stock'),
('part-4', 'GJ 01 KM 9090', 'Clutch plate', 1, 14800, 'Order soon')
on conflict (id) do nothing;

insert into truck_reports (id, vehicle, trips, revenue, expense, profit, utilization) values
('report-1', 'RJ 14 GT 2291', 18, 1280000, 734000, 546000, 92),
('report-2', 'MH 12 QR 7314', 14, 940000, 571000, 369000, 84),
('report-3', 'HR 55 AX 1808', 11, 790000, 498000, 292000, 77),
('report-4', 'GJ 01 KM 9090', 9, 620000, 461000, 159000, 69)
on conflict (id) do nothing;
