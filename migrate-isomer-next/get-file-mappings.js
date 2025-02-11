const fs = require("fs");

const main = async () => {
  // Step 1: Read the fileMappings.txt file
  const fileMappings = await fs.promises.readFile("fileMappings.txt", "utf8");

  // Step 2: Perform a text replacement of "}" to "}," to make it a valid JSON
  // then add a "[" at the start and "]" at the end
  const fileMappingsJson =
    "[" +
    fileMappings.replaceAll("}", "},").replaceAll("'", '"').slice(0, -2) +
    "]";

  // Step 3: Parse the JSON
  const fileMappingsParsed = JSON.parse(fileMappingsJson);

  // Step 4: Combine all into a single object
  const fileMappingsObject = fileMappingsParsed.reduce((acc, curr) => {
    return { ...acc, ...curr };
  }, {});

  // Step 5: Write the object into a CSV file
  await fs.promises.writeFile(
    "file-mappings.csv",
    "oldPath,newPath\n" +
      Object.entries(fileMappingsObject)
        .map(([key, value]) => `${key},${value}`)
        .join("\n")
  );
};

main();
