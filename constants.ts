import { AppMode, SongData } from './types';

const PARIS_LRC = `
[00:00.00] (Music Intro)
[00:10.50] All I know is
[00:12.80] We could go anywhere we could do
[00:15.50] Anything girl whatever the mood we're in
[00:20.80] All I know is
[00:23.20] Getting lost late at night under stars
[00:25.80] Finding love standing right where we are
[00:30.50] Your lips
[00:32.50] They pull me in the moment
[00:35.80] You and I alone and
[00:38.20] People may be watching
[00:39.80] I don't mind
[00:41.00] 'Cause anywhere with you feels right
[00:46.00] Anywhere with you feels like
[00:51.50] Paris in the rain
[00:56.80] Paris in the rain
[01:01.80] We don't need a fancy town
[01:04.20] Or bottles that we can't pronounce
[01:07.00] 'Cause anywhere babe
[01:09.50] Is like Paris in the rain
[01:12.50] When I'm with you
[01:17.50] When I'm with you
[01:22.50] Paris in the rain
[01:27.80] Paris in the rain
[01:33.00] (Instrumental)
`;

export const SONGS: Record<AppMode, SongData> = {
  [AppMode.JELLYFISH]: {
    title: "PARIS IN THE RAIN",
    artist: "LAUV",
    coverColor: "cyan",
    lrcString: PARIS_LRC,
  },
  [AppMode.SNOW]: {
    title: "PARIS IN THE RAIN",
    artist: "LAUV",
    coverColor: "white",
    lrcString: PARIS_LRC,
  },
  [AppMode.RAIN]: {
    title: "PARIS IN THE RAIN",
    artist: "LAUV",
    coverColor: "blue",
    lrcString: PARIS_LRC,
  },
};

export const TABS = [
  { id: AppMode.JELLYFISH, label: '01 // JELLY' },
  { id: AppMode.SNOW, label: '02 // SNOW' },
  { id: AppMode.RAIN, label: '03 // RAIN' },
];