-- Índice para acelerar la consulta de dosis por paciente y rango de fechas
-- (usado por fetchDoses con minDate/maxDate)
create index if not exists idx_doses_patient_date on public.doses(patient_id, date);
