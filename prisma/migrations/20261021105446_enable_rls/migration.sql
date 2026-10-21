-- Włączenie Row Level Security na wszystkich tabelach.
-- Tabele schematu public są udostępniane przez REST API Supabase; RLS bez polityk
-- blokuje ten dostęp. Aplikacja łączy się przez Prisma jako właściciel bazy
-- (rola postgres), a autoryzacja realizowana jest w Server Actions.
ALTER TABLE "Company"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockLevel"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryCount"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryCountItem" ENABLE ROW LEVEL SECURITY;
-- _prisma_migrations nie istnieje w bazie shadow – warunkowe włączenie RLS
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
