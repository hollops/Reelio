// Seed data for the mock API: demo users (including 8 fictional channels) and 20 videos.
// All channel names, people and video titles are fictional.
import type { Category, User, Video } from './types'

// Mock only: a real backend stores bcrypt hashes, never plain passwords.
export interface MockUser extends User {
  password: string
}

// No avatar photos: every seed account shows initials (see <Avatar>). Photos arrive when
// users upload their own — and no real people's faces get attached to fictional channels.
const user = (id: string, name: string, email: string, role: User['role'] = 'user'): MockUser => ({
  id,
  name,
  email,
  password: role === 'admin' ? 'admin123' : 'password1',
  role,
  createdAt: '2026-08-01T09:00:00.000Z',
})

export const seedUsers: MockUser[] = [
  user('u_admin', 'Grader Admin', 'admin@streammini.dev', 'admin'),
  user('u_ada', 'Ada Viewer', 'ada@streammini.dev'),
  // Channels (uploaders)
  user('u_lagosbeats', 'Lagos Beats', 'beats@streammini.dev'),
  user('u_pixelplay', 'PixelPlay NG', 'pixel@streammini.dev'),
  user('u_learntobi', 'Learn With Tobi', 'tobi@streammini.dev'),
  user('u_kitchen', 'Kitchen Chronicles', 'kitchen@streammini.dev'),
  user('u_wanderlust', 'Wanderlust Naija', 'wander@streammini.dev'),
  user('u_techplug', 'Tech Plug', 'techplug@streammini.dev'),
  user('u_laughlagos', 'Laugh Out Lagos', 'laugh@streammini.dev'),
  user('u_sideline', 'Sideline Sports', 'sideline@streammini.dev'),
]

// --- Media -----------------------------------------------------------------------
// All video sources live here, so swapping hosts later is a one-place change.
// (The old Google sample bucket used by many tutorials now returns 403 Forbidden.)
// Durations are the files' real lengths, so the time shown on a thumbnail matches playback.

