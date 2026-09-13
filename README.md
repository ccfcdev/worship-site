# Worship Connect — subdomain site

The praise and worship team of Christ Connect Family Church Zambia. Intended for `worship.<church-domain>`.

    node build.js                 # index.html + videos.html + join.html
    python3 -m http.server 8527   # or the registered preview `worship-site`

Black and gold: near-black `#0A0A0B` ground, metallic gold `#E7B84A` (the team's gold skirts) as the single accent, warm off-white type. Fork of the Koinonia site's CSS/JS with the palette swapped and a gradient gold wordmark.
Pages: home (hero loop, latest sets, songs, team photos, roles), videos (all sets with tabs, lightbox), join (form that opens WhatsApp with the details filled).
Add new videos to `VIDEOS` in `build.js`; songs to `SONGS`. The Media team can also post to the Worship feed from the main site's dashboard once Supabase is live.
Photos: real Sunday photos of the team (`assets/img/p-*`) from the church's Drive.
