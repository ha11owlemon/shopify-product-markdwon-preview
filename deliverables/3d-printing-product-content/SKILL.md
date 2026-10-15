---
name: 3d-printing-product-content
description: Generate evidence-backed bilingual product content for 3D-printing accessories. Use when a user provides product images, a brief product description, or a follow-up question and needs product identification, compatibility assessment, three English listing-title and five-bullet variants, Chinese translations, SEO meta titles, source links, and deterministic format validation.
---

# 3D Printing Product Content

Create reliable product-content drafts for 3D-printing accessories. Do not operate websites, edit product pages, submit forms, publish listings, or assign storefront fields.

## Required capabilities

- Use a vision-capable model when images are supplied.
- Enable a web-search Skill or MCP tool before making compatibility, brand, model, material, part-number, or product-function claims.
- Read [references/output-schema.md](references/output-schema.md) before producing the final result.

## Workflow

1. Classify the request.
   - Treat it as a follow-up only when it clearly refers to a prior result. Answer from prior context and fresh web evidence; cite the sources used.
   - Otherwise treat it as a new-product request.

2. Build a product hypothesis.
   - Use the supplied description and up to 10 images.
   - Extract visible text, logos, dimensions, connector shapes, mounting points, and distinguishing features.
   - For text-only input, do not invent visual details.

3. Research and verify.
   - Search using the product hypothesis plus visible part numbers, brand names, and likely machine series.
   - Prefer manufacturer documentation, official product pages, manuals, and reputable specialist retailers.
   - State compatibility only when the evidence directly supports it. Mark unresolved identification or compatibility as `uncertain`; never turn a plausible inference into a fact.
   - Preserve source URLs and a concise statement of what each source proves.

4. Produce content.
   - Return the exact JSON shape in the reference file.
   - Generate three distinct English listing-title variants, each 110–128 characters including spaces, plus faithful Chinese translations.
   - Generate five English and five Chinese bullets for each variant. Every bullet must use `Short title: content` with an ASCII colon followed by exactly one space. Do not use a Chinese colon.
   - Keep SEO meta titles separate from listing titles. Aim for 50–60 English characters; this is a recommendation, not a listing-title requirement.
   - Avoid unsupported superlatives, safety claims, certifications, or model compatibility.

5. Validate and repair.
   - Save the JSON result and run `python scripts/validate_product_content.py --input <result.json>`.
   - Repair only failed fields, then run the validator again. Try at most three repair rounds.
   - Return the validator report with the final JSON. If an error remains, label the result `needs_revision`; never claim it passed.

## Output rules

- Include source links for factual claims; use an empty compatibility list rather than guessing.
- Keep evidence separate from marketing wording so a reviewer can trace every important claim.
- If web search is unavailable, create a draft but set `research_status` to `insufficient_evidence` and leave unverified compatibility out of the content.