const MEDIA = {
  // Full-length open-source films (Blender Foundation, CC BY) hosted on archive.org.
  dream: { url: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4', seconds: 653 },
  sintel: { url: 'https://archive.org/download/Sintel/sintel-2048-stereo_512kb.mp4', seconds: 888 },
  // 10-second clips: quick to load, and handy for testing "Up next" autoplay.
  bunny: {
    url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    seconds: 10,
  },
  sintelClip: {
    url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
    seconds: 10,
  },
  jellyfish: {
    url: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
    seconds: 10,
  },
}

// 16:9 placeholder thumbnails; the same seed always returns the same picture.
const thumbnail = (seed: string) => `https://picsum.photos/seed/${seed}/1280/720`

/** Stand-ins for uploads whose files are gone (mock uploads only live until a page refresh). */
export const FALLBACK_MEDIA = {
  video: { videoUrl: MEDIA.bunny.url, duration: MEDIA.bunny.seconds },
  thumbnailUrl: thumbnail('upload-placeholder'),
}

const uploaderOf = (userId: string) => {
  const u = seedUsers.find((x) => x.id === userId)!
  return { id: u.id, name: u.name, avatarUrl: u.avatarUrl }
}

interface VideoSpec {
  id: string
  title: string
  description: string
  category: Category
  uploaderId: string
  media: keyof typeof MEDIA
  views: number
  likes: number
  createdAt: string
}

const video = ({ id, uploaderId, media, ...spec }: VideoSpec): Video => ({
  ...spec,
  id,
  thumbnailUrl: thumbnail(id),
  videoUrl: MEDIA[media].url,
  duration: MEDIA[media].seconds,
  uploader: uploaderOf(uploaderId),
})

export const seedVideos: Video[] = [
  // Music
  video({
    id: 'v_afrobeats-live',
    title: 'Afrobeats Live Session — Full Rooftop Set in Lekki',
    description:
      'An hour-long rooftop set recorded at sunset, with a live band and three surprise guests.',
    category: 'Music',
    uploaderId: 'u_lagosbeats',
    media: 'dream',
    views: 184_220,
    likes: 9_310,
    createdAt: '2026-09-24T18:00:00.000Z',
  }),
  video({
    id: 'v_talking-drum',
    title: 'How the Talking Drum Actually Talks',
    description: 'A master drummer shows how pitch and rhythm copy the tones of Yoruba speech.',
    category: 'Music',
    uploaderId: 'u_lagosbeats',
    media: 'bunny',
    views: 42_880,
    likes: 3_120,
    createdAt: '2026-09-02T12:00:00.000Z',
  }),
  video({
    id: 'v_studio-beat',
    title: 'Making a Beat From Scratch in 10 Minutes',
    description: 'From an empty project to a finished loop — every step on screen.',
    category: 'Music',
    uploaderId: 'u_lagosbeats',
    media: 'sintelClip',
    views: 12_406,
    likes: 1_044,
    createdAt: '2026-08-15T12:00:00.000Z',
  }),
  // Gaming
  video({
    id: 'v_speedrun',
    title: 'World-Record Speedrun Attempt (Live Commentary)',
    description: 'Three hours of practice for this one run. Does the final jump land?',
    category: 'Gaming',
    uploaderId: 'u_pixelplay',
    media: 'sintel',
    views: 311_904,
    likes: 20_481,
    createdAt: '2026-09-25T20:00:00.000Z',
  }),
  video({
    id: 'v_indie-games',
    title: '5 Nigerian Indie Games You Should Play This Year',
    description: 'Hidden gems from small studios in Lagos, Abuja and Enugu.',
    category: 'Gaming',
    uploaderId: 'u_pixelplay',
    media: 'jellyfish',
    views: 27_650,
    likes: 2_210,
    createdAt: '2026-09-10T12:00:00.000Z',
  }),
  // Education
  video({
    id: 'v_react-in-10',
    title: 'React Explained in 10 Minutes (No Jargon)',
    description:
      'Components, props and state explained with everyday examples. Perfect for beginners.',
    category: 'Education',
    uploaderId: 'u_learntobi',
    media: 'dream',
    views: 96_015,
    likes: 7_802,
    createdAt: '2026-09-20T09:00:00.000Z',
  }),
  video({
    id: 'v_budgeting',
    title: 'Budgeting on a Student Allowance — A Simple System',
    description: 'The 50/30/20 rule, adjusted for real student life.',
    category: 'Education',
    uploaderId: 'u_learntobi',
    media: 'bunny',
    views: 58_332,
    likes: 4_419,
    createdAt: '2026-08-28T09:00:00.000Z',
  }),
  video({
    id: 'v_ada-first-upload',
    title: 'My First Upload — Campus Tour in One Minute',
    description: 'Testing the upload feature with a quick walk around campus.',
    category: 'Education',
    uploaderId: 'u_ada',
    media: 'sintelClip',
    views: 87,
    likes: 9,
    createdAt: '2026-09-26T15:00:00.000Z',
  }),
  // Comedy
  video({
    id: 'v_danfo-skit',
    title: 'When the Danfo Conductor Has No Change',
    description: 'Every Lagos commuter has lived this. Part 3 of the series.',
    category: 'Comedy',
    uploaderId: 'u_laughlagos',
    media: 'jellyfish',
    views: 402_117,
    likes: 31_560,
    createdAt: '2026-09-23T17:00:00.000Z',
  }),
  video({
    id: 'v_nepa-skit',
    title: 'NEPA Brought Light for 5 Minutes',
    description: 'A household sprints to charge everything before the power goes again.',
    category: 'Comedy',
    uploaderId: 'u_laughlagos',
    media: 'bunny',
    views: 265_880,
    likes: 19_004,
    createdAt: '2026-09-05T17:00:00.000Z',
  }),
  video({
    id: 'v_group-project',
    title: 'Every Group Project Ever',
    description: 'The one who does everything, the one who vanishes, and the one who presents.',
    category: 'Comedy',
    uploaderId: 'u_laughlagos',
    media: 'sintelClip',
    views: 133_940,
    likes: 11_280,
    createdAt: '2026-08-19T17:00:00.000Z',
  }),
  // Tech
  video({
    id: 'v_phone-review',
    title: 'Budget Phone Review: Is ₦150k Enough in 2026?',
    description: 'Camera, battery and gaming tests on this year’s most popular budget phone.',
    category: 'Tech',
    uploaderId: 'u_techplug',
    media: 'sintel',
    views: 77_503,
    likes: 5_190,
    createdAt: '2026-09-21T11:00:00.000Z',
  }),
  video({
    id: 'v_laptop-battery',
    title: '7 Settings That Double Your Laptop Battery Life',
    description: 'Free changes that make a real difference — tested over a week.',
    category: 'Tech',
    uploaderId: 'u_techplug',
    media: 'jellyfish',
    views: 39_210,
    likes: 2_870,
    createdAt: '2026-09-01T11:00:00.000Z',
  }),
  // Sports
  video({
    id: 'v_derby-highlights',
    title: 'Derby Day Highlights — All Goals and Big Moments',
    description: 'A seven-goal thriller decided in stoppage time.',
    category: 'Sports',
    uploaderId: 'u_sideline',
    media: 'dream',
    views: 520_774,
    likes: 28_910,
    createdAt: '2026-09-22T21:00:00.000Z',
  }),
  video({
    id: 'v_training-drills',
    title: 'Pro Footballer’s Daily Training Drills',
    description: 'Follow along with the same warm-up and ball drills used by academy players.',
    category: 'Sports',
    uploaderId: 'u_sideline',
    media: 'bunny',
    views: 64_118,
    likes: 3_904,
    createdAt: '2026-09-08T08:00:00.000Z',
  }),
  // Food
  video({
    id: 'v_party-jollof',
    title: 'Smoky Party Jollof — The Secret Is the Bottom Pot',
    description: 'How to get that smoky party flavour at home, without burning the rice.',
    category: 'Food',
    uploaderId: 'u_kitchen',
    media: 'sintel',
    views: 248_605,
    likes: 17_733,
    createdAt: '2026-09-18T13:00:00.000Z',
  }),
  video({
    id: 'v_suya-spice',
    title: 'Street-Style Suya Spice (Yaji) Recipe',
    description: 'Toasted groundnut, ginger and chilli — ground fresh in five minutes.',
    category: 'Food',
    uploaderId: 'u_kitchen',
    media: 'jellyfish',
    views: 91_027,
    likes: 6_340,
    createdAt: '2026-08-30T13:00:00.000Z',
  }),
  // Travel
  video({
    id: 'v_obudu',
    title: 'Obudu Mountain Resort — Cable Car Above the Clouds',
    description: 'A weekend in Cross River: the cable car, the canopy walk and the cold nights.',
    category: 'Travel',
    uploaderId: 'u_wanderlust',
    media: 'dream',
    views: 70_246,
    likes: 4_808,
    createdAt: '2026-09-15T10:00:00.000Z',
  }),
  video({
    id: 'v_zuma-rock',
    title: 'Driving Past Zuma Rock at Sunrise',
    description: 'Ten quiet seconds with one of the most famous rocks in the country.',
    category: 'Travel',
    uploaderId: 'u_wanderlust',
    media: 'sintelClip',
    views: 15_390,
    likes: 1_212,
    createdAt: '2026-09-03T06:00:00.000Z',
  }),
  video({
    id: 'v_calabar-carnival',
    title: 'Calabar Carnival: A Day on the Parade Route',
    description: 'Costumes, bands and five kilometres of dancing — shot from inside the parade.',
    category: 'Travel',
    uploaderId: 'u_wanderlust',
    media: 'sintel',
    views: 108_442,
    likes: 8_095,
    createdAt: '2026-08-22T10:00:00.000Z',
  }),
]
