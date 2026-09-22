/**
 * Local entry point: drain the queue once against whatever SUPABASE_URL points
 * at, then exit. Deliberately not a loop — the deployed worker is a scheduled
 * stateless handler (ADR 0009), and a dev script that behaved differently
 * would hide bugs that only appear when invocations do not share state.
 *
 * See the README for the environment it expects.
 */
import { runClassificationPass } from "./handler";

async function main(): Promise<void> {
  const summary = await runClassificationPass(process.env);
  console.log(
    JSON.stringify({ service: "moderation-pipeline", event: "pass_complete", ...summary })
  );
}

main().catch((error) => {
  console.error("[moderation-pipeline] fatal:", error);
  process.exit(1);
});
