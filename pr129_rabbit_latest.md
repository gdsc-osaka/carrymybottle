<!-- This is an auto-generated comment: summarize by coderabbit.ai -->
<!-- review_stack_entry_start -->

[![Review Change Stack](https://storage.googleapis.com/coderabbit_public_assets/review-stack-in-coderabbit-ui.svg)](https://app.coderabbit.ai/change-stack/gdsc-osaka/carrymybottle/pull/129?utm_source=github_walkthrough&utm_medium=github&utm_campaign=change_stack)

<!-- review_stack_entry_end -->
<!-- walkthrough_start -->

<details>
<summary>📝 Walkthrough</summary>

## Walkthrough

This PR introduces an interactive campus map feature. A server-side page component fetches station data for a selected campus, instantiates a new MapCanvas component with zoom/pan support via react-zoom-pan-pinch, and renders clickable station pins that maintain consistent size during map interactions.

## Changes

**Interactive Campus Map Feature**

| Layer / File(s) | Summary |
|---|---|
| **Station data queries and campus assets** <br> `apps/features/map/queries.ts`, `apps/lib/constants/campuses.ts` | `getStationsByCampus` query fetches public stations for a campus with related campus/building data and temperatures; campus map image paths updated from `/images/maps/...` to `/maps/...`. |
| **Interactive map component with zoom/pan** <br> `apps/package.json`, `apps/features/map/MapCanvas.tsx` | New `MapCanvas` component renders zoomable/pannable map with `StationWithRelations` pins; `MapPins` uses `useTransformContext` to apply inverse scaling so pin icons remain constant size during zoom; adds `react-zoom-pan-pinch` dependency. |
| **Server page data fetching and map page integration** <br> `apps/app/map/page.tsx`, `apps/features/map/MapPage.tsx` | Async page component parses campus from `searchParams`, validates against `CAMPUSES`, fetches stations via `getStationsByCampus`, and passes to `MapPage`; `MapPage` and `MapContent` now accept and wire `stations` prop to `MapCanvas` with `mapImagePath` and click handler. |

## Estimated code review effort

🎯 3 (Moderate) | ⏱️ ~20 minutes

## Possibly related issues

- gdsc-osaka/carrymybottle#6: Implements the core Map feature including MapPage, MapCanvas, station queries, map assets, and react-zoom-pan-pinch integration as described in the issue's feature list.

## Possibly related PRs

- [gdsc-osaka/carrymybottle#116](https://github.com/gdsc-osaka/carrymybottle/pull/116): Both PRs refactor the `/map` page and `MapPage` component from placeholder renders to data-driven components that fetch and pass `stations` to the map UI.
- [gdsc-osaka/carrymybottle#95](https://github.com/gdsc-osaka/carrymybottle/pull/95): This PR's `getStationsByCampus` query depends on the `campuses` table schema (e.g., `map_image_path` field) likely introduced in that PR.

## Suggested reviewers

- Nagomu0128
- itakosu55

## Poem

> 🗺️ A map now zooms and pans with grace,  
> Each station pin stays in its place,  
> React's transform keeps proportions right,  
> While campus views come into sight.  
> Interactive maps, a pixel's delight! 🐰✨

</details>

<!-- walkthrough_end -->
<!-- pre_merge_checks_walkthrough_start -->

<details>
<summary>🚥 Pre-merge checks | ✅ 2 | ❌ 3</summary>

### ❌ Failed checks (2 warnings, 1 inconclusive)

|         Check name         | Status         | Explanation                                                                                                                                                                                                                                                                                                                                                                                         | Resolution                                                                                                                                                                                            |
| :------------------------: | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     Linked Issues check    | ⚠️ Warning     | The PR implements pinch-zoom and pan support via react-zoom-pan-pinch in MapCanvas with TransformWrapper/TransformComponent, supporting both touch and mouse operations as required by `#39`. However, a critical security issue was identified: getStationsByCampus does not filter by isPublic, exposing non-public stations on the public /map page, which requires fixing in `#128` before this PR. | Ensure `#128` is rebased with the isPublic filter fix (stations.isPublic === true condition using drizzle-orm's and()) before merging this PR, then rebase this branch to incorporate the security fix. |
|     Docstring Coverage     | ⚠️ Warning     | Docstring coverage is 0.00% which is insufficient. The required threshold is 80.00%.                                                                                                                                                                                                                                                                                                                | Write docstrings for the functions missing them to satisfy the coverage threshold.                                                                                                                    |
| Out of Scope Changes check | ❓ Inconclusive | All code changes directly support pinch-zoom/pan implementation: MapCanvas with TransformWrapper, station queries, updated map constants, and react-zoom-pan-pinch dependency. However, the security filtering issue in getStationsByCampus (exposed in `#128`) affects data visibility scope and should have been addressed in the dependency PR.                                                    | Once `#128` receives the isPublic filter security fix, rebase this PR to confirm all station-fetching logic properly restricts public access without exposing administrative data.                      |

<details>
<summary>✅ Passed checks (2 passed)</summary>

|     Check name    | Status   | Explanation                                                                                                                                                                                        |
| :---------------: | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Description Check | ✅ Passed | Check skipped - CodeRabbit’s high-level summary is enabled.                                                                                                                                        |
|    Title check    | ✅ Passed | The PR title clearly describes the main change: introducing pinch-zoom and pan functionality using react-zoom-pan-pinch, which directly aligns with the primary objective in the linked issue `#39`. |

</details>

<sub>✏️ Tip: You can configure your own custom pre-merge checks in the settings.</sub>

</details>

<!-- pre_merge_checks_walkthrough_end -->
<!-- finishing_touch_checkbox_start -->

<details>
<summary>✨ Finishing Touches</summary>

<details>
<summary>📝 Generate docstrings</summary>

- [ ] <!-- {"checkboxId": "7962f53c-55bc-4827-bfbf-6a18da830691"} --> Create stacked PR
- [ ] <!-- {"checkboxId": "3e1879ae-f29b-4d0d-8e06-d12b7ba33d98"} --> Commit on current branch

</details>
<details>
<summary>🧪 Generate unit tests (beta)</summary>

- [ ] <!-- {"checkboxId": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "radioGroupId": "utg-output-choice-group-unknown_comment_id"} -->   Create PR with unit tests
- [ ] <!-- {"checkboxId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "radioGroupId": "utg-output-choice-group-unknown_comment_id"} -->   Commit unit tests in branch `feature/map-zoom-pan`

</details>

</details>

<!-- finishing_touch_checkbox_end -->
<!-- tips_start -->

---

Thanks for using [CodeRabbit](https://coderabbit.ai?utm_source=oss&utm_medium=github&utm_campaign=gdsc-osaka/carrymybottle&utm_content=129)! It's free for OSS, and your support helps us grow. If you like it, consider giving us a shout-out.

<details>
<summary>❤️ Share</summary>

- [X](https://twitter.com/intent/tweet?text=I%20just%20used%20%40coderabbitai%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20the%20proprietary%20code.%20Check%20it%20out%3A&url=https%3A//coderabbit.ai)
- [Mastodon](https://mastodon.social/share?text=I%20just%20used%20%40coderabbitai%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20the%20proprietary%20code.%20Check%20it%20out%3A%20https%3A%2F%2Fcoderabbit.ai)
- [Reddit](https://www.reddit.com/submit?title=Great%20tool%20for%20code%20review%20-%20CodeRabbit&text=I%20just%20used%20CodeRabbit%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20proprietary%20code.%20Check%20it%20out%3A%20https%3A//coderabbit.ai)
- [LinkedIn](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fcoderabbit.ai&mini=true&title=Great%20tool%20for%20code%20review%20-%20CodeRabbit&summary=I%20just%20used%20CodeRabbit%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20proprietary%20code)

</details>


<sub>Comment `@coderabbitai help` to get the list of available commands and usage tips.</sub>

<!-- tips_end -->
<!-- internal state start -->


<!-- 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 -->

<!-- internal state end -->