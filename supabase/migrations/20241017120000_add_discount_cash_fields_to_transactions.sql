alter table transactions
  add column if not exists discount_type text,
  add column if not exists discount_value numeric,
  add column if not exists discount_amount numeric,
  add column if not exists cash_tendered numeric,
  add column if not exists change numeric;
