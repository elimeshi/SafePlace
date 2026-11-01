import { describe, expect, it, vi } from "vitest";
import { setContentFilterEnabled, updateFilterSettings } from "../filter-settings";

function fakeSupabase() {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  return { client: { from: vi.fn().mockReturnValue({ update }) } as never, update };
}

describe("filter settings writes", () => {
  it("setContentFilterEnabled writes max_sex_level, never the generated boolean", async () => {
    const { client, update } = fakeSupabase();
    await setContentFilterEnabled(client, "u", true);
    expect(update).toHaveBeenCalledWith({ max_sex_level: 0 });
    await setContentFilterEnabled(client, "u", false);
    expect(update).toHaveBeenCalledWith({ max_sex_level: 1 });
  });
  it("updateFilterSettings expands contentLevels into the four columns", async () => {
    const { client, update } = fakeSupabase();
    await updateFilterSettings(client, "u", { contentLevels: { sex: 1, violence: 2, religion: 0, addictions: 1 }, hideWomenAccounts: false });
    expect(update).toHaveBeenCalledWith({ max_sex_level: 1, max_violence_level: 2, max_religion_level: 0, max_addictions_level: 1, hide_women_accounts: false });
  });
});
