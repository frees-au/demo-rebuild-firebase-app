# Instructions for Claude/Codex/Other AI

## 1. Identify the actors

In this document "You" are the AI.

If the developer/operator is Simon (Si) Hobbs, then Si will run
run his own emulators and do his own commits and pushes to Github.

If the operator is Danial (Dan) Hobbs, then Dan will only prompt. You
will run all local scripts, emulators and git commands.

## 2. Local context

Refer to .agents/ for more information and skills.

This AGENTS.md might live one directory below a workspace in which there
is another AGENTS.md that points to additional resources.

There might be a ../original-codebase or similar directory which contains
an old prototype. This can be scanned for user requirements but it should
never be used to justify new tooling unless explicitly asked.

## 3. Branching

Github origin is not setup to do automated deployments. So it is always safe to push
to any branch on github, with the following caveats:
  * Never force push
  * To avoid conflicts, `git pull` and further `git pull --rebase` prior to beginning work
  * You can "save" work by branching and pushing backup branches
  * Never add or setup github actions
  * Prefer to work on `main` unless asked to do differently. 

## 4. Initiating a new chat/session (Dan only)

Starting a new conversation or piece of work for Dan requires:
  * making sure the local git workspace is clean
  * starting or confirming emulators (`pnpm emulate`)
  * show the output of `pnpm status`

## 5. Testing with Playwright

All new features should have playwright tests that (if needed) use seed data as 
the basis for the testing. Run `pnpm seed-e2d` with all the emulators currently
running, and `pnpm full-e2d` if they are off.

## 6. Completing a session (Dan only)

When summarising the work completed:
  * Show the output of `pnpm status`.
  * Watch to indications that Dan wants to end the sessions whereby you will shutdown emulators.
  * Make sure the work is pushed to github, and give Dan a link to the appropriate branch or PR.

## 7. Architecture

This application is a Svelte application built on Firebase services: Auth, 
Storage, Firestore. The approach to styling can be seen on the /style-guide/
route. If there is need for a new component or technology, this becomes
a decision gate that only Simon can resolve.

In the Firestore content model, new collections can be created. Eg. "I want
the user to choose different branding" would require a appConfigThemes collection.

When modifying collections, or even working on features, ensure that 
representative data can be seen in the seed files.
