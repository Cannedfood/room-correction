#!/bin/bash -e

# Stash changes
git stash
BRANCH=$(git branch | sed -n -e 's/^\* \(.*\)/\1/p')

# Build
npm run build

# Commit in release branch
git checkout release
cp -r dist/* .
git add .
git commit -m "Release via. branch '${BRANCH}'"

# Return to main branch
git checkout "${BRANCH}"
git stash apply