# introduction

this script is used for creating tags for github repositories

# how to use

1. first, we need to download the repository into the local folder here (by convention this is `repos`)
2. next, decide if you need to seed the tags **only** or if you also need to create the collection items together with the folder items
3. if you need to seed the tags only, please refer to the section for `Seeding tags` otherwise, refer to the section for `Seeding collections`

# Seeding tags

## Prerequisites

- If you are here, only need the tags to be seeded. This means that the pages are already there on the github repository itself
- to double check this, go to the github repository, and then to the collection you want to have tags for
- make sure that the pages you expect to have tags are already there
- create a `data.csv` inside this folder
- next, `git clone` the repository into the `/repos` folder
- next, ensure that the data schema has `path,tag` header
  - the `path` should be the **full** local link to the schema
  - for example, if this is in `mddi/news/article` (where `mddi` is the repo itself), the `path` should be `/news/article`
  - the `tag` should be a **single** tag only
- update the `normalizeTag` function to the tag output that you want
- update `main` -> `records.forEach` loop so that the `category` is set properly

## Running the script

- after you've done the steps listed in pre-requisites, run `npx tsx add-tags.ts`
- afterwards, cd into `/repos/<repo>` and run `git add` , `git commit` and `git push`
