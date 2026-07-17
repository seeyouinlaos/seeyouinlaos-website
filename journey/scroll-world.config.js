/* See You In Laos — The Journey: scroll-world engine configuration (six scenes).
   Deployed under a repository subpath, so every asset URL is RELATIVE to this page
   (journey/). Canonical scene data lives in the production workspace
   (scroll.website/src/data/scenes.json); keep the two in sync.

   MEDIA REPLACEMENT CONTRACT: every media path below is wired ACTIVE and currently
   points at a neutral placeholder file with the FINAL production filename. To ship
   real Higgsfield assets, overwrite the files in journey/assets/ with the same
   names — no source edit is ever needed. */

const SEE_YOU_IN_LAOS = {
  brand: { name: 'see you in laos.', href: '#top' },
  hint: 'scroll to begin the journey',
  diveScroll: 1.3,
  connScroll: 0.9,
  crossfade: 0.08, // architecture A: legs chain directly, small seam dissolve

  sections: [
    {
      id: 'bangkok', label: 'The Departure',
      still: 'assets/images/optimized/scene-01-bangkok-still.webp',
      poster: 'assets/video/posters/scene-01-bangkok-poster.webp',
      clip: 'assets/video/optimized/scene-01-bangkok-leg.mp4',
      clipMobile: 'assets/video/mobile/scene-01-bangkok-leg-m.mp4',
      posterMobile: 'assets/video/posters/scene-01-bangkok-poster-m.webp',
      accent: '#C8A24B',
      scroll: 1.3,
      eyebrow: 'The departure',
      title: 'It begins in Bangkok.',
      body: 'One last golden evening on the Chao Phraya at ICONSIAM, then a short flight north into the mountains.',
      tags: ['ICONSIAM', 'BKK to LPQ'],
    },
    {
      id: 'arrival', label: 'The Arrival',
      still: 'assets/images/optimized/scene-02-arrival-still.webp',
      poster: 'assets/video/posters/scene-02-arrival-poster.webp',
      clip: 'assets/video/optimized/scene-02-arrival-leg.mp4',
      clipMobile: 'assets/video/mobile/scene-02-arrival-leg-m.mp4',
      posterMobile: 'assets/video/posters/scene-02-arrival-poster-m.webp',
      accent: '#4A6B4F',
      scroll: 1.3,
      eyebrow: 'Sabaidee, welcome',
      title: 'See you in Luang Prabang.',
      body: 'Touch down, meet the van, and roll through the old town to the doors of AVANI+ Luang Prabang.',
      tags: ['UNESCO old town', 'AVANI+ Luang Prabang'],
    },
    {
      id: 'mekong', label: 'The Mekong',
      still: 'assets/images/optimized/scene-03-mekong-still.webp',
      poster: 'assets/video/posters/scene-03-mekong-poster.webp',
      clip: 'assets/video/optimized/scene-03-mekong-leg.mp4',
      clipMobile: 'assets/video/mobile/scene-03-mekong-leg-m.mp4',
      posterMobile: 'assets/video/posters/scene-03-mekong-poster-m.webp',
      accent: '#2F5D62',
      scroll: 1.4,
      eyebrow: 'The welcome',
      title: 'Sunset on the Mekong.',
      body: 'From the pier we drift out for welcome drinks and dinner on the water, as the sun folds into the hills.',
      tags: ['Boat cruise', 'Welcome dinner'],
    },
    {
      id: 'alms', label: 'Morning Ritual',
      still: 'assets/images/optimized/scene-04-alms-still.webp',
      poster: 'assets/video/posters/scene-04-alms-poster.webp',
      clip: 'assets/video/optimized/scene-04-alms-leg.mp4',
      clipMobile: 'assets/video/mobile/scene-04-alms-leg-m.mp4',
      posterMobile: 'assets/video/posters/scene-04-alms-poster-m.webp',
      accent: '#D97B29',
      scroll: 1.4, linger: 0.35,
      eyebrow: 'The morning ritual',
      title: 'Alms at first light.',
      body: 'Before the day begins, we kneel on the old-town street as the monks pass in saffron.',
      tags: ['Tak bat', 'First light'],
    },
    {
      id: 'ceremony', label: 'The Ceremony',
      still: 'assets/images/optimized/scene-05-ceremony-still.webp',
      poster: 'assets/video/posters/scene-05-ceremony-poster.webp',
      clip: 'assets/video/optimized/scene-05-ceremony-leg.mp4',
      clipMobile: 'assets/video/mobile/scene-05-ceremony-leg-m.mp4',
      posterMobile: 'assets/video/posters/scene-05-ceremony-poster-m.webp',
      accent: '#C8A24B',
      scroll: 1.7, linger: 0.45,
      eyebrow: 'The wedding day',
      title: 'Two families, one promise.',
      body: 'The day gathers at the poolside in golden hour, beneath the grey Lao gables.',
      tags: ['AVANI+ Poolside', 'Golden hour'],
    },
    {
      id: 'manda', label: 'The Celebration',
      still: 'assets/images/optimized/scene-06-manda-still.webp',
      poster: 'assets/video/posters/scene-06-manda-poster.webp',
      clip: 'assets/video/optimized/scene-06-manda-leg.mp4',
      clipMobile: 'assets/video/mobile/scene-06-manda-leg-m.mp4',
      posterMobile: 'assets/video/posters/scene-06-manda-poster-m.webp',
      accent: '#4A6B4F',
      scroll: 1.8, linger: 0.5,
      eyebrow: 'The celebration',
      title: 'Dinner among the lilies.',
      body: 'As dusk turns the ponds to lanternlight, we sit down to a Lao feast, cut the cake, and let the evening end quietly among the lilies.',
      tags: ['UNESCO lily ponds', 'Lao feast'],
    },
  ],

  // Architecture A: the legs ARE the journey — no connector clips.
  connectors: [],
  connectorsMobile: [],
};
