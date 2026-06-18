# Dream Machine — Layer 3: the ownable house-style model (FLUX LoRA)

*The endgame for "unmistakably ours at scale." Layer 1 put our render register into live generation; Layer 2 conditions photos on a brand image at request time; **Layer 3 trains a model that only knows our look**, so every render is on-brand by default.*

This is a **real training run**, not a code flag — it needs the Replicate token, costs ~$2, and takes ~2 minutes. The repo ships the whole pipeline; you run one script and set one env var.

---

## The pipeline

```
brand assets ──▶ scripts/dream-lora-dataset.mjs ──▶ dream-lora-dataset.zip
                                                          │
                                                          ▼
                        scripts/dream-lora-train.mjs ──▶ a trained model on Replicate
                                                          │  (owner/bkg-herbarium-studies:VERSION)
                                                          ▼
                        DREAM_LORA_STUDY env  ──▶  live generation renders in the house style
```

## 1 · Build the dataset (token-free)

Pairs each curated brand image with a caption that opens with a **trigger word** (`BKGHERB`) so the model learns the herbarium look under that token.

```bash
node scripts/dream-lora-dataset.mjs                  # dry run — list the set
node scripts/dream-lora-dataset.mjs --go --style=study   # line-and-wash studies (recommended first LoRA)
node scripts/dream-lora-dataset.mjs --go --style=all     # studies + filmic photos
```

- Output: `dream-lora-dataset/` (images + `.txt` captions) zipped to `dream-lora-dataset.zip` (gitignored).
- Today ~8 studies / ~15 all resolve from the bucket. **A LoRA likes 12–20+** — grow it:
  ```bash
  node scripts/dream-lora-dataset.mjs --go --style=study --extra ./my-frames
  ```
  Drop your own frames in `./my-frames` and they're auto-captioned with the trigger. **This is the killer move: drop your locked-`--sref` Midjourney exports in there and train a FLUX LoRA on the Midjourney look — an ownable model that reproduces it without Midjourney.**

## 2 · Train (founder-run — token + ~$2)

```bash
export REPLICATE_API_TOKEN=...      # this script does NOT read .env
node scripts/dream-lora-train.mjs --input dream-lora-dataset.zip \
     --destination <owner>/bkg-herbarium-studies          # DRY RUN — prints the exact request
node scripts/dream-lora-train.mjs --input dream-lora-dataset.zip \
     --destination <owner>/bkg-herbarium-studies --go      # actually train (~2 min)
```

Uses `ostris/flux-dev-lora-trainer` (input_images + trigger_word + steps → a runnable destination model). On success it prints `<owner>/bkg-herbarium-studies:<version>`.

## 3 · Wire it into the app (one env var + redeploy)

Set in Vercel and redeploy:

```
DREAM_LORA_STUDY=<owner>/bkg-herbarium-studies:<version>   # studies render through the trained model
DREAM_LORA_TRIGGER=BKGHERB                                  # prepended to prompts to activate it
# optional, once you train a filmic finetune the same way:
DREAM_LORA_PHOTO=<owner>/bkg-herbarium-photo:<version>
```

That's it — no code change. `src/lib/ai-render.ts` already cascades:

| Style | Order it tries (first that succeeds wins) |
|---|---|
| **Study** | trained LoRA (L3) → flux-dev line-and-wash (L1) |
| **Photo** | trained finetune (L3) → style-anchor ultra (L2) → flux-1.1-pro (L1) |

So Layer 3 **leads** when configured and **falls back** to L2/L1 on any error — generation is never worse than the text-only baseline, and removing the env vars instantly reverts.

## 4 · Tune + verify (on prod)

After wiring, POST a couple of renders against the live endpoint and eyeball:

```bash
curl -s -X POST https://builders.theknowledgegardens.com/api/v1/render \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"a modern farmhouse great-room section","style":"study","mode":"single"}'
```

- If the look is too literal (reproducing a training image), lower `steps` (e.g. 800) and retrain, or grow/diversify the dataset.
- If it's too weak, raise `steps` (e.g. 1200–1500) or add more on-style images.

## Notes & guardrails

- **Two styles, two LoRAs.** Start with the **study** LoRA — that's the line-and-wash look Layer 2 can't lock. A filmic-photo finetune is optional (Layer 2's `image_prompt` already locks photos well).
- **Reversible.** It's all env-gated; unset `DREAM_LORA_*` to fall back to L2/L1.
- **Cost.** Training ~$2 each; inference per-render cost is similar to base FLUX. The public spend guard (separate launch-sprint item) still governs volume.
- **Brand lock holds.** Captions and the register keep "no pure white / no red"; keep that in any captions you add.
