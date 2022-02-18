#!/usr/bin/env python3
# .ogg preview generator for use when app and songs are on two different machines

import argparse
import requests
import os.path
from ffmpy import FFmpeg


parser = argparse.ArgumentParser(description='Generate song previews.')
parser.add_argument('site', help='Instance URL, eg. https://taiko.bui.pm')
parser.add_argument('song_dir', help='Path to songs directory, eg. /srv/taiko/public/taiko/songs')
parser.add_argument('--overwrite', action='store_true', help='Overwrite existing previews')
args = parser.parse_args()


if __name__ == '__main__':
    songs = requests.get('{}/api/songs'.format(args.site)).json()
    for i, song in enumerate(songs):
        print('{}/{} {} (id: {})'.format(i + 1, len(songs), song['title'], song['id']))

        song_path = '{}/{}/main.{}'.format(args.song_dir, song['id'], song['music_type'] if 'music_type' in song else 'mp3')
        prev_path = '{}/{}/preview.ogg'.format(args.song_dir, song['id'])

        if os.path.isfile(song_path):
            if not os.path.isfile(prev_path) or args.overwrite:
                if not song['preview'] or song['preview'] <= 0:
                    print('Skipping due to no preview')
                    continue

                print('Making preview.ogg')
                ff = FFmpeg(inputs={song_path: '-ss %s' % song['preview']},
                            outputs={prev_path: '-codec:a libvorbis -b:a 64k -ar 32000 -y -loglevel panic'})
                ff.run()
            else:
                print('Preview already exists')
        else:
            print('song file not found')
