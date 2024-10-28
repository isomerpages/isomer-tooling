WITH valid_versions AS (
	SELECT DISTINCT
		"blobId"
	FROM
		"Version"
	WHERE
		id IN( SELECT DISTINCT
				"publishedVersionId" FROM "Resource"
			WHERE
				"publishedVersionId" IS NOT NULL
			UNION
			SELECT DISTINCT
				"draftBlobId" FROM "Resource"
			WHERE
				"draftBlobId" IS NOT NULL)
),
blobs_with_table_header AS (
	SELECT
		*
	FROM
		"Blob"
	WHERE
		jsonb_path_exists ("content",
			'$.** ? (@.type == "tableHeader" && @.content[*].type != "paragraph")')
),
blobs_with_empty_prose AS (
	SELECT
		*
	FROM
		"Blob"
	WHERE
		jsonb_path_exists ("content",
			'$.** ? (@.type == "prose" && @.content.type() == "array" && @.content.size() == 0)')
)

-- not great code but it works
SELECT
	*
FROM
	blobs_with_table_header
WHERE
	id IN(
		SELECT
			"blobId" FROM valid_versions)
UNION
SELECT
	*
FROM
	blobs_with_empty_prose
WHERE
	id IN(
		SELECT
			"blobId" FROM valid_versions)
ORDER BY id ASC;