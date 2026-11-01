-- ============================================================================
-- Review reasons for multi-group classification (ADR 0018). Separate file: an
-- enum value added in a transaction cannot be used until it commits, and the
-- next migration uses both.
-- ============================================================================
alter type moderation.review_reason add value if not exists 'ai_prohibited_content'; -- a level-3 answer
alter type moderation.review_reason add value if not exists 'ai_refusal';            -- the model would not describe the image
