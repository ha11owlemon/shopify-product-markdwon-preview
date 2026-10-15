# Output schema

Return valid JSON only after any short validation summary. Keep the keys and array counts below.

```json
{
  "research_status": "verified | partial | insufficient_evidence",
  "product_assessment": {
    "product_name": "Most likely product name, or Unknown",
    "product_type": "replacement_part | upgrade | accessory | unknown",
    "function": "Evidence-backed function",
    "compatibility": [
      {
        "brand": "Brand",
        "models": ["Model"],
        "confidence": "verified | likely | uncertain",
        "reason": "Why this compatibility is supported"
      }
    ],
    "uncertainties": ["What cannot be confirmed"]
  },
  "evidence": [
    {
      "url": "https://...",
      "source_name": "Publisher or page title",
      "supports": "Specific claim supported by this source"
    }
  ],
  "content_versions": [
    {
      "id": "v1",
      "listing_title_en": "110–128 characters including spaces",
      "listing_title_zh": "Chinese translation",
      "seo_meta_title_en": "Separate, ideally 50–60 English characters",
      "seo_meta_title_zh": "Chinese translation",
      "bullets_en": ["Feature: Description", "... five total"],
      "bullets_zh": ["特点: 描述", "... five total"]
    },
    { "id": "v2", "listing_title_en": "...", "listing_title_zh": "...", "seo_meta_title_en": "...", "seo_meta_title_zh": "...", "bullets_en": ["..."], "bullets_zh": ["..."] },
    { "id": "v3", "listing_title_en": "...", "listing_title_zh": "...", "seo_meta_title_en": "...", "seo_meta_title_zh": "...", "bullets_en": ["..."], "bullets_zh": ["..."] }
  ],
  "product_overview": {
    "en": "Short evidence-backed product introduction",
    "zh": "中文产品介绍"
  }
}
```

`listing_title_en` must contain 110–128 Unicode characters (spaces count). Each `bullets_en` and `bullets_zh` array must contain exactly five strings with one ASCII colon and a following space.
