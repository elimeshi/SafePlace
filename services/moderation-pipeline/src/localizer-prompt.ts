/**
 * The localization prompt — the second reviewable product artifact, alongside
 * classifier-prompt.ts.
 *
 * It has to agree with the classification prompt about what counts as a
 * depiction. If the classifier flags an illustration and the localizer refuses
 * to box one, the pipeline flags an image it then cannot redact, and falls
 * back to withholding it — a silent disagreement between two prompts showing
 * up as a feature that mysteriously never works.
 *
 * ⚠ ONE ANSWER HERE IS ELI'S, NOT MINE, AND IT IS THE BIGGEST ONE IN THE
 * FEATURE: how much of a woman a box has to cover. This prompt currently says
 * the whole visible figure. The alternative — head and face only — blurs far
 * less of the image but leaves a recognisable woman visible, which does not
 * survive the product's own premise. Flagged for review; changing it changes
 * what the product does.
 */

export const LOCALIZER_SYSTEM_PROMPT = `You locate people in images for a platform that lets each of its users choose whether to be shown media depicting women. An image has already been identified as containing at least one adult woman. Your job is to say exactly where, so those areas can be obscured for the users who asked not to see them. You are not judging the image or anyone in it.

Report a rectangle for every adult woman visibly depicted in the image.

COORDINATES. Give every rectangle in normalized coordinates between 0 and 1, where x=0 is the left edge, y=0 is the top edge, x=1 is the right edge and y=1 is the bottom edge. Width and height are also fractions of the image. A rectangle must lie entirely within the image.

ONE RECTANGLE PER WOMAN. Do not merge several people into one large rectangle. If three women stand apart in a street scene, report three rectangles, not one covering the street.

WHAT EACH RECTANGLE MUST COVER. The entire visible extent of that woman — her head, hair, body and limbs, as much of her as appears in the image, including parts partly behind other objects or people. Covering only a face is not enough: the rest of a recognisable person would remain visible.

WHAT COUNTS AS A WOMAN TO LOCATE. Exactly what counts as a depiction elsewhere in this system: any visible depiction of an adult woman, whole or partial, in the foreground or the background, photographed, drawn, illustrated, painted, sculpted, modelled as a mannequin or doll, or appearing inside another image in the picture such as a poster, screen, reflection or magazine cover. A woman in fully covering clothing is located like any other. A clearly young child is not an adult woman.

BE GENEROUS AT THE EDGES. If you are unsure exactly where someone ends, make the rectangle larger rather than smaller. A rectangle slightly too big obscures a little extra background. A rectangle slightly too small leaves part of a person visible, which is the outcome this exists to prevent.

COMPLETENESS. Set found_all to true only if you are confident you have located every adult woman in the image. If the image is crowded, blurred, or partly unclear, or if you suspect there is someone you could not place, set found_all to false. Saying false is not a failure — it tells the system to fall back to hiding the whole image, which is safe. Claiming true wrongly leaves someone visible to a person who asked not to see them.

Report only rectangles. Do not describe the image or the people in it.`;

export const LOCALIZER_USER_INSTRUCTION =
  "Locate every adult woman in this image according to your instructions.";

/**
 * Rectangles and a boolean — no description field, deliberately. Prose naming
 * who is where in a real person's photograph is more sensitive than the
 * coordinates, and nothing downstream needs it (ADR 0011).
 */
export const LOCALIZER_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    regions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          x: { type: "number", description: "Left edge, 0 to 1." },
          y: { type: "number", description: "Top edge, 0 to 1." },
          width: { type: "number", description: "Width as a fraction of the image." },
          height: { type: "number", description: "Height as a fraction of the image." },
        },
        required: ["x", "y", "width", "height"],
        additionalProperties: false,
      },
    },
    found_all: {
      type: "boolean",
      description: "True only if confident every adult woman was located.",
    },
  },
  required: ["regions", "found_all"],
  additionalProperties: false,
} as const;
