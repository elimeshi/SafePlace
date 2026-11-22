-- ============================================================================
-- Phase 8a enum values. Separate file: an enum value added in a transaction
-- cannot be used until it commits, and 20261122100200_account_enforcement.sql
-- uses both (PGlite applies each migration file in one transaction).
-- ============================================================================
alter type public.media_classification add value if not exists 'removed'; -- a reviewer found it prohibited; hidden from everyone
alter type public.account_status add value if not exists 'banned';        -- permanent ban; content hidden until an appeal overturns it
