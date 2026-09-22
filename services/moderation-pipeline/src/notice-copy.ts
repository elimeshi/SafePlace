/**
 * The uploader-facing copy now lives in @safeplace/shared-types, because the
 * mobile app renders it and must not depend on this service — importing a
 * server package into the client would pull a vision-model SDK into the app
 * bundle.
 *
 * Re-exported here so this documented path keeps working and there is still
 * exactly one definition of each string. Do not redeclare them below.
 */
export {
  PENDING_REVIEW_NOTICE_HE,
  PROCESSING_NOTICE_HE,
  WOMEN_DETECTED_NOTICE_HE,
} from "@safeplace/shared-types";
