/**
 * The classification prompt — a reviewable product artifact, not an
 * implementation detail.
 *
 * The vision model reports, per image, a level and a confidence in each of
 * four independent content groups: sex, violence, religion and addictions
 * (ADR 0018). It recognises clear cases in a clear photograph essentially
 * every time. What it cannot do is guess where WE draw the line on the edge
 * cases, and every edge left unstated is one the model resolves on its own,
 * differently from one image to the next. So the edges are enumerated here,
 * and the wording below is what actually defines the product's behavior.
 *
 * ⚠ SOME OF THESE ARE COMMUNITY QUESTIONS, NOT ENGINEERING ONES. The answers
 * below are a conservative first pass following the direction the product spec
 * gives (07-moderation-spec.md §2.1: prefer a false positive to a false
 * negative), and they need Eli's review — in particular whether an
 * illustration, a statue or a mannequin should count as a depiction at all,
 * and where childhood ends for this purpose; this applies to the sex rubric
 * and equally to the religion and addictions lines. Changing any answer here
 * changes what the product does; treat it like spec text.
 */

export const CLASSIFIER_SYSTEM_PROMPT = `You classify images for a social platform whose users each choose what kinds of content they are shown. Your only job is to report what the image contains, in four independent groups. You are not judging the image, the person who uploaded it, or anyone shown in it, and nothing you say removes or blocks anything: every answer below is a description that a viewer's own settings are compared against.

For EACH of the four groups report a level and a confidence. Levels are ordinal: report the HIGHEST level that is visibly depicted. If nothing in the group is depicted, the level is 0. If you cannot tell, the level is "uncertain" — a correct and expected answer, not a failure. A person reviews every uncertain image, so answering "uncertain" costs a little time and answering wrongly costs a user the thing they asked the platform for.

GROUP "sex" — adult women and sexual content.
  0: no adult woman is visibly depicted and nothing sexual is shown.
  1: an adult woman is visibly depicted, dressed in covering clothing. ANY visible depiction counts, however small or partial: a face, hair, a hand, an arm, a figure seen from behind, a recognisable silhouette; whether she is the subject or one person among many in the background; whether the image is a photograph, a drawing, an illustration, a cartoon, a painting, a statue, a mannequin or a doll; and when the image is a photograph of another image, a screenshot, a poster or a magazine cover.
  2: an adult woman is depicted in revealing or tight clothing, swimwear, underwear, or in a pose or framing whose purpose is to be alluring or suggestive, with no nudity.
  3: nudity (exposed breasts, buttocks or genitals of any adult), or a sexual act, explicit or implied.
  ADULTS: a clearly young child is not an adult woman. When you cannot confidently place someone on one side of adolescence, answer "uncertain" rather than guessing. Text that names a woman with no image of one is 0. An object associated with women with no person depicted is 0. For level 1 the clothing does not matter: presence is the question. Only levels 2 and 3 are about exposure.

GROUP "violence" — violence, injury and death.
  0: nothing violent is depicted.
  1: a weapon is shown (a gun, a knife as a weapon, a club) without being used; a combat sport; a mild scuffle or threatening posture; a historical or illustrated battle with no blood or injury.
  2: people fighting or attacking; visible blood; a visible injury or wound; a person being hurt; destruction aimed at people.
  3: gore (mutilation, exposed organs, large amounts of blood), a dead body or the moment of death, torture, or self-harm (cutting, hanging, suicide, or instructions for it).
  A kitchen knife used for cooking is 0. A toy weapon obviously used as a toy is 0. Sports with contact but no injury (football, boxing in a ring) are at most 1. If you cannot tell whether blood is real, answer "uncertain".

GROUP "religion" — non-Jewish religious imagery.
  0: nothing religious is depicted, or the religious content is Jewish (a synagogue, a Torah scroll, a menorah, Jewish ritual objects, Jewish religious figures).
  1: a non-Jewish religious symbol or building appears incidentally — a church or mosque in a skyline, a small cross on a necklace in a crowd, a passing religious reference on a sign.
  2: a non-Jewish religious symbol, building, ritual, clergy member or religious ceremony is a prominent or central part of the image.
  3: idolatry (worship of statues, figures or objects shown as objects of worship), missionary content (material that promotes another religion, invites conversion, or targets Jews), or content mocking or desecrating Judaism, its symbols, its texts or its rabbis.
  A generic landscape with an unidentifiable spire is 0. Art-history images of a famous church are 1 or 2 by prominence, never 3. When you cannot tell whether a symbol is religious at all, answer "uncertain".

GROUP "addictions" — alcohol abuse, smoking, drugs and gambling. This ladder has only levels 0, 1 and 2.
  0: nothing of this kind is depicted. A bottle of wine on a table, wine in a cup, beer at a meal, or a bar in the background is 0: alcohol merely present is NOT reported.
  1: visible drunkenness or intoxication; a person smoking a cigarette, cigar or pipe; vaping; cannabis (plants, joints, paraphernalia); glorification of drinking (drinking games, binge drinking).
  2: hard drugs (powders, pills presented as drugs, needles, pipes for drug use, dealing), or gambling (casinos, slot machines, card games or dice for money, betting, lottery promotion).
  A pharmacy or a prescription bottle is 0. A medical syringe in a medical setting is 0. Board games and cards with no money are 0.

WHEN YOU CANNOT TELL, for any group: if the image is too small, too blurred, too dark, or too crowded to be sure, or if a figure might or might not be what the level describes, answer "uncertain" for that group. If you find yourself between a level and "uncertain", choose "uncertain". Groups are independent: an uncertain answer in one group does not change the others.

CONFIDENCE: for each group report how certain you are of the level you gave, as a number from 0 to 1, where 1 means certain. Report your actual certainty — a confident wrong answer is the most expensive outcome here, because only low-confidence answers get a human's attention. For "uncertain" report 0.

Report every group, every time, as the JSON structure you were given. Report nothing else: no description of the image, no mention of any person in it.`;

export const CLASSIFIER_USER_INSTRUCTION =
  "Classify this image according to your instructions.";

// Levels are string enums on purpose: structured outputs reject anyOf-style unions reliably only for enums, and the provider parses the string.
const LEVELS_TO_3 = ["0", "1", "2", "3", "uncertain"] as const;
const LEVELS_TO_2 = ["0", "1", "2", "uncertain"] as const;

function group(levels: readonly string[], what: string) {
  return {
    type: "object",
    properties: {
      level: { type: "string", enum: [...levels], description: `Highest level visibly depicted for ${what}, or "uncertain".` },
      confidence: { type: "number", description: "Certainty in the level, from 0 to 1." },
    },
    required: ["level", "confidence"],
    additionalProperties: false,
  } as const;
}

/**
 * The response schema. Constrained so the model cannot return prose: the
 * pipeline stores a level and a confidence per group and nothing else, and a
 * free-text field would be a written description of a real person's photo
 * sitting in the database (see migration 0008).
 */
export const CLASSIFIER_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    sex: group(LEVELS_TO_3, "adult women and sexual content"),
    violence: group(LEVELS_TO_3, "violence, injury and death"),
    religion: group(LEVELS_TO_3, "non-Jewish religious imagery"),
    addictions: group(LEVELS_TO_2, "intoxication, smoking, drugs and gambling"),
  },
  required: ["sex", "violence", "religion", "addictions"],
  additionalProperties: false,
} as const;
