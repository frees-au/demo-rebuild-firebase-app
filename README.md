# A Firebase app

This app was mostly built during this stream:
https://www.youtube.com/watch?v=Mi8MZxA2d9c&list=PLGo2CM33WszI&pp=0gcJCbwFa94AFGB0


## License

Copyright (C) 2026 Simon Hobbs

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; version 2 of the License.

## Disclaimer

This project is provided for training and educational purposes only. It is
supplied “as is” without warranties of any kind, and should not be relied 
upon for production, commercial, safety-critical, or other real-world use. 
To the fullest extent permitted by law, the authors and contributors accept 
no liability for any loss, damage, or other consequences arising from its 
use or misuse.

## Do you want to set it up yourself?

The thing is that this not really designed to be a DIY template so there
will be steps you need to troubleshoot. Roughly it is:

1. Install the Firebase CLI.
2. Search for all the UPDATE_ME in the code.
3. Try building/running locally (see general instructions).
4. Create a Firebase project in Cloud
5. It will need Storage, Firestore and Auth
6. Jimmy around with it until it works. 

--- ### Below here is your general README ### ---

## Dev

Start the local:
* pnpm install
* cp .env.local.example .env
* pnpm run dev 

Open local development at `http://localhost:5174`.

The app is a Svelte/Vite single-page app. Firebase Hosting serves `dist` and
rewrites app routes such as `/login/`, `/my-shifts/`, `/style-guide/`,
`/reports/`, and `/settings/` to `index.html`.

For local email/password auth and profile data, run the Firebase emulators
before starting the app:

* `pnpm run emulators`
* In another terminal: `pnpm run dev`

The local dev command reads `seeds/userProfiles/*.json`, where each filename
must match the profile `employeeCode` label, creates or refreshes the matching
local Auth emulator users from the seed `email`, and writes `userProfiles/{uid}`
documents in the Firestore emulator. Portrait seed filenames stay as employee
IDs on disk, but import writes them to `userPortraits/{uid}.{extension}`. Event
and document seeds may still refer to the employee ID label and are remapped to
the generated local UID during import. The seed users use their email address as
their password unless a seed provides a `password`.

Run end-to-end browser tests with:

* `pnpm run full-e2e`

The test command builds the app, starts the local Firebase emulators, seeds the
local emulator data, runs Playwright against the Hosting emulator, then shuts the
emulators down.

If the emulators are already up, you can re-seed and run tests.

* `pnpm run seed-e2e`

And then you can run `pnpm exec playwright show-report` to review logs and see video.

## Account roles

Firebase Auth custom claims hold application access in the single `role` claim:

* `role: "admin"` can view administration pages, edit any user profile, and
  grant or remove the manager role.
* `role: "manager"` can view administration pages and the employee directory,
  but cannot change roles.

## Deploy

Run `firebase deploy`.
