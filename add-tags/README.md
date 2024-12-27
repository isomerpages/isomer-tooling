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

# Seeding collections

## Prerequisites

- first, create a `data.csv` inside this folder
- next, download the repository into the local folder here (by convention this is `repos`)
- next, update the `collectionIndex` variable to have the correct `title` and `subtitle`
- take note that the title, filename and tags are all custom at the moment and you would have to update them to the one you want. this is done in the first section of the `forEach` loop
- double check that csa-corp-next/schema/our-programmes/certification-and-labelling-schemes/clsthe date format is correct also (`CLS_DATE_FORMAT`)
- next, update the `generateCollection` so that the second argument will provide the path to the collection and the third is the path to the folder
  - the path to the collection should be the path to the folder that houses the collection pages
  - the path to the folder should be the path to the folder that the collection items are referencing
- lastly, update the `ClsProduct` interface to have the correct properties and update it

## Running the script

- after you've done the steps listed in pre-requisites, run `npx tsx add-tags.ts`
- afterwards, cd into `/repos/<repo>` and run `git add` , `git commit` and `git push`
