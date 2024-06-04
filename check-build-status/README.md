# Instructions

Pre-requisites:

- AWS SDK setup
- Run `npm i`

1. Uncomment the `getAllApps` functions and comment the below functions.

```
// Main function to execute the script
const main = async () => {
  // Uncomment the following line to initially fetch and save the apps to a JSON file
  await getAllApps();

  // const apps = readAppsFromFile();
  // await checkBuildStatuses(apps);
};
```

2. Run the app by using `node index.js`. This will save all the Amplify apps into `amplify_apps.json`

3. Comment the `getAllApps` function and uncomment the functions below.

```
// Main function to execute the script
const main = async () => {
  // Uncomment the following line to initially fetch and save the apps to a JSON file
  // await getAllApps();

  const apps = readAppsFromFile();
  await checkBuildStatuses(apps);
};
```

4. Re-run the app by `node index.js`. The apps with failed builds should start populating inside the `failed.csv` file.
