# PR #11473 icon comparison — 2026-10-18

Compared the current PARA workspace with the exact head of Bluesky social-app
[PR #11473](https://github.com/bluesky-social/social-app/pull/11473),
`f7ec49408a36eaf3f0ee13deb2e569cbe93048bc`. This was an inspection; no icon sources
or components were changed. The PR tree and its 500 changed-file records were
retrieved from GitHub. Flags were excluded from the application-icon comparison.

## SVG source differences

The PR head contains 277 non-flag SVG sources, including 276 in the generated
ui/brands/community lanes and one raw custom asset. Eleven exact source paths
are absent from PARA. Their significance differs:

| Upstream source | Current PARA evidence | Assessment |
| --- | --- | --- |
| `ui/BookmarkDelete_Stroke2_Corner0_Rounded_Large.svg` | `assets/icons/ui/BookmarkDeleteLarge_Stroke2_Corner0_Rounded.svg` has a 24×24 viewBox; upstream has a 64×64 viewBox | Missing upstream 64×64 variant; an older bookmark-delete drawing exists locally |
| `ui/Home_Stroke2_Corner0_Rounded.svg` | `src/components/icons/Home.tsx` exports the same name and matching optimized path; the drawing also exists as `HomeOpen_Stoke2_Corner0_Rounded` | Artwork already available; missing canonical source SVG |
| `ui/Home_Filled_Corner0_Rounded.svg` | `src/components/icons/Home.tsx` exports the same name and matching optimized path | Artwork already available; missing canonical source SVG |
| `ui/SquareBehindSquare_Stroke2_Corner2_Rounded.svg` | The optimized path matches `SquareBehindSquare_Stroke2_Corner0_Rounded` in `src/components/icons/Square.tsx`; its source is under the Corner0 name | Naming difference, not missing artwork |
| `custom/custom_logo_japan.svg` | No matching source filename or local source-code reference found | Missing raw artwork; excluded from component codegen upstream |
| `ui/LikeRepost_Stroke2_Corner2_Rounded.svg` | Absent | Keep excluded under PARA's no-reposts decision |
| `ui/RepostRepost_Stroke2_Corner2_Rounded.svg` | Absent | Keep excluded |
| `ui/RepostStrike_Stroke2_Corner0_Rounded.svg` | Absent | Keep excluded |
| `ui/Repost_Stroke2_Corner0_Rounded.svg` | Absent | Keep excluded |
| `ui/Repost_Stroke2_Corner2_Rounded.svg` | Absent | Keep excluded |
| `ui/Repost_Stroke2_Corner3_Rounded.svg` | Absent | Keep excluded |

The PR is principally a source/codegen migration. An SVG marked "added" in its
diff can have existed previously as handwritten TypeScript; that status alone
does not establish new artwork. For example, both missing Home source files
already have matching local component paths.

## Current generated-output issue

The inspection also checked the exported variable names across the current icon
TypeScript modules. Eighteen upstream generated export names are absent; six
are the deliberately excluded repost icons. The remaining twelve are:

```text
ArrowTriangleBottom_Stroke2_Corner1_Rounded
BookmarkDelete_Stroke2_Corner0_Rounded_Large
Bookmark_Filled_Corner0_Rounded
Bookmark_Stroke2_Corner0_Rounded
Bot_Filled_Corner0_Rounded
Bot_Stroke2_Corner0_Rounded
Bubble_Filled_Stroke2_Corner2_Rounded
CircleAndSquare_Stroke1_Corner0_Rounded_Filled
EnvelopeOpen_Stroke2_Corner0_Rounded
HomeOpen_Stroke2_Corner0_Rounded
Reply_Stroke2_Corner0_Rounded
SquareBehindSquare_Stroke2_Corner2_Rounded
```

Ten of those twelve have exact canonical SVG source filenames in PARA. The other
two are the bookmark-delete size variant and stacked-squares naming difference
described above. Thus this is largely a generated-export synchronization issue,
not ten additional missing SVG assets. Several older handwritten components
still expose prior names such as `Bookmark`, `Bot_Filled`, `Reply`, and
`Envelope_Open_Stroke2_Corner0_Rounded`.

Current check:

```text
node scripts/icons/generate.mts --check
src/components/icons/Accessibility.tsx: generated output would overwrite a handwritten module; rename the SVG family or move the handwritten code
```

The guard stops before a full freshness check. Current callers already request
canonical exports, for example `Bookmark_Stroke2_Corner0_Rounded` from
`#/components/icons/Bookmark`, while the current handwritten `Bookmark.tsx`
exports the older names. These files need reconciliation before claiming that
the current application icon migration is healthy. Do not bypass the guard or
overwrite handwritten PARA components indiscriminately.

## Recommended follow-up

1. Reconcile handwritten and generated modules, preserving PARA's custom icons
   and wordmark; regenerate, check exports and run the focused tests.
2. Add the two canonical Home source SVGs to put the existing artwork under
   codegen, keeping their existing visuals.
3. Consider importing the upstream 64×64 bookmark-delete variant for large
   empty states. Preserve the older variant until its callers are reviewed.
4. Reconcile the stacked-squares name with its actual existing artwork.
5. Leave repost assets excluded. The unreferenced raw Japan logo is optional.
