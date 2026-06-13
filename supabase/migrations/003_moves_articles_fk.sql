-- Fix: /api/wms/moves uses an embedded join `articles(lngdsc)` which PostgREST
-- can only resolve when a FK relationship exists between slotting_moves and articles.
-- 001 declared slotting_moves.prtnum as plain text; add the missing FK.

ALTER TABLE slotting_moves
  ADD CONSTRAINT slotting_moves_prtnum_fkey
  FOREIGN KEY (prtnum) REFERENCES articles(prtnum);

-- Ask PostgREST to refresh its schema cache so the relationship is picked up.
NOTIFY pgrst, 'reload schema';
