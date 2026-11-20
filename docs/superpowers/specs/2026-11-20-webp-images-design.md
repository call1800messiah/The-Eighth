# Serve images as WebP at their display size (#77)

## Intent

Pages load slowly because every image is served as the original upload, at
full size. Portraits are 500×500 even where they show as small avatars, and
most of them are PNG (the cropper's `image/jpg` setting is not a real MIME
type, so the canvas falls back to PNG). Scenes and maps are whatever was
uploaded. The goal is faster loads, for old and new images alike. The issue
asked for conversion on upload; it is reworded to "serve images as WebP at
their display size" and closed by this change.

## Goals

- Every image the app shows is fetched through Supabase's image
  transformation (imgproxy), resized to what it is displayed at and served as
  WebP to browsers that accept it.
- Existing images benefit without touching stored files or database rows.
- Converted images are cached, so each size is computed once, not per view.

## Non-goals

- Converting the stored files. Uploads and stored paths stay as they are.
- Fixing the cropper's `image/jpg` setting (separate, harmless once served
  through imgproxy).
- Audio files (also go through `getDownloadURL`, unchanged).

## Anti-goals

- A broken image anywhere. If transformation fails, the page must still show
  something; a rendering failure is worse than a slow image.
- Distorted or cropped pictures: only scale down, keep the aspect ratio,
  never enlarge.

## Constraints (as found)

- Production already runs imgproxy with `ENABLE_IMAGE_TRANSFORMATION: "true"`
  and `IMGPROXY_AUTO_WEBP=true` (`deploy/supabase/docker-compose.yml`,
  `deploy/supabase/.env`). AUTO_WEBP picks WebP from the request's `Accept`
  header, so Safari versions without WebP get the original format.
- Envoy routes all of `/storage/v1/` to storage-api, so
  `/storage/v1/render/image/public/...` already reaches it; the app's nginx
  proxies `/storage/v1/` to Envoy.
- `IMGPROXY_MAX_SRC_RESOLUTION: 16.8` (megapixels): larger sources fail to
  render.
- Local dev: `[storage.image_transformation]` is commented out in
  `supabase/config.toml`; it must be enabled to see this locally.
- Uploads get unique names, so a rendered URL never needs invalidating.
- The combat map draws its image at the stored `image_width`/`image_height`
  (`combat-map.component.ts:346`), so a resized source still lands on the
  same coordinates.

## Approaches

- **A. Convert the files.** WebP on upload in the browser, plus a one-off
  script converting existing files and rewriting their paths. Real WebP at
  rest, no per-request work; but a risky production data rewrite, no
  resizing, Safari would upload PNG.
- **B. Convert and resize on request (picked).** URLs go through the render
  endpoint at display size; imgproxy serves WebP where accepted. Covers old
  and new images at once, adds resizing, no data migration; costs CPU on the
  first request per size, hence a cache.
- **C. Both.** Once B is in, A only saves disk space.

Picked B: load time is the goal, and resizing is as large a win as format.

## Design

**Sizes.** `StorageService` gets
`getImageURL(path: string, size: ImageSize): string`, building the URL with
`getPublicUrl(path, { transform: { width, resize: 'contain', quality: 80 } })`.
Two named sizes, widths in image pixels (2× the CSS size for high-DPI):

| Size    | Width | Used for |
|---------|-------|----------|
| `thumb` | 400   | avatars in lists, combat, flow, achievements, story-beat bar; banners; the scene grid |
| `large` | 1600  | the portrait on the person page; the place image; targets of "open image" links |

The combat map uses the same endpoint at its stored `image_width`, i.e.
format conversion only, no resize.

**Models.** People, places and scenes carry both URLs: `image` stays the
`large` URL (so links and existing code keep working), and a new
`imageThumb` holds the `thumb` URL. `banner` becomes the `thumb` URL.
`AvatarComponent` shows `imageThumb`, or `image` when `[priority]` is set
(the person page). Scenes show `imageThumb` in the grid and link to `image`.

**Fallback.** An `<img>` whose rendered URL fails (imgproxy down, source over
16.8 MP) swaps once to the original public URL. This needs the original URL
too, so models carry `imageOriginal` (or the component derives it); the
builder picks the lighter of the two.

**Cache.** The app's nginx gets a `location /storage/v1/render/` with
`proxy_cache` (on-disk zone in the container, ~1 GB cap, 30 days valid for
200s), cache key including whether `Accept` contains `image/webp`, and
`Vary: Accept` on the response. It must `include` the security headers file
again if it adds headers (see CLAUDE.md). The cache may live in the
container's filesystem: losing it on redeploy only costs a re-render.

**Local dev.** Enable `[storage.image_transformation]` in
`supabase/config.toml`.

## Left to the builder

- Exact cache zone size and path; whether `proxy_cache_lock` is worth it.
- Whether the fallback lives in a small directive or in each component.
- Spec updates: `createMockStorageService()` needs `getImageURL`; services'
  specs assert the new fields.
- Verifying in the browser (DevTools network tab) that responses are
  `image/webp` and that a second load is a cache hit (`X-Cache-Status`).
